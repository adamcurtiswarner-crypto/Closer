/**
 * FLOW 2 — Explore: A sends a question (creates the explore assignment and
 * answers first), B discovers it through the exact useExploreAssignments
 * query shape, reads responses through the exact useExploreResponses shape,
 * answers, and the server completes it.
 *
 * Shapes from src/hooks/useExplorePrompts.ts:
 * - useStartExplorePrompt: existence-check query
 *   (couple_id ==, prompt_id ==, source == 'explore'), then addDoc
 * - useExploreAssignments: (couple_id ==, source == 'explore')
 * - useExploreResponses: (couple_id ==, assignment_id ==) — the couple_id
 *   filter is load-bearing for rules-provability
 *
 * CONTRACT NOTE: like the daily flow, rules allow a member to read the
 * partner's explore response while the assignment is 'partial'; the seal is
 * useExploreResponses' client-side filter (only your own response is exposed
 * until status === 'completed').
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  FlowClient,
  RUN_ID,
  adminCleanup,
  createFlowClient,
  destroyFlowClient,
  seedCouple,
  submitResponseAsClient,
  todayISO,
  waitFor,
} from './helpers';

const COUPLE_ID = `flow-explore-couple-${RUN_ID}`;
const PROMPT_ID = `flow-explore-prompt-${RUN_ID}`;

let a: FlowClient;
let b: FlowClient;
let assignmentId: string;

beforeAll(async () => {
  a = await createFlowClient('explore-a');
  b = await createFlowClient('explore-b');
  await seedCouple(COUPLE_ID, a, b);
});

afterAll(async () => {
  await destroyFlowClient(a);
  await destroyFlowClient(b);
  await adminCleanup();
});

const exploreAssignmentsQuery = (client: FlowClient) =>
  query(
    collection(client.db, 'prompt_assignments'),
    where('couple_id', '==', COUPLE_ID),
    where('source', '==', 'explore')
  );

describe('explore flow (partner-sent question)', () => {
  it('A creates the explore assignment with the exact useStartExplorePrompt shape', async () => {
    // Existing-assignment guard query (equality-only, no composite index).
    const existing = await getDocs(
      query(
        collection(a.db, 'prompt_assignments'),
        where('couple_id', '==', COUPLE_ID),
        where('prompt_id', '==', PROMPT_ID),
        where('source', '==', 'explore')
      )
    );
    expect(existing.empty).toBe(true);

    const created = await addDoc(collection(a.db, 'prompt_assignments'), {
      couple_id: COUPLE_ID,
      prompt_id: PROMPT_ID,
      prompt_text: 'What made you laugh recently?',
      prompt_hint: null,
      prompt_type: 'fun_play',
      category: 'fun_play',
      requires_conversation: false,
      assigned_date: todayISO(),
      source: 'explore',
      status: 'delivered',
      completed_at: null,
      response_count: 0,
      first_response_at: null,
      second_response_at: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    assignmentId = created.id;
    expect(assignmentId).toBeTruthy();
  });

  it('A answers first; B sees the pending question via the exploreAssignments query shape', async () => {
    await submitResponseAsClient(a, COUPLE_ID, assignmentId, {
      responseText: 'That video you sent me.',
      promptId: PROMPT_ID,
      knownResponseCount: 0,
    });

    // The server trigger stamps first_responder_id — what
    // pendingPartnerQuestions() keys off to show "from your partner".
    await waitFor(async () => {
      const snap = await getDocs(exploreAssignmentsQuery(b));
      const found = snap.docs.find((d) => d.id === assignmentId);
      return found &&
        found.data().status === 'partial' &&
        found.data().first_responder_id === a.uid
        ? found
        : null;
    }, "B's explore query sees partial assignment with first_responder_id = A");
  });

  it("CONTRACT: B's exploreResponses query returns A's text while partial (seal is the client filter)", async () => {
    const snap = await getDocs(
      query(
        collection(b.db, 'prompt_responses'),
        where('couple_id', '==', COUPLE_ID),
        where('assignment_id', '==', assignmentId)
      )
    );
    const fromA = snap.docs.filter((d) => d.data().user_id === a.uid);
    expect(fromA).toHaveLength(1);
    expect(fromA[0].data().response_text).toBe('That video you sent me.');
  });

  it('B answers; the server creates the both-answered completion', async () => {
    await submitResponseAsClient(b, COUPLE_ID, assignmentId, {
      responseText: 'Honestly, the cat.',
      promptId: PROMPT_ID,
      knownResponseCount: 1,
    });

    // B's client already flipped the status; the server completion doc lags
    // behind the trigger. Reading a not-yet-existing completion is
    // rules-denied (resource.data deref on a missing doc), which is why
    // useTodayPrompt wraps its completion fetch in a try/catch — mirror it.
    await waitFor(async () => {
      const snap = await getDoc(doc(a.db, 'prompt_assignments', assignmentId));
      return snap.data()!.status === 'completed';
    }, 'explore assignment completed');

    const completion = await waitFor(async () => {
      try {
        const snap = await getDoc(doc(b.db, 'prompt_completions', assignmentId));
        return snap.exists() ? snap.data() : null;
      } catch {
        return null; // not created yet — rules deny reads of missing docs here
      }
    }, 'explore completion created by onResponseSubmitted');
    expect(completion.couple_id).toBe(COUPLE_ID);
    expect(completion.responses).toHaveLength(2);
    // Explore answers here are text-format: no scale signal.
    expect(completion.is_scale).toBe(false);
  });

  it('the reveal: both read both responses via the exact useExploreResponses shape', async () => {
    for (const client of [a, b]) {
      const snap = await getDocs(
        query(
          collection(client.db, 'prompt_responses'),
          where('couple_id', '==', COUPLE_ID),
          where('assignment_id', '==', assignmentId)
        )
      );
      expect(snap.docs).toHaveLength(2);
    }
  });
});
