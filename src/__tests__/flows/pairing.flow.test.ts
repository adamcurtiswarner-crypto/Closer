/**
 * FLOW 5 — Pairing via the acceptInvite callable (the ONLY join path since
 * the enumeration fix: clients can no longer read or update someone else's
 * invite, so the whole join happens server-side in a transaction).
 *
 * Seeds the inviter's pending couple + invite doc (what the invite-partner
 * screen creates), then B calls the callable in the functions emulator.
 *
 * Asserted here (needs the auth emulator):
 * - the join transaction: couple -> active with both member_ids, invite ->
 *   accepted, B's user doc gets couple_id
 * - the coupleId CUSTOM CLAIM lands for both members and is visible to each
 *   client after getIdTokenResult(true) — this is what Storage rules key on
 *
 * NOT assertable in the harness (documented so nobody hunts for it):
 * - Storage-rules admission via that claim end to end (Storage emulator is
 *   not part of this run; src/__tests__/rules covers the Storage rules with
 *   simulated claims)
 * - claim propagation timing on a real device (natural ~1h token refresh) —
 *   here we force refresh with getIdTokenResult(true)
 */
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import {
  FlowClient,
  RUN_ID,
  adminCleanup,
  createFlowClient,
  destroyFlowClient,
  waitFor,
  withAdminDb,
} from './helpers';

const COUPLE_ID = `flow-pair-couple-${RUN_ID}`;
// Invite codes must match the callable's /^[A-Z0-9]{6}$/ validation.
const INVITE_CODE = `F${RUN_ID.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase()}`.padEnd(6, '2');

let inviter: FlowClient;
let joiner: FlowClient;

beforeAll(async () => {
  inviter = await createFlowClient('pair-inviter');
  joiner = await createFlowClient('pair-joiner');

  // What the invite-partner screen leaves behind: a pending single-member
  // couple + a pending invite doc keyed by code.
  await withAdminDb(async (db) => {
    await db.doc(`users/${inviter.uid}`).set({
      display_name: 'Inviter',
      couple_id: COUPLE_ID,
      email: 'inviter@flows.test',
      is_onboarded: true,
      is_deleted: false,
    });
    await db.doc(`users/${joiner.uid}`).set({
      display_name: 'Joiner',
      couple_id: null,
      email: 'joiner@flows.test',
      is_onboarded: true,
      is_deleted: false,
    });
    await db.doc(`couples/${COUPLE_ID}`).set({
      member_ids: [inviter.uid],
      member_emails: ['inviter@flows.test'],
      status: 'pending',
      created_at: new Date(),
    });
    await db.doc(`couple_invites/${INVITE_CODE}`).set({
      invite_code: INVITE_CODE,
      inviter_id: inviter.uid,
      couple_id: COUPLE_ID,
      status: 'pending',
      created_at: new Date(),
      expires_at: null,
    });
  });
});

afterAll(async () => {
  await destroyFlowClient(inviter);
  await destroyFlowClient(joiner);
  await adminCleanup();
});

describe('pairing flow (acceptInvite callable)', () => {
  it('B accepts the invite through the callable and the join transaction lands', async () => {
    const acceptInvite = httpsCallable(joiner.functions, 'acceptInvite');
    const result = await acceptInvite({ code: INVITE_CODE });
    expect((result.data as { coupleId: string }).coupleId).toBe(COUPLE_ID);

    // Couple activated with BOTH members, membership ordered inviter-first.
    const couple = await getDoc(doc(joiner.db, 'couples', COUPLE_ID));
    expect(couple.data()!.status).toBe('active');
    expect(couple.data()!.member_ids).toEqual([inviter.uid, joiner.uid]);

    // Joiner's user doc linked.
    const joinerDoc = await getDoc(doc(joiner.db, 'users', joiner.uid));
    expect(joinerDoc.data()!.couple_id).toBe(COUPLE_ID);

    // Invite consumed (admin read — the joiner can no longer read it, which
    // is the enumeration fix working as intended).
    const invite = await withAdminDb(async (db) =>
      (await db.doc(`couple_invites/${INVITE_CODE}`).get()).data()
    );
    expect(invite!.status).toBe('accepted');
    expect(invite!.accepted_by).toBe(joiner.uid);
  });

  it('both members receive the coupleId custom claim (Storage rules depend on it)', async () => {
    for (const client of [inviter, joiner]) {
      const claims = await waitFor(async () => {
        const token = await client.auth.currentUser!.getIdTokenResult(true);
        return token.claims.coupleId === COUPLE_ID ? token.claims : null;
      }, `${client.name} coupleId claim propagates`, { timeoutMs: 10000 });
      expect(claims.coupleId).toBe(COUPLE_ID);
    }
  });

  it('after pairing, both partners can read the shared couple doc as members', async () => {
    for (const client of [inviter, joiner]) {
      const couple = await getDoc(doc(client.db, 'couples', COUPLE_ID));
      expect(couple.exists()).toBe(true);
      expect(couple.data()!.member_ids).toContain(client.uid);
    }
  });
});
