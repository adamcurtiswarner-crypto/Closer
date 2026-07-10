/**
 * FLOW 1 — Daily prompt: assignment -> A submits -> B submits -> server
 * creates the completion and repairs the raced assignment status.
 *
 * Drives the EXACT query/write shapes from src/hooks/usePrompt.ts:
 * - useTodayPrompt's window query
 *   (couple_id ==, assigned_date in [yesterday, today, tomorrow])
 * - useTodayPrompt's responses query (couple_id ==, assignment_id ==)
 * - useSubmitResponse's deterministic `${assignmentId}_${uid}` setDoc + the
 *   client-side assignment counter update
 *
 * CONTRACT NOTE (documented on purpose): security rules allow COUPLE MEMBER
 * reads of prompt_responses before the reveal — the "sealed until both
 * answer" experience is enforced client-side (useExploreResponses filters,
 * Today screen gates on assignment status), not by rules. The pre-answer
 * read assertion below pins the CURRENT contract; server-enforced reveal
 * gating is a known post-launch queue item (worthiness review #4).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  FlowClient,
  RUN_ID,
  adminCleanup,
  createFlowClient,
  dateWindow,
  destroyFlowClient,
  seedCouple,
  seedDailyAssignment,
  submitResponseAsClient,
  waitFor,
} from './helpers';

const COUPLE_ID = `flow-daily-couple-${RUN_ID}`;
const ASSIGNMENT_ID = `flow-daily-assign-${RUN_ID}`;

let a: FlowClient;
let b: FlowClient;

beforeAll(async () => {
  a = await createFlowClient('daily-a');
  b = await createFlowClient('daily-b');
  await seedCouple(COUPLE_ID, a, b);
  await seedDailyAssignment(ASSIGNMENT_ID, COUPLE_ID);
});

afterAll(async () => {
  await destroyFlowClient(a);
  await destroyFlowClient(b);
  await adminCleanup();
});

const assignmentWindowQuery = (client: FlowClient) =>
  query(
    collection(client.db, 'prompt_assignments'),
    where('couple_id', '==', COUPLE_ID),
    where('assigned_date', 'in', dateWindow())
  );

const responsesQuery = (client: FlowClient) =>
  query(
    collection(client.db, 'prompt_responses'),
    where('couple_id', '==', COUPLE_ID),
    where('assignment_id', '==', ASSIGNMENT_ID)
  );

describe('daily prompt flow (two clients + functions emulator)', () => {
  it('both partners see the assignment through the exact Today window query', async () => {
    for (const client of [a, b]) {
      const snap = await getDocs(assignmentWindowQuery(client));
      const ids = snap.docs.map((d) => d.id);
      expect(ids).toContain(ASSIGNMENT_ID);
      const data = snap.docs.find((d) => d.id === ASSIGNMENT_ID)!.data();
      expect(data.status).toBe('delivered');
      expect(data.source).toBe('daily');
    }
  });

  it('A submits with the deterministic response id; assignment goes partial', async () => {
    const responseId = await submitResponseAsClient(a, COUPLE_ID, ASSIGNMENT_ID, {
      responseText: 'Feeling close today.',
      responseScore: 7,
      knownResponseCount: 0,
    });
    expect(responseId).toBe(`${ASSIGNMENT_ID}_${a.uid}`);

    const assignment = await getDoc(doc(a.db, 'prompt_assignments', ASSIGNMENT_ID));
    expect(assignment.data()!.status).toBe('partial');
    expect(assignment.data()!.response_count).toBe(1);

    // The server trigger also records the first responder authoritatively.
    await waitFor(async () => {
      const snap = await getDoc(doc(a.db, 'prompt_assignments', ASSIGNMENT_ID));
      return snap.data()!.first_responder_id === a.uid;
    }, 'server records first_responder_id');
  });

  it("CONTRACT: B can read A's response text pre-reveal (member reads allowed; seal is client-side)", async () => {
    const snap = await getDocs(responsesQuery(b));
    const partnerDocs = snap.docs.filter((d) => d.data().user_id === a.uid);
    expect(partnerDocs).toHaveLength(1);
    // The rules DO hand the partner the text before both have answered.
    // The client seals it in UI code only — pinned here so a rules change
    // (server-enforced reveal gating) shows up as an intentional diff.
    expect(partnerDocs[0].data().response_text).toBe('Feeling close today.');
  });

  it('B submits with a LOST status write (race); the server creates the completion and repairs the assignment', async () => {
    // skipAssignmentUpdate simulates the both-clients-read-count-0 race:
    // B's response doc lands but the client status write never happens.
    await submitResponseAsClient(b, COUPLE_ID, ASSIGNMENT_ID, {
      responseText: 'Me too.',
      responseScore: 7,
      skipAssignmentUpdate: true,
    });

    // onResponseSubmitted (functions emulator) must repair the assignment
    // status first observable step for the client: reading a completion doc
    // BEFORE it exists is rules-denied (resource.data deref on a missing
    // doc), which is exactly why useTodayPrompt fetches the completion only
    // once assignment.status === 'completed'. Mirror that order.
    await waitFor(async () => {
      const snap = await getDoc(doc(a.db, 'prompt_assignments', ASSIGNMENT_ID));
      return snap.data()!.status === 'completed';
    }, 'server repairs assignment status to completed');

    const completionSnap = await getDoc(doc(b.db, 'prompt_completions', ASSIGNMENT_ID));
    expect(completionSnap.exists()).toBe(true);
    const completion = completionSnap.data()!;

    expect(completion.couple_id).toBe(COUPLE_ID);
    expect(completion.responses).toHaveLength(2);
    const byUser = Object.fromEntries(
      (completion.responses as Array<{ user_id: string; response_text: string }>).map(
        (r) => [r.user_id, r.response_text]
      )
    );
    expect(byUser[a.uid]).toBe('Feeling close today.');
    expect(byUser[b.uid]).toBe('Me too.');
    // 7/7 with the default scale config: steady — no follow-up branch.
    expect(completion.signal).toBe('steady');

    // The repair also fixed the count B's lost write never bumped.
    const repaired = await getDoc(doc(a.db, 'prompt_assignments', ASSIGNMENT_ID));
    expect(repaired.data()!.response_count).toBe(2);
  });

  it('after the reveal, both partners read both responses through the responses query', async () => {
    for (const client of [a, b]) {
      const snap = await getDocs(responsesQuery(client));
      expect(snap.docs).toHaveLength(2);
      const users = snap.docs.map((d) => d.data().user_id).sort();
      expect(users).toEqual([a.uid, b.uid].sort());
    }
  });
});
