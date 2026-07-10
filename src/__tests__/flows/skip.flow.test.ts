/**
 * FLOW 3 — Follow-up skip sync: A sets a follow-up aside with the EXACT
 * useSkipFollowUp write shape (skipped_by.<uid> = serverTimestamp()), and
 * B's Today window query observes it — the cross-device "set aside for
 * today" signal that also stops response reminders for A
 * (notifications.ts isUserSetAside).
 */
import {
  collection,
  doc,
  getDocs,
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
  dateWindow,
  destroyFlowClient,
  seedCouple,
  seedDailyAssignment,
  todayISO,
} from './helpers';

const COUPLE_ID = `flow-skip-couple-${RUN_ID}`;
const ASSIGNMENT_ID = `flow-skip-assign-${RUN_ID}`;

let a: FlowClient;
let b: FlowClient;

beforeAll(async () => {
  a = await createFlowClient('skip-a');
  b = await createFlowClient('skip-b');
  await seedCouple(COUPLE_ID, a, b);
  // A follow-up assignment, the way createFollowUpAssignment shapes it.
  await seedDailyAssignment(ASSIGNMENT_ID, COUPLE_ID, {
    assignment_kind: 'follow_up',
    response_format: 'text',
    scale_config: null,
    follow_up: {
      branch: 'repair',
      step: 1,
      parent_assignment_id: `flow-skip-parent-${RUN_ID}`,
      template_id: `flow-skip-template-${RUN_ID}`,
    },
    prompt_text: 'What would have made today a 6?',
    assigned_date: todayISO(),
  });
});

afterAll(async () => {
  await destroyFlowClient(a);
  await destroyFlowClient(b);
  await adminCleanup();
});

describe('follow-up skip sync flow', () => {
  it('A writes the exact useSkipFollowUp shape (rules allow the member update)', async () => {
    await updateDoc(doc(a.db, 'prompt_assignments', ASSIGNMENT_ID), {
      [`skipped_by.${a.uid}`]: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  });

  it("B's Today window query sees A's server-visible skip", async () => {
    const snap = await getDocs(
      query(
        collection(b.db, 'prompt_assignments'),
        where('couple_id', '==', COUPLE_ID),
        where('assigned_date', 'in', dateWindow())
      )
    );
    const found = snap.docs.find((d) => d.id === ASSIGNMENT_ID);
    expect(found).toBeDefined();

    const skippedBy = found!.data().skipped_by || {};
    // B's client derives "set aside for today" from this map (mapAssignment
    // exposes Object.keys(skipped_by)); reminders skip A for it too.
    expect(Object.keys(skippedBy)).toContain(a.uid);
    // And it is a real timestamp, not a tombstone boolean.
    expect(typeof skippedBy[a.uid]?.toDate).toBe('function');
    // B has NOT skipped — the map is per-user.
    expect(Object.keys(skippedBy)).not.toContain(b.uid);
  });
});
