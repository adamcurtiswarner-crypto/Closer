/**
 * FLOW 4 — Hearth "we talked" ritual: both partners mark discussed.<uid>
 * with the EXACT useMarkDiscussed write shape (the ONLY update shape the
 * prompt_completions rules allow besides reactions/memory saves), and the
 * onCompletionDiscussed trigger settles discussed_at once both marks exist.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  FlowClient,
  RUN_ID,
  adminCleanup,
  createFlowClient,
  destroyFlowClient,
  seedCouple,
  waitFor,
  withAdminDb,
} from './helpers';

const COUPLE_ID = `flow-hearth-couple-${RUN_ID}`;
const COMPLETION_ID = `flow-hearth-completion-${RUN_ID}`;

let a: FlowClient;
let b: FlowClient;

beforeAll(async () => {
  a = await createFlowClient('hearth-a');
  b = await createFlowClient('hearth-b');
  await seedCouple(COUPLE_ID, a, b);

  // A repair-signal completion the way onResponseSubmitted writes it —
  // including the empty `discussed` map (the rules REQUIRE the field to
  // already exist for the mark to be writable).
  await withAdminDb(async (db) => {
    await db.doc(`prompt_completions/${COMPLETION_ID}`).set({
      assignment_id: COMPLETION_ID,
      couple_id: COUPLE_ID,
      prompt_id: `flow-hearth-prompt-${RUN_ID}`,
      category: 'communication',
      prompt_text: 'How connected do you feel today?',
      is_scale: true,
      signal: 'repair',
      discussed: {},
      discussed_at: null,
      responses: [
        { user_id: a.uid, response_text: 'A 3 today.', response_score: 3 },
        { user_id: b.uid, response_text: 'A 4 for me.', response_score: 4 },
      ],
      completed_at: new Date(),
      created_at: new Date(),
    });
  });
});

afterAll(async () => {
  await destroyFlowClient(a);
  await destroyFlowClient(b);
  await adminCleanup();
});

const markDiscussed = (client: FlowClient) =>
  updateDoc(doc(client.db, 'prompt_completions', COMPLETION_ID), {
    [`discussed.${client.uid}`]: serverTimestamp(),
  });

describe('Hearth "we talked" flow', () => {
  it('both partners see the completion through the exact useHearth query shape', async () => {
    for (const client of [a, b]) {
      const snap = await getDocs(
        query(
          collection(client.db, 'prompt_completions'),
          where('couple_id', '==', COUPLE_ID),
          orderBy('completed_at', 'desc'),
          limit(120)
        )
      );
      const found = snap.docs.find((d) => d.id === COMPLETION_ID);
      expect(found).toBeDefined();
      expect(found!.data().signal).toBe('repair');
      expect(found!.data().discussed_at).toBeNull();
    }
  });

  it("A's mark lands (rules allow only the own-uid discussed key); not yet tended", async () => {
    await markDiscussed(a);

    const snap = await getDoc(doc(b.db, 'prompt_completions', COMPLETION_ID));
    expect(Object.keys(snap.data()!.discussed)).toEqual([a.uid]);
    expect(snap.data()!.discussed_at).toBeNull();
  });

  it("B's mark settles the ritual: onCompletionDiscussed stamps discussed_at", async () => {
    await markDiscussed(b);

    const settled = await waitFor(async () => {
      const snap = await getDoc(doc(a.db, 'prompt_completions', COMPLETION_ID));
      return snap.data()!.discussed_at ? snap.data() : null;
    }, 'onCompletionDiscussed stamps discussed_at after both marks');

    expect(Object.keys(settled.discussed).sort()).toEqual([a.uid, b.uid].sort());
    // Server timestamp, not a client write (rules forbid the client
    // touching discussed_at at all).
    expect(typeof settled.discussed_at?.toDate).toBe('function');
  });
});
