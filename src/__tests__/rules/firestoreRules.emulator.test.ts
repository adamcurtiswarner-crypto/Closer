/**
 * Security rules tests (Firestore + Storage) — EMULATOR-BACKED.
 *
 * These are intentionally EXCLUDED from the default `npm test` run (see
 * testPathIgnorePatterns in jest.config.js) because they need the Firebase
 * emulators. Run them with:
 *
 *   npm run test:rules
 *
 * which wraps `jest -c jest.rules.config.js` in `firebase emulators:exec
 * --only firestore,storage` so the emulators start, the suite runs against
 * them, and they shut down afterwards. CI can call the same script.
 *
 * What is covered (the SEV-0 trust cluster):
 * - prompt_responses / prompt_completions: member reads allowed, stranger
 *   reads denied.
 * - prompt_completions couch flag (isCouchFlagUpdate): members can flag,
 *   strangers/ex-members cannot, no field smuggling, and `discussed` may
 *   only be ADDED as an empty map when absent — never overwritten.
 * - Deleted-couple members lose access to couple-scoped data (breakup
 *   model: isCoupleMember requires status == 'active').
 * - couple_invites: listing pending invites is denied (enumeration fix);
 *   the inviter's own status query still works; a stranger can neither read
 *   nor "accept" (update) an invite — acceptance is the acceptInvite
 *   callable's job.
 * - couples: the old "non-member joins a pending couple" update branch is
 *   gone; members cannot change member_ids from the client.
 * - Storage: couple paths require the coupleId custom claim (mirrored here
 *   via authenticatedContext token options); avatars stay authed-read /
 *   owner-write.
 */
import { readFileSync } from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
// Modular Firestore functions accept the compat instances the test contexts
// return (official rules-unit-testing quickstart pattern) — used for writes
// that need the serverTimestamp() sentinel.
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'stoke-rules-test';
const APP_ROOT = path.resolve(__dirname, '../../..');

const COUPLE_ID = 'couple-1';
const DELETED_COUPLE_ID = 'couple-deleted';
const PENDING_COUPLE_ID = 'couple-pending';
const MEMBER_A = 'user-a';
const MEMBER_B = 'user-b';
const STRANGER = 'user-stranger';
const INVITER = 'user-inviter';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.join(APP_ROOT, 'firestore.rules'), 'utf8'),
    },
    storage: {
      rules: readFileSync(path.join(APP_ROOT, 'storage.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed with rules disabled (Cloud Functions / Admin SDK writes).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await db.doc(`couples/${COUPLE_ID}`).set({
      member_ids: [MEMBER_A, MEMBER_B],
      status: 'active',
    });
    await db.doc(`couples/${DELETED_COUPLE_ID}`).set({
      member_ids: [MEMBER_A, MEMBER_B],
      status: 'deleted',
    });
    await db.doc(`couples/${PENDING_COUPLE_ID}`).set({
      member_ids: [INVITER],
      status: 'pending',
    });

    await db.doc('prompt_responses/resp-active').set({
      couple_id: COUPLE_ID,
      user_id: MEMBER_A,
      response_text: 'private answer',
    });
    await db.doc('prompt_responses/resp-deleted').set({
      couple_id: DELETED_COUPLE_ID,
      user_id: MEMBER_A,
      response_text: 'ex-couple answer',
    });

    await db.doc('prompt_completions/comp-active').set({
      couple_id: COUPLE_ID,
      responses: [
        { user_id: MEMBER_A, response_text: 'a' },
        { user_id: MEMBER_B, response_text: 'b' },
      ],
    });
    await db.doc('prompt_completions/comp-deleted').set({
      couple_id: DELETED_COUPLE_ID,
      responses: [{ user_id: MEMBER_A, response_text: 'old' }],
    });
    // Steady completion — created WITHOUT a `discussed` field (server only
    // initializes it for repair/divergence signals).
    await db.doc('prompt_completions/comp-steady').set({
      couple_id: COUPLE_ID,
      signal: 'steady',
      responses: [
        { user_id: MEMBER_A, response_text: 'a', response_score: 6 },
        { user_id: MEMBER_B, response_text: 'b', response_score: 7 },
      ],
    });
    // Repair completion with an existing (partially marked) discussed map.
    await db.doc('prompt_completions/comp-has-discussed').set({
      couple_id: COUPLE_ID,
      signal: 'repair',
      responses: [
        { user_id: MEMBER_A, response_text: 'a', response_score: 3 },
        { user_id: MEMBER_B, response_text: 'b', response_score: 4 },
      ],
      discussed: { [MEMBER_A]: new Date('2026-07-01T00:00:00Z') },
    });

    await db.doc('couple_invites/ABC234').set({
      invite_code: 'ABC234',
      inviter_id: INVITER,
      couple_id: PENDING_COUPLE_ID,
      status: 'pending',
    });
  });
});

const asUser = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asCoupleMember = (uid: string, coupleId: string) =>
  testEnv.authenticatedContext(uid, { coupleId });

// ---------------------------------------------------------------------------
// prompt_responses / prompt_completions — member vs stranger
// ---------------------------------------------------------------------------

describe('prompt_responses reads', () => {
  it('allows a couple member to read', async () => {
    await assertSucceeds(asUser(MEMBER_B).doc('prompt_responses/resp-active').get());
  });

  it('denies a stranger', async () => {
    await assertFails(asUser(STRANGER).doc('prompt_responses/resp-active').get());
  });

  it('denies an ex-member once the couple is deleted (breakup model)', async () => {
    await assertFails(asUser(MEMBER_A).doc('prompt_responses/resp-deleted').get());
  });
});

describe('prompt_completions reads', () => {
  it('allows a couple member to read', async () => {
    await assertSucceeds(asUser(MEMBER_A).doc('prompt_completions/comp-active').get());
  });

  it('denies a stranger', async () => {
    await assertFails(asUser(STRANGER).doc('prompt_completions/comp-active').get());
  });

  it('denies an ex-member once the couple is deleted', async () => {
    await assertFails(asUser(MEMBER_A).doc('prompt_completions/comp-deleted').get());
  });
});

// ---------------------------------------------------------------------------
// prompt_completions — "Keep it for the couch" (isCouchFlagUpdate)
// ---------------------------------------------------------------------------

describe('prompt_completions couch flag', () => {
  const flagFields = (uid: string) => ({
    couch_flagged: true,
    couch_flagged_by: uid,
    couch_flagged_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  it('allows a member to flag a steady doc, ADDING discussed as an empty map', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_A),
        discussed: {},
      })
    );
  });

  it('allows flagging a doc that already has discussed — WITHOUT the discussed key', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-has-discussed'), {
        ...flagFields(MEMBER_B),
      })
    );
  });

  it('denies a stranger flagging', async () => {
    await assertFails(
      updateDoc(doc(asUser(STRANGER), 'prompt_completions/comp-steady'), {
        ...flagFields(STRANGER),
        discussed: {},
      })
    );
  });

  it('denies smuggling other fields through the flag write', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_A),
        discussed: {},
        signal: 'repair',
      })
    );
  });

  it('denies overwriting an existing discussed map via the flag path', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-has-discussed'), {
        ...flagFields(MEMBER_B),
        discussed: {},
      })
    );
  });

  it('denies seeding discussed with content (must be empty)', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_A),
        discussed: { [MEMBER_B]: new Date() },
      })
    );
  });

  it('denies attributing the flag to the other partner', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_B),
        discussed: {},
      })
    );
  });

  it('denies unflagging (couch_flagged must be true)', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_A),
        couch_flagged: false,
        discussed: {},
      })
    );
  });

  it('denies a client-clock couch_flagged_at (must be serverTimestamp)', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), {
        ...flagFields(MEMBER_A),
        couch_flagged_at: new Date(),
        discussed: {},
      })
    );
  });

  it('denies an ex-member of a deleted couple flagging', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-deleted'), {
        ...flagFields(MEMBER_A),
        discussed: {},
      })
    );
  });
});

// ---------------------------------------------------------------------------
// couple_invites — enumeration closed
// ---------------------------------------------------------------------------

describe('couple_invites', () => {
  it('denies listing all pending invites (the enumeration hole)', async () => {
    await assertFails(
      asUser(STRANGER).collection('couple_invites').where('status', '==', 'pending').get()
    );
  });

  it('denies a stranger fetching an invite by code', async () => {
    await assertFails(asUser(STRANGER).doc('couple_invites/ABC234').get());
  });

  it("allows the inviter's own status query (invite-partner screen shape)", async () => {
    await assertSucceeds(
      asUser(INVITER)
        .collection('couple_invites')
        .where('inviter_id', '==', INVITER)
        .where('status', '==', 'pending')
        .get()
    );
  });

  it('allows the inviter to cancel their own invite', async () => {
    await assertSucceeds(
      asUser(INVITER).doc('couple_invites/ABC234').update({ status: 'cancelled' })
    );
  });

  it('denies a non-inviter client-side "acceptance" (server callable only)', async () => {
    await assertFails(
      asUser(STRANGER).doc('couple_invites/ABC234').update({
        status: 'accepted',
        accepted_by: STRANGER,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// couples — join-by-update branch removed, membership frozen client-side
// ---------------------------------------------------------------------------

describe('couples', () => {
  it('still allows an authed user to read a pending couple (invite flow)', async () => {
    await assertSucceeds(asUser(STRANGER).doc(`couples/${PENDING_COUPLE_ID}`).get());
  });

  it('allows a member to read their own deleted couple (stale-couple check)', async () => {
    await assertSucceeds(asUser(MEMBER_A).doc(`couples/${DELETED_COUPLE_ID}`).get());
  });

  it('denies a non-member joining a pending couple via update', async () => {
    await assertFails(
      asUser(STRANGER).doc(`couples/${PENDING_COUPLE_ID}`).update({
        member_ids: [INVITER, STRANGER],
        status: 'active',
      })
    );
  });

  it('denies a member changing member_ids from the client', async () => {
    await assertFails(
      asUser(MEMBER_A).doc(`couples/${COUPLE_ID}`).update({
        member_ids: [MEMBER_A, STRANGER],
      })
    );
  });

  it('allows a member a normal settings update', async () => {
    await assertSucceeds(
      asUser(MEMBER_A).doc(`couples/${COUPLE_ID}`).update({
        prompt_frequency: 'weekdays',
      })
    );
  });

  it('freezes a deleted couple (no further member updates)', async () => {
    await assertFails(
      asUser(MEMBER_A).doc(`couples/${DELETED_COUPLE_ID}`).update({
        status: 'active',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Storage — coupleId custom claim gates couple paths
// ---------------------------------------------------------------------------

describe('storage rules (coupleId custom claim)', () => {
  const IMG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
  const META = { contentType: 'image/jpeg' };

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.storage().ref(`chat/${COUPLE_ID}/existing.jpg`).put(IMG, META);
      await ctx.storage().ref(`responses/${COUPLE_ID}/assign-1/user-a.jpg`).put(IMG, META);
    });
  });

  it('allows a member (claim matches) to read a chat image', async () => {
    const storage = asCoupleMember(MEMBER_A, COUPLE_ID).storage();
    await assertSucceeds(storage.ref(`chat/${COUPLE_ID}/existing.jpg`).getDownloadURL());
  });

  it('denies an authed non-member (no claim) reading a chat image', async () => {
    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(storage.ref(`chat/${COUPLE_ID}/existing.jpg`).getDownloadURL());
  });

  it('denies a member of ANOTHER couple (claim mismatch)', async () => {
    const storage = asCoupleMember(STRANGER, 'couple-other').storage();
    await assertFails(storage.ref(`responses/${COUPLE_ID}/assign-1/user-a.jpg`).getDownloadURL());
  });

  it('allows a member (claim matches) to upload a response image', async () => {
    const storage = asCoupleMember(MEMBER_B, COUPLE_ID).storage();
    await assertSucceeds(
      storage.ref(`responses/${COUPLE_ID}/assign-2/user-b.jpg`).put(IMG, META).then()
    );
  });

  it('denies a non-member upload to a couple path', async () => {
    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(storage.ref(`chat/${COUPLE_ID}/evil.jpg`).put(IMG, META).then());
  });

  it('keeps avatars readable by any authed user and owner-write', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.storage().ref(`avatars/${MEMBER_A}/profile.jpg`).put(IMG, META);
    });

    const strangerStorage = testEnv.authenticatedContext(STRANGER).storage();
    await assertSucceeds(strangerStorage.ref(`avatars/${MEMBER_A}/profile.jpg`).getDownloadURL());
    await assertFails(strangerStorage.ref(`avatars/${MEMBER_A}/profile.jpg`).put(IMG, META).then());

    const ownerStorage = testEnv.authenticatedContext(MEMBER_A).storage();
    await assertSucceeds(ownerStorage.ref(`avatars/${MEMBER_A}/profile.jpg`).put(IMG, META).then());
  });

  it('denies non-image uploads to couple paths', async () => {
    const storage = asCoupleMember(MEMBER_A, COUPLE_ID).storage();
    await assertFails(
      storage.ref(`chat/${COUPLE_ID}/notes.txt`).put(IMG, { contentType: 'text/plain' }).then()
    );
  });
});
