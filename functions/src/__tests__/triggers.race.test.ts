/**
 * Race-condition regression tests for onResponseSubmitted (triggers.ts).
 *
 * The client (useSubmitResponse) creates the prompt_responses doc and then
 * immediately increments the assignment's response_count. The trigger fires
 * asynchronously — in production usually AFTER that increment — so branch
 * decisions must derive from the actual count of prompt_responses docs, not
 * the client-maintained assignment.response_count snapshot.
 *
 * Orderings covered:
 *   (a) trigger reads AFTER the client incremented response_count
 *       (production-common ordering — the regression for the original bug)
 *   (b) double-fire: two executions both see 2 responses
 *       -> exactly one completion + one follow-up evaluation
 *   (c) first-response ordering (trigger reads BEFORE the client increment)
 *       still sends exactly one nudge; a late-firing duplicate cannot re-send
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// In-memory Firestore fake, injected via the shared module mock. Supports the
// exact surface onResponseSubmitted uses: collection().doc().get/update/create
// and collection().where('==').get(). create() is atomic first-writer-wins.
// ---------------------------------------------------------------------------

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();
  const writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }> = [];

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop(),
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
    set: async (data: Record<string, unknown>) => {
      writeLog.push({ op: 'set', path, data });
      docs.set(path, { ...data });
    },
    create: async (data: Record<string, unknown>) => {
      if (docs.has(path)) {
        const err = new Error(`6 ALREADY_EXISTS: Document already exists: ${path}`);
        (err as Error & { code: number }).code = 6;
        throw err;
      }
      writeLog.push({ op: 'create', path, data });
      docs.set(path, { ...data });
    },
    update: async (data: Record<string, unknown>) => {
      writeLog.push({ op: 'update', path, data });
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
  });

  const makeQuery = (name: string, filters: Array<[string, unknown]>) => ({
    where: (field: string, _op: string, value: unknown) =>
      makeQuery(name, [...filters, [field, value]]),
    get: async () => {
      const matched = [...docs.entries()]
        .filter(
          ([path]) =>
            path.startsWith(`${name}/`) && segmentCount(path) === segmentCount(name) + 1
        )
        .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        .map(([path, data]) => ({
          id: path.split('/').pop(),
          data: () => data,
          ref: makeDocRef(path),
        }));
      return { docs: matched, size: matched.length, empty: matched.length === 0 };
    },
  });

  const makeCollection = (name: string) => ({
    doc: (id: string) => makeDocRef(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => makeQuery(name, [[field, value]]),
  });

  return {
    db: { collection: makeCollection },
    __store: { docs, writeLog },
    APP_NAME: 'Stoke',
    DEPTH_THRESHOLD: 3,
    DEEP_WEEK_FLOOR: 4,
    initializeDepthProgress: () => ({}),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../followUps', () => ({
  evaluateFollowUpOnCompletion: jest.fn().mockResolvedValue(undefined),
}));

import { onResponseSubmitted } from '../triggers';
import { evaluateFollowUpOnCompletion } from '../followUps';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrapped = fft.wrap(onResponseSubmitted);

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
}).__store;

const sendPushNotification = shared.sendPushNotification as jest.Mock;
const logEvent = shared.logEvent as jest.Mock;
const reportError = shared.reportError as jest.Mock;
const evaluateFollowUp = evaluateFollowUpOnCompletion as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ASSIGNMENT_ID = 'assign-1';
const COUPLE_ID = 'couple-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const PROMPT_ID = 'prompt-1';
const COMPLETION_PATH = `prompt_completions/${ASSIGNMENT_ID}`;

function makeResponse(userId: string, submittedAt: Date): Record<string, unknown> {
  return {
    assignment_id: ASSIGNMENT_ID,
    couple_id: COUPLE_ID,
    user_id: userId,
    prompt_id: PROMPT_ID,
    response_text: 'a thoughtful answer',
    response_score: null,
    image_url: null,
    status: 'submitted',
    submitted_at: submittedAt,
    response_length: 18,
  };
}

function makeSnap(data: Record<string, unknown>) {
  return { data: () => data } as never;
}

function seedBaseDocs(assignmentOverrides: Record<string, unknown>): void {
  store.docs.set(`prompt_assignments/${ASSIGNMENT_ID}`, {
    couple_id: COUPLE_ID,
    prompt_id: PROMPT_ID,
    assignment_kind: 'daily',
    response_format: 'scale',
    status: 'delivered',
    response_count: 0,
    first_responder_id: null,
    ...assignmentOverrides,
  });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
  });
  store.docs.set(`users/${USER_A}`, { display_name: 'Alex' });
  store.docs.set(`users/${USER_B}`, { display_name: 'Blake' });
  store.docs.set(`prompts/${PROMPT_ID}`, {
    type: 'love_map_update',
    emotional_depth: 'surface',
  });
}

function seedResponseDoc(id: string, data: Record<string, unknown>): void {
  store.docs.set(`prompt_responses/${id}`, data);
}

function partnerNudges(): unknown[][] {
  return sendPushNotification.mock.calls.filter(
    (call) => call[2]?.type === 'partner_responded'
  );
}

function completionReveals(): unknown[][] {
  return sendPushNotification.mock.calls.filter(
    (call) => (call[1]?.body as string | undefined)?.includes('answered too')
  );
}

function completionCreates(): Array<{ op: string; path: string }> {
  return store.writeLog.filter((w) => w.op === 'create' && w.path === COMPLETION_PATH);
}

function coupleStatUpdates(): Array<{ op: string; path: string; data: Record<string, unknown> }> {
  return store.writeLog.filter(
    (w) => w.path === `couples/${COUPLE_ID}` && 'total_completions' in w.data
  );
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  jest.clearAllMocks();
});

afterAll(() => {
  fft.cleanup();
});

// ---------------------------------------------------------------------------
// (a) Production-common ordering: trigger reads AFTER the client increment
// ---------------------------------------------------------------------------

describe('ordering (a): trigger reads AFTER client incremented response_count', () => {
  it('first response with response_count already 1 takes the nudge path, not completion (regression)', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'));
    seedResponseDoc('resp-1', first);
    // Client already ran: response_count 1, first responder recorded, partial.
    seedBaseDocs({
      response_count: 1,
      first_responder_id: USER_A,
      first_response_at: new Date('2026-07-05T10:00:00Z'),
      status: 'partial',
    });

    await wrapped(makeSnap(first));

    // No single-response completion, no streak/stats, no follow-up evaluation.
    expect(store.docs.has(COMPLETION_PATH)).toBe(false);
    expect(coupleStatUpdates()).toHaveLength(0);
    expect(evaluateFollowUp).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalledWith(
      'prompt_completed', expect.anything(), expect.anything(), expect.anything()
    );

    // Exactly one "your turn" nudge, to the partner.
    const nudges = partnerNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0][0]).toBe(USER_B);
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
  });

  it('second response with response_count already 2 completes: one completion doc, streak once, follow-up once', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-05T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-2', second);
    // Client already ran twice: response_count 2, completed.
    seedBaseDocs({
      response_count: 2,
      first_responder_id: USER_A,
      status: 'completed',
    });

    await wrapped(makeSnap(second));

    const completion = store.docs.get(COMPLETION_PATH) as Record<string, unknown>;
    expect(completion).toBeDefined();
    expect((completion.responses as unknown[]).length).toBe(2);
    expect(completion.time_to_complete_seconds).toBe(3600);

    expect(coupleStatUpdates()).toHaveLength(1);
    expect(evaluateFollowUp).toHaveBeenCalledTimes(1);
    expect(evaluateFollowUp).toHaveBeenCalledWith(
      ASSIGNMENT_ID,
      expect.objectContaining({ couple_id: COUPLE_ID }),
      expect.arrayContaining([
        expect.objectContaining({ response_score: null, response_text: 'a thoughtful answer' }),
      ]),
      USER_B
    );

    // First responder gets the reveal push; no "your turn" nudge fires.
    expect(completionReveals()).toHaveLength(1);
    expect(completionReveals()[0][0]).toBe(USER_A);
    expect(partnerNudges()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// (b) Double-fire: both executions observe 2 responses
// ---------------------------------------------------------------------------

describe('ordering (b): double-fire where both triggers see 2 responses', () => {
  function seedCompletedPair() {
    const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-05T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-2', second);
    seedBaseDocs({
      response_count: 2,
      first_responder_id: USER_A,
      status: 'completed',
    });
    return { first, second };
  }

  it('sequential double-fire: exactly one completion, one streak update, one follow-up, one reveal push', async () => {
    const { first, second } = seedCompletedPair();

    await wrapped(makeSnap(second));
    await wrapped(makeSnap(first)); // duplicate/late execution, also sees 2 responses

    expect(completionCreates()).toHaveLength(1);
    expect(coupleStatUpdates()).toHaveLength(1);
    expect(evaluateFollowUp).toHaveBeenCalledTimes(1);
    expect(completionReveals()).toHaveLength(1);
    expect(partnerNudges()).toHaveLength(0);
    // The loser must not surface an error — ALREADY_EXISTS is an expected skip.
    expect(reportError).not.toHaveBeenCalled();
  });

  it('concurrent double-fire: create() first-writer-wins keeps one completion and one follow-up', async () => {
    const { first, second } = seedCompletedPair();

    await Promise.all([wrapped(makeSnap(first)), wrapped(makeSnap(second))]);

    expect(completionCreates()).toHaveLength(1);
    expect(coupleStatUpdates()).toHaveLength(1);
    expect(evaluateFollowUp).toHaveBeenCalledTimes(1);
    expect(partnerNudges()).toHaveLength(0);
    expect(reportError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (c) First-response ordering (trigger beats the client increment) + late dupe
// ---------------------------------------------------------------------------

describe('ordering (c): first-response path', () => {
  it('trigger reading BEFORE the client increment (response_count 0) still sends exactly one nudge', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedBaseDocs({ response_count: 0 }); // client update not yet applied

    await wrapped(makeSnap(first));

    const nudges = partnerNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0][0]).toBe(USER_B);
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(store.docs.has(COMPLETION_PATH)).toBe(false);
    expect(evaluateFollowUp).not.toHaveBeenCalled();

    // first_responder_id recorded on the assignment.
    const assignment = store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`)!;
    expect(assignment.first_responder_id).toBe(USER_A);
  });

  it('late-firing duplicate of the first-response event (partner has since answered) does not re-send the nudge', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-05T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedBaseDocs({ response_count: 1, first_responder_id: USER_A, status: 'partial' });

    // Original first-response execution: one nudge.
    await wrapped(makeSnap(first));
    expect(partnerNudges()).toHaveLength(1);

    // Partner responds; the second-response trigger completes the assignment.
    seedResponseDoc('resp-2', second);
    store.docs.set(`prompt_assignments/${ASSIGNMENT_ID}`, {
      ...store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`)!,
      response_count: 2,
      status: 'completed',
    });
    await wrapped(makeSnap(second));
    expect(completionCreates()).toHaveLength(1);

    // Late duplicate delivery of the FIRST response's event: it now sees two
    // responses, routes to the completion path, and is absorbed by create().
    await wrapped(makeSnap(first));

    expect(partnerNudges()).toHaveLength(1); // still exactly one nudge
    expect(completionCreates()).toHaveLength(1); // still exactly one completion
    expect(coupleStatUpdates()).toHaveLength(1); // streak counted once
    expect(evaluateFollowUp).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });
});
