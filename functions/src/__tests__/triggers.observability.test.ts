/**
 * Observability tests for onResponseSubmitted (triggers.ts):
 *
 * 1. reportError wrapper — ANY handler failure is written to error_logs via
 *    reportError('onResponseSubmitted', …) and NEVER rethrown (a Firestore
 *    event redelivery on a poisoned doc would fail identically; alerting
 *    reads error_logs).
 * 2. Canary containment — assignment.source === 'canary' exercises the real
 *    pipeline (completion create + assignment status repair) but skips every
 *    human-facing side effect: pushes, couple stats/streaks, follow-up
 *    creation, analytics events.
 */
import * as functionsTest from 'firebase-functions-test';

// Same in-memory Firestore fake as triggers.race.test.ts, injected via the
// shared module mock.
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
    DEFAULT_SCALE_CONFIG: {
      min: 1,
      max: 10,
      low_threshold: 4,
      high_threshold: 9,
      divergence_gap: 4,
      min_label: 'Struggling',
      max_label: 'Thriving',
    },
    initializeDepthProgress: () => ({}),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../followUps', () => ({
  ...jest.requireActual('../followUps'),
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

const ASSIGNMENT_ID = 'assign-canary';
const COUPLE_ID = 'canary-couple';
const USER_A = 'canary-user-a';
const USER_B = 'canary-user-b';

function makeResponse(userId: string, submittedAt: Date): Record<string, unknown> {
  return {
    assignment_id: ASSIGNMENT_ID,
    couple_id: COUPLE_ID,
    user_id: userId,
    prompt_id: 'canary-prompt',
    response_text: 'canary',
    response_score: 7,
    image_url: null,
    status: 'submitted',
    submitted_at: submittedAt,
    response_length: 6,
  };
}

function makeSnap(data: Record<string, unknown>) {
  return { data: () => data } as never;
}

function seedCanaryDocs(assignmentOverrides: Record<string, unknown> = {}): void {
  store.docs.set(`prompt_assignments/${ASSIGNMENT_ID}`, {
    couple_id: COUPLE_ID,
    prompt_id: 'canary-prompt',
    assignment_kind: 'daily',
    response_format: 'scale',
    source: 'canary',
    status: 'delivered',
    response_count: 0,
    first_responder_id: null,
    ...assignmentOverrides,
  });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'canary',
  });
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  jest.clearAllMocks();
});

afterAll(() => {
  fft.cleanup();
});

describe('reportError wrapper (rethrow-free)', () => {
  it('reports a handler failure to error_logs and resolves instead of rethrowing', async () => {
    // No assignment doc seeded: assignmentDoc.data()! is undefined and the
    // handler throws on property access — the wrapper must absorb it.
    const response = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', response);

    await expect(wrapped(makeSnap(response))).resolves.not.toThrow();

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      'onResponseSubmitted',
      expect.anything(),
      expect.objectContaining({
        userId: USER_A,
        coupleId: COUPLE_ID,
        extra: { assignmentId: ASSIGNMENT_ID },
      })
    );
  });

  it('does not report on the happy path', async () => {
    seedCanaryDocs();
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    store.docs.set(`prompt_responses/${ASSIGNMENT_ID}_${USER_A}`, first);

    await wrapped(makeSnap(first));

    expect(reportError).not.toHaveBeenCalled();
  });
});

describe('canary containment (source === "canary")', () => {
  it('first canary response records first_responder but sends no partner nudge and logs no events', async () => {
    seedCanaryDocs();
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    store.docs.set(`prompt_responses/${ASSIGNMENT_ID}_${USER_A}`, first);

    await wrapped(makeSnap(first));

    const assignment = store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`)!;
    expect(assignment.first_responder_id).toBe(USER_A);
    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('second canary response runs the REAL pipeline (completion + status repair) with zero human side effects', async () => {
    seedCanaryDocs({ status: 'partial', response_count: 1, first_responder_id: USER_A });
    store.docs.set(
      `prompt_responses/${ASSIGNMENT_ID}_${USER_A}`,
      makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'))
    );
    const second = makeResponse(USER_B, new Date('2026-07-09T10:05:00Z'));
    store.docs.set(`prompt_responses/${ASSIGNMENT_ID}_${USER_B}`, second);

    await wrapped(makeSnap(second));

    // The pipeline the canary asserts on:
    const completion = store.docs.get(`prompt_completions/${ASSIGNMENT_ID}`);
    expect(completion).toBeDefined();
    expect(completion!.couple_id).toBe(COUPLE_ID);
    const assignment = store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`)!;
    expect(assignment.status).toBe('completed');

    // …and nothing that could touch a human:
    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(evaluateFollowUp).not.toHaveBeenCalled();
    const coupleWrites = store.writeLog.filter((w) => w.path === `couples/${COUPLE_ID}`);
    expect(coupleWrites).toHaveLength(0);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('a normal (non-canary) completion still logs events and evaluates follow-ups', async () => {
    seedCanaryDocs({ source: 'daily', status: 'partial', response_count: 1, first_responder_id: USER_A });
    store.docs.set(`users/${USER_A}`, { display_name: 'Alex' });
    store.docs.set(`users/${USER_B}`, { display_name: 'Blake' });
    store.docs.set('prompts/canary-prompt', { type: 'love_map_update', response_format: 'scale' });
    store.docs.set(
      `prompt_responses/${ASSIGNMENT_ID}_${USER_A}`,
      makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'))
    );
    const second = makeResponse(USER_B, new Date('2026-07-09T10:05:00Z'));
    store.docs.set(`prompt_responses/${ASSIGNMENT_ID}_${USER_B}`, second);

    await wrapped(makeSnap(second));

    expect(store.docs.get(`prompt_completions/${ASSIGNMENT_ID}`)).toBeDefined();
    expect(logEvent).toHaveBeenCalled();
    expect(evaluateFollowUp).toHaveBeenCalledTimes(1);
  });
});
