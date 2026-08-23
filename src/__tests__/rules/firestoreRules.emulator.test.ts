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
import { doc, updateDoc, serverTimestamp, documentId } from 'firebase/firestore';

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
    // The dissolved shape after the 2026-08-23 policy: the live roster is
    // emptied and preserved as history, so nothing can fan out to it.
    await db.doc(`couples/${DELETED_COUPLE_ID}`).set({
      member_ids: [],
      former_member_ids: [MEMBER_A, MEMBER_B],
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
      assignment_id: 'asg-1',
      submitted_at: new Date('2026-07-30T12:00:00Z'),
    });
    await db.doc('prompt_responses/resp-deleted').set({
      couple_id: DELETED_COUPLE_ID,
      user_id: MEMBER_A,
      response_text: 'ex-couple answer',
      assignment_id: 'asg-deleted-couple',
      submitted_at: new Date('2026-06-01T12:00:00Z'),
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

    // Assignments for the Your Words join + Open Days query shapes.
    await db.doc('prompt_assignments/asg-1').set({
      couple_id: COUPLE_ID,
      prompt_text: 'A question',
      status: 'partial',
      assigned_date: '2026-07-30',
      source: 'daily',
    });
    await db.doc('prompt_assignments/asg-deleted-couple').set({
      couple_id: DELETED_COUPLE_ID,
      prompt_text: 'Old question',
      status: 'delivered',
      assigned_date: '2026-06-01',
      source: 'daily',
    });

    // Plain completion used by the clarify-exchange suite.
    await db.doc('prompt_completions/comp-flagged').set({
      couple_id: COUPLE_ID,
      signal: 'steady',
      responses: [
        { user_id: MEMBER_A, response_text: 'a', response_score: 6 },
        { user_id: MEMBER_B, response_text: 'b', response_score: 6 },
      ],
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

  it("keeps an ex-member's OWN response readable after the couple is deleted (Your Words, 2026-08-02)", async () => {
    await assertSucceeds(asUser(MEMBER_A).doc('prompt_responses/resp-deleted').get());
  });

  it("denies an ex-member their PARTNER's response once the couple is deleted (breakup model)", async () => {
    // resp-deleted is owned by MEMBER_A — the partner reading it must still
    // hit the isCoupleMember(active) wall.
    await assertFails(asUser(MEMBER_B).doc('prompt_responses/resp-deleted').get());
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

describe('prompt_completions — the doc that does not exist yet', () => {
  // The reveal is optimistic: the client flips isComplete off its own
  // response_count the instant the second partner submits, which is BEFORE
  // the server trigger creates the completion doc.
  //
  // Until 2026-08-22 the read rule dereferenced resource.data.couple_id
  // unguarded, so a missing doc was a rules EVALUATION ERROR — returned as
  // permission-denied, not as an empty snapshot — and onSnapshot tears the
  // listener down for good on error. That killed the live reactions and
  // clarify listeners on every fresh reveal: 16 production denials between
  // 2026-08-03 and 2026-08-22, from the entire user base. The rule now
  // carries `resource == null ||`; these tests pin the new behaviour and
  // the exposure it does and does not create.
  it('allows a member to read a completion that has not been created yet', async () => {
    const snap = await asUser(MEMBER_A)
      .doc('prompt_completions/not-created-yet')
      .get();
    expect(snap.exists).toBe(false);
  });

  it('leaks only non-existence to a stranger, never a real completion', async () => {
    // The residual exposure of the null guard: any signed-in user can learn
    // that a given document id has no completion. Assignment ids are
    // Firestore auto-ids, so this is not a practical enumeration path — and
    // the moment a real doc exists, membership is enforced again.
    await assertSucceeds(
      asUser(STRANGER).doc('prompt_completions/no-such-completion').get()
    );
    await assertFails(
      asUser(STRANGER).doc('prompt_completions/comp-active').get()
    );
  });

  it('still denies a stranger listing the couple\'s completions', async () => {
    await assertFails(
      asUser(STRANGER)
        .collection('prompt_completions')
        .where('couple_id', '==', COUPLE_ID)
        .get()
    );
  });

  it('allows the read the moment the doc lands (what the retry waits for)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('prompt_completions/not-created-yet').set({
        couple_id: COUPLE_ID,
        responses: [],
      });
    });
    await assertSucceeds(
      asUser(MEMBER_A).doc('prompt_completions/not-created-yet').get()
    );
  });
});

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

describe('prompt_completions reactions (hardened 2026-08-03)', () => {
  // The old rule checked only which top-level fields changed — a member could
  // forge a reaction under the PARTNER's uid and store arbitrary text, which
  // the push pipeline renders into the partner's notification.
  const react = (uid: string, value: unknown) => ({
    [`reactions.${uid}`]: value,
    updated_at: serverTimestamp(),
  });

  it('lets a member set their OWN reaction', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), react(MEMBER_A, 'heart'))
    );
  });

  it('lets a member clear their own reaction (un-react)', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), react(MEMBER_A, null))
    );
  });

  it('accepts a custom emoji within the length cap', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-active'), react(MEMBER_B, '\u{1F979}'))
    );
  });

  it("DENIES forging a reaction under the partner's uid", async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), react(MEMBER_B, 'heart'))
    );
  });

  it('DENIES arbitrary long text (it reaches the partner push body)', async () => {
    await assertFails(
      updateDoc(
        doc(asUser(MEMBER_A), 'prompt_completions/comp-active'),
        react(MEMBER_A, 'x'.repeat(17))
      )
    );
  });

  it('DENIES a non-string reaction value', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), react(MEMBER_A, 7))
    );
  });

  it('denies a stranger reacting', async () => {
    await assertFails(
      updateDoc(doc(asUser(STRANGER), 'prompt_completions/comp-active'), react(STRANGER, 'heart'))
    );
  });
});

describe('prompt_completions clarify exchange (2026-08-02)', () => {
  const ask = (uid: string) => ({
    [`clarify.${uid}`]: {
      question: 'What did you mean by calmer?',
      asked_at: serverTimestamp(),
      answer: null,
      answered_at: null,
    },
    updated_at: serverTimestamp(),
  });

  // Reads go through a member context (members may read completions);
  // the beforeEach reseed means every test builds its own clarify state.
  const readEntry = async (completion: string, askerUid: string) => {
    const snap = await asUser(MEMBER_A).doc(`prompt_completions/${completion}`).get();
    return (snap.data()?.clarify ?? {})[askerUid];
  };

  it('lets a member ask one question about the partner answer', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), ask(MEMBER_A))
    );
  });

  it('denies asking under the partner key', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), ask(MEMBER_B))
    );
  });

  it('denies a second question from the same asker', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), ask(MEMBER_A))
    );
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-steady'), ask(MEMBER_A))
    );
  });

  it('denies an empty or over-long question', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-active'), {
        [`clarify.${MEMBER_B}`]: {
          question: '',
          asked_at: serverTimestamp(),
          answer: null,
          answered_at: null,
        },
        updated_at: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-active'), {
        [`clarify.${MEMBER_B}`]: {
          question: 'x'.repeat(281),
          asked_at: serverTimestamp(),
          answer: null,
          answered_at: null,
        },
        updated_at: serverTimestamp(),
      })
    );
  });

  it('lets the partner answer, preserving the question verbatim', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-active'), ask(MEMBER_A))
    );
    const entry = await readEntry('comp-active', MEMBER_A);
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-active'), {
        [`clarify.${MEMBER_A}`]: {
          question: entry.question,
          asked_at: entry.asked_at,
          answer: 'I meant the evenings feel lighter.',
          answered_at: serverTimestamp(),
        },
        updated_at: serverTimestamp(),
      })
    );
  });

  it('denies answering your own question', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-flagged'), ask(MEMBER_B))
    );
    const entry = await readEntry('comp-flagged', MEMBER_B);
    await assertFails(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-flagged'), {
        [`clarify.${MEMBER_B}`]: {
          question: entry.question,
          asked_at: entry.asked_at,
          answer: 'answering myself',
          answered_at: serverTimestamp(),
        },
        updated_at: serverTimestamp(),
      })
    );
  });

  it('denies rewriting the question while answering', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-flagged'), ask(MEMBER_B))
    );
    const entry = await readEntry('comp-flagged', MEMBER_B);
    await assertFails(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-flagged'), {
        [`clarify.${MEMBER_B}`]: {
          question: 'a different question',
          asked_at: entry.asked_at,
          answer: 'sure',
          answered_at: serverTimestamp(),
        },
        updated_at: serverTimestamp(),
      })
    );
  });

  it('lets a second answer attempt fail once answered', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(MEMBER_A), 'prompt_completions/comp-flagged'), ask(MEMBER_A))
    );
    const entry = await readEntry('comp-flagged', MEMBER_A);
    const answerWrite = (text: string) =>
      updateDoc(doc(asUser(MEMBER_B), 'prompt_completions/comp-flagged'), {
        [`clarify.${MEMBER_A}`]: {
          question: entry.question,
          asked_at: entry.asked_at,
          answer: text,
          answered_at: serverTimestamp(),
        },
        updated_at: serverTimestamp(),
      });
    await assertSucceeds(answerWrite('first answer'));
    await assertFails(answerWrite('rewritten answer'));
  });

  it('denies a stranger asking', async () => {
    await assertFails(
      updateDoc(doc(asUser(STRANGER), 'prompt_completions/comp-active'), ask(STRANGER))
    );
  });
});

describe('client LIST query shapes (the shapes the app actually issues)', () => {
  // Rules are evaluated per returned document for list queries; a single
  // unreadable candidate fails the WHOLE query. These assert the exact
  // shapes from useYourWords / useOpenDays / usePendingClarify — the class
  // of bug single-doc get() tests cannot catch.

  it('Your Words: own responses by user_id, newest first', async () => {
    await assertSucceeds(
      asUser(MEMBER_A)
        .collection('prompt_responses')
        .where('user_id', '==', MEMBER_A)
        .orderBy('submitted_at', 'desc')
        .limit(100)
        .get()
    );
  });

  it('Your Words: the result set may include ex-couple answers (owner read)', async () => {
    const snap = await asUser(MEMBER_A)
      .collection('prompt_responses')
      .where('user_id', '==', MEMBER_A)
      .orderBy('submitted_at', 'desc')
      .get();
    // resp-deleted belongs to a DELETED couple — it must still come back,
    // otherwise the journal empties at the unlink boundary.
    expect(snap.docs.map((d: { id: string }) => d.id).sort()).toEqual([
      'resp-active',
      'resp-deleted',
    ]);
  });

  it("denies querying the PARTNER's responses by user_id", async () => {
    await assertFails(
      asUser(MEMBER_B)
        .collection('prompt_responses')
        .where('user_id', '==', MEMBER_A)
        .orderBy('submitted_at', 'desc')
        .get()
    );
  });

  // 2026-08-23: `where(documentId(),'in', …)` is banned in client code —
  // Firestore evaluates the rules once per key INCLUDING keys with no
  // document, and a null `resource` fails the whole query. These pin the
  // replacements, with the fixtures the old shape could not survive.
  it('Open Days: my answers by assignment_id, with ids I never answered', async () => {
    await assertSucceeds(
      asUser(MEMBER_A)
        .collection('prompt_responses')
        .where('user_id', '==', MEMBER_A)
        .where('assignment_id', 'in', ['asg-1', 'asg-never-answered', 'asg-ghost'])
        .get()
    );
  });

  it('Open Days: returns only the days actually answered', async () => {
    const snap = await asUser(MEMBER_A)
      .collection('prompt_responses')
      .where('user_id', '==', MEMBER_A)
      .where('assignment_id', 'in', ['asg-1', 'asg-never-answered'])
      .get();

    expect(snap.docs.map((d: { id: string }) => d.id)).toEqual(['resp-active']);
  });

  it("Open Days: denies reading the PARTNER's answers by assignment_id", async () => {
    await assertFails(
      asUser(MEMBER_B)
        .collection('prompt_responses')
        .where('user_id', '==', MEMBER_A)
        .where('assignment_id', 'in', ['asg-1'])
        .get()
    );
  });

  it('Your Words: a per-id assignment read succeeds, and an ex-couple one denies', async () => {
    // The join is now one getDoc per id under allSettled, so a denial costs
    // that card its question instead of emptying the journal.
    await assertSucceeds(asUser(MEMBER_A).doc('prompt_assignments/asg-1').get());
    await assertFails(
      asUser(MEMBER_A).doc('prompt_assignments/asg-deleted-couple').get()
    );
  });

  it('Open Days: couple assignments by status + date window', async () => {
    await assertSucceeds(
      asUser(MEMBER_A)
        .collection('prompt_assignments')
        .where('couple_id', '==', COUPLE_ID)
        .where('status', 'in', ['delivered', 'partial'])
        .where('assigned_date', '>=', '2026-07-01')
        .orderBy('assigned_date', 'desc')
        .get()
    );
  });

  it('Pending clarify: recent completions for the couple', async () => {
    await assertSucceeds(
      asUser(MEMBER_A)
        .collection('prompt_completions')
        .where('couple_id', '==', COUPLE_ID)
        .orderBy('completed_at', 'desc')
        .limit(30)
        .get()
    );
  });

  it('denies a stranger the same couple-scoped shapes', async () => {
    await assertFails(
      asUser(STRANGER)
        .collection('prompt_assignments')
        .where('couple_id', '==', COUPLE_ID)
        .where('status', 'in', ['delivered', 'partial'])
        .where('assigned_date', '>=', '2026-07-01')
        .orderBy('assigned_date', 'desc')
        .get()
    );
  });
});

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

  // member_ids policy (2026-08-23): the live roster is emptied at
  // dissolution, so read access for an ex has to come from the history
  // field — otherwise clearing the roster would trade a send bug for a
  // read denial, and a denial is what tears listeners down in this app.
  it('lets a FORMER member still read their dissolved couple', async () => {
    await assertSucceeds(asUser(MEMBER_A).doc(`couples/${DELETED_COUPLE_ID}`).get());
  });

  it('does not let a former member write it back to life', async () => {
    await assertFails(
      asUser(MEMBER_A).doc(`couples/${DELETED_COUPLE_ID}`).update({
        member_ids: [MEMBER_A, MEMBER_B],
        status: 'active',
      })
    );
  });

  it('gives a stranger nothing through the history field', async () => {
    await assertFails(asUser(STRANGER).doc(`couples/${DELETED_COUPLE_ID}`).get());
  });

  it('still denies an ex the couple CONTENT, not just the couple doc', async () => {
    // The history field must not become a back door into the answers.
    await assertFails(asUser(MEMBER_A).doc('prompt_completions/comp-deleted').get());
    await assertFails(asUser(MEMBER_B).doc('prompt_responses/resp-deleted').get());
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
