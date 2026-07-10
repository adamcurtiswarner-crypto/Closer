/**
 * SEV-0 reveal-race regression tests for onResponseSubmitted (triggers.ts).
 *
 * Two server-side bugs being locked down:
 *
 *  (1) Distinct-responder requirement: the completion branch used to fire on
 *      raw response-doc count >= 2, so duplicate submissions from ONE user
 *      (client retry / offline-queue replay) "completed" the prompt with one
 *      person's answer twice.
 *
 *  (2) Assignment status back-write: the trigger never wrote
 *      status 'completed' back to the prompt_assignments doc. When two
 *      clients raced (both read response_count 0, both wrote 1/'partial'),
 *      the assignment stranded at 'partial' forever while the completion doc
 *      existed — and the reveal, which gates on assignment status, never
 *      opened. The trigger now finalizes the assignment (idempotently) and
 *      also repairs a 'delivered' assignment to 'partial' when exactly one
 *      distinct response exists.
 *
 * Also covered: depth-progression bookkeeping is skipped for scale prompts
 * (selection exempts them from depth gating — see prompts.selection.test.ts).
 *
 * Uses the same in-memory Firestore fake as triggers.race.test.ts.
 */
import * as functionsTest from 'firebase-functions-test';

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
const reportError = shared.reportError as jest.Mock;
const evaluateFollowUp = evaluateFollowUpOnCompletion as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ASSIGNMENT_ID = 'assign-1';
const ASSIGNMENT_PATH = `prompt_assignments/${ASSIGNMENT_ID}`;
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
    response_score: 7,
    image_url: null,
    status: 'submitted',
    submitted_at: submittedAt,
    response_length: 18,
  };
}

function makeSnap(data: Record<string, unknown>) {
  return { data: () => data } as never;
}

function seedBaseDocs(
  assignmentOverrides: Record<string, unknown>,
  promptOverrides: Record<string, unknown> = {}
): void {
  store.docs.set(ASSIGNMENT_PATH, {
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
    type: 'communication',
    emotional_depth: 'medium',
    response_format: 'scale',
    ...promptOverrides,
  });
}

function seedResponseDoc(id: string, data: Record<string, unknown>): void {
  store.docs.set(`prompt_responses/${id}`, data);
}

function assignment(): Record<string, unknown> {
  return store.docs.get(ASSIGNMENT_PATH)!;
}

function partnerNudges(): unknown[][] {
  return sendPushNotification.mock.calls.filter(
    (call) => call[2]?.type === 'partner_responded'
  );
}

function completionCreates(): Array<{ op: string; path: string }> {
  return store.writeLog.filter((w) => w.op === 'create' && w.path === COMPLETION_PATH);
}

function assignmentCompletedWrites(): Array<{ data: Record<string, unknown> }> {
  return store.writeLog.filter(
    (w) => w.op === 'update' && w.path === ASSIGNMENT_PATH && w.data.status === 'completed'
  );
}

function depthProgressWrites(): Array<{ data: Record<string, unknown> }> {
  return store.writeLog.filter(
    (w) => w.path === `couples/${COUPLE_ID}` && 'depth_progress' in w.data
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
// (1) Duplicate submissions from ONE user must not complete the prompt
// ---------------------------------------------------------------------------

describe('distinct-responder requirement', () => {
  it('two response docs from the SAME user do not create a completion', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    const dupe = makeResponse(USER_A, new Date('2026-07-09T10:00:05Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-1-dupe', dupe);
    seedBaseDocs({ response_count: 1, first_responder_id: USER_A, status: 'partial' });

    await wrapped(makeSnap(dupe));

    expect(store.docs.has(COMPLETION_PATH)).toBe(false);
    expect(completionCreates()).toHaveLength(0);
    expect(evaluateFollowUp).not.toHaveBeenCalled();
    expect(assignment().status).toBe('partial'); // never falsely completed
    // The duplicate doc (size 2, distinct 1) must not re-send the nudge.
    expect(partnerNudges()).toHaveLength(0);
  });

  it('a duplicate while the assignment is still delivered repairs it to partial without a duplicate nudge', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    const dupe = makeResponse(USER_A, new Date('2026-07-09T10:00:05Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-1-dupe', dupe);
    seedBaseDocs({ status: 'delivered', response_count: 0 });

    await wrapped(makeSnap(dupe));

    expect(assignment().status).toBe('partial');
    expect(assignment().response_count).toBe(1);
    expect(assignment().first_responder_id).toBe(USER_A);
    expect(store.docs.has(COMPLETION_PATH)).toBe(false);
    expect(partnerNudges()).toHaveLength(0);
  });

  it('a duplicate from user A followed by user B still completes with exactly 2 deduped responses', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    const dupe = makeResponse(USER_A, new Date('2026-07-09T10:00:05Z'));
    const second = makeResponse(USER_B, new Date('2026-07-09T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-1-dupe', dupe);
    seedResponseDoc('resp-2', second);
    seedBaseDocs({ response_count: 2, first_responder_id: USER_A, status: 'partial' });

    await wrapped(makeSnap(second));

    const completion = store.docs.get(COMPLETION_PATH) as Record<string, unknown>;
    expect(completion).toBeDefined();
    const responses = completion.responses as Array<{ user_id: string; submitted_at: Date }>;
    expect(responses).toHaveLength(2);
    expect(new Set(responses.map((r) => r.user_id))).toEqual(new Set([USER_A, USER_B]));
    // Earliest submission per user wins — the 10:00:00 doc, not the dupe.
    const userAResponse = responses.find((r) => r.user_id === USER_A)!;
    expect(userAResponse.submitted_at).toEqual(new Date('2026-07-09T10:00:00Z'));
    // time_to_complete measures first real response -> completion.
    expect(completion.time_to_complete_seconds).toBe(3600);
    expect(assignment().status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// (2) Assignment status back-write — the stranded-'partial' reveal race
// ---------------------------------------------------------------------------

describe('assignment finalization on completion', () => {
  function seedRacedPair(status: string) {
    // Both clients raced: each read response_count 0 and wrote 1/'partial',
    // so the assignment never reached 'completed' client-side.
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-09T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-2', second);
    seedBaseDocs({ response_count: 1, first_responder_id: USER_A, status });
    return { first, second };
  }

  it('repairs an assignment stranded at partial to completed with counts and timestamps', async () => {
    const { second } = seedRacedPair('partial');

    await wrapped(makeSnap(second));

    expect(completionCreates()).toHaveLength(1);
    expect(assignment().status).toBe('completed');
    expect(assignment().response_count).toBe(2);
    expect(assignment().completed_at).toBeTruthy();
    expect(assignment().second_response_at).toBeTruthy();
  });

  it('repairs an assignment stranded at delivered (both client writes lost)', async () => {
    const { second } = seedRacedPair('delivered');

    await wrapped(makeSnap(second));

    expect(assignment().status).toBe('completed');
    expect(assignment().response_count).toBe(2);
  });

  it('is idempotent: an assignment already completed by the client gets no status write', async () => {
    const { second } = seedRacedPair('completed');

    await wrapped(makeSnap(second));

    expect(completionCreates()).toHaveLength(1);
    expect(assignmentCompletedWrites()).toHaveLength(0);
  });

  it('is idempotent across a double-fire: exactly one status back-write', async () => {
    const { first, second } = seedRacedPair('partial');

    await wrapped(makeSnap(second));
    await wrapped(makeSnap(first)); // duplicate/late execution re-reads 'completed'

    expect(completionCreates()).toHaveLength(1);
    expect(assignmentCompletedWrites()).toHaveLength(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('event redelivery repairs a stranded assignment even when the completion doc already exists', async () => {
    // Crash scenario: a previous execution created the completion doc but
    // died before the assignment update. The redelivered event loses the
    // create() (ALREADY_EXISTS) but must still finalize the assignment.
    const { second } = seedRacedPair('partial');
    store.docs.set(COMPLETION_PATH, { assignment_id: ASSIGNMENT_ID });

    await wrapped(makeSnap(second));

    expect(assignment().status).toBe('completed');
    expect(assignment().response_count).toBe(2);
    // The loser skips completion-side effects: no duplicate stats/follow-up.
    expect(evaluateFollowUp).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('repairs a delivered assignment to partial when one distinct response exists', async () => {
    // Client status write lost: assignment still 'delivered' after response 1.
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedBaseDocs({ status: 'delivered', response_count: 0 });

    await wrapped(makeSnap(first));

    expect(assignment().status).toBe('partial');
    expect(assignment().response_count).toBe(1);
    expect(assignment().first_responder_id).toBe(USER_A);
    // Genuinely-first response doc: the nudge still fires exactly once.
    expect(partnerNudges()).toHaveLength(1);
    expect(partnerNudges()[0][0]).toBe(USER_B);
  });
});

// ---------------------------------------------------------------------------
// Depth bookkeeping is skipped for scale prompts (death-spiral companion fix)
// ---------------------------------------------------------------------------

describe('depth progression bookkeeping', () => {
  function seedCompletedPair(promptOverrides: Record<string, unknown>) {
    const first = makeResponse(USER_A, new Date('2026-07-09T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-09T11:00:00Z'));
    seedResponseDoc('resp-1', first);
    seedResponseDoc('resp-2', second);
    seedBaseDocs(
      { response_count: 2, first_responder_id: USER_A, status: 'completed' },
      promptOverrides
    );
    return second;
  }

  it('does not write depth_progress for a scale prompt completion', async () => {
    const second = seedCompletedPair({ response_format: 'scale' });

    await wrapped(makeSnap(second));

    expect(completionCreates()).toHaveLength(1);
    expect(depthProgressWrites()).toHaveLength(0);
  });

  it('still advances depth_progress for a legacy text prompt completion', async () => {
    const second = seedCompletedPair({
      response_format: 'text',
      type: 'love_map_update',
      emotional_depth: 'surface',
    });

    await wrapped(makeSnap(second));

    expect(completionCreates()).toHaveLength(1);
    expect(depthProgressWrites()).toHaveLength(1);
  });
});
