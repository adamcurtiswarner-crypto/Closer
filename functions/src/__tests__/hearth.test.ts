/**
 * Hearth feature tests.
 *
 * 1. Completion doc shape written by onResponseSubmitted:
 *    category / prompt_text / is_scale / per-response scores / signal,
 *    with discussed/discussed_at initialized ONLY for repair/divergence.
 * 2. computeCompletionSignal boundary matrix (reuses the follow-up
 *    thresholds/precedence — divergence > repair > deepener > steady).
 * 3. onCompletionDiscussed: first "we talked" mark pushes the partner with
 *    the category label; the second mark stamps discussed_at + logs
 *    completion_tended (no push); unrelated updates and the trigger's own
 *    discussed_at write are no-ops (no refire loop).
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// In-memory Firestore fake (same pattern as triggers.race.test.ts), injected
// via the shared module mock. Supports collection().doc().get/update/create
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

  const actual = jest.requireActual('../shared');

  return {
    db: { collection: makeCollection },
    __store: { docs, writeLog },
    __makeDocRef: makeDocRef,
    APP_NAME: 'Stoke',
    DEPTH_THRESHOLD: 3,
    DEEP_WEEK_FLOOR: 4,
    DEFAULT_SCALE_CONFIG: actual.DEFAULT_SCALE_CONFIG,
    CATEGORY_LABELS: actual.CATEGORY_LABELS,
    initializeDepthProgress: () => ({}),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../followUps', () => ({
  // Real pure helpers (evaluateFollowUpBranch, extractScores) power
  // computeCompletionSignal; only the side-effecting hook is stubbed.
  ...jest.requireActual('../followUps'),
  evaluateFollowUpOnCompletion: jest.fn().mockResolvedValue(undefined),
}));

import { onResponseSubmitted } from '../triggers';
import { onCompletionDiscussed, computeCompletionSignal, discussedKeysAdded } from '../hearth';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrappedSubmit = fft.wrap(onResponseSubmitted);
const wrappedDiscussed = fft.wrap(onCompletionDiscussed);

type FakeDocRef = {
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  update: (data: Record<string, unknown>) => Promise<void>;
};

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
  __makeDocRef: (path: string) => FakeDocRef;
}).__store;

const makeDocRef = (shared as unknown as { __makeDocRef: (path: string) => FakeDocRef })
  .__makeDocRef;

const sendPushNotification = shared.sendPushNotification as unknown as jest.Mock;
const logEvent = shared.logEvent as unknown as jest.Mock;
const reportError = shared.reportError as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ASSIGNMENT_ID = 'assign-1';
const COUPLE_ID = 'couple-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const PROMPT_ID = 'prompt-1';
const COMPLETION_PATH = `prompt_completions/${ASSIGNMENT_ID}`;

function makeResponse(
  userId: string,
  submittedAt: Date,
  score: number | null = null
): Record<string, unknown> {
  return {
    assignment_id: ASSIGNMENT_ID,
    couple_id: COUPLE_ID,
    user_id: userId,
    prompt_id: PROMPT_ID,
    response_text: 'a thoughtful answer',
    response_score: score,
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
    category: 'money',
    prompt_text: 'How connected do you feel about money right now?',
    status: 'completed',
    response_count: 2,
    first_responder_id: USER_A,
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

/** Seeds both responses and runs the completion trigger once. */
async function runCompletion(
  scoreA: number | null,
  scoreB: number | null,
  assignmentOverrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  seedBaseDocs(assignmentOverrides);
  const first = makeResponse(USER_A, new Date('2026-07-05T10:00:00Z'), scoreA);
  const second = makeResponse(USER_B, new Date('2026-07-05T11:00:00Z'), scoreB);
  store.docs.set('prompt_responses/resp-1', first);
  store.docs.set('prompt_responses/resp-2', second);
  await wrappedSubmit(makeSnap(second));
  return store.docs.get(COMPLETION_PATH) as Record<string, unknown>;
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
// 1. Completion doc shape (onResponseSubmitted)
// ---------------------------------------------------------------------------

describe('onResponseSubmitted completion doc (Hearth fields)', () => {
  it('scale completion carries category, prompt_text, is_scale, embedded scores, and signal', async () => {
    const completion = await runCompletion(9, 9);

    expect(completion).toBeDefined();
    expect(completion.category).toBe('money');
    expect(completion.prompt_text).toBe('How connected do you feel about money right now?');
    expect(completion.is_scale).toBe(true);
    expect(completion.signal).toBe('deepener');

    const responses = completion.responses as Array<Record<string, unknown>>;
    expect(responses).toHaveLength(2);
    const scores = responses.map((r) => r.response_score).sort();
    expect(scores).toEqual([9, 9]);
    for (const r of responses) {
      expect(r).toHaveProperty('user_id');
      expect(r).toHaveProperty('response_text');
      expect(r).toHaveProperty('image_url');
      expect(r).toHaveProperty('submitted_at');
    }
  });

  it('text completion gets is_scale false, null scores, and null signal', async () => {
    const completion = await runCompletion(null, null, { response_format: 'text' });

    expect(completion.is_scale).toBe(false);
    expect(completion.signal).toBeNull();
    const responses = completion.responses as Array<Record<string, unknown>>;
    expect(responses.map((r) => r.response_score)).toEqual([null, null]);
    // No tending ritual for text completions.
    expect(completion).not.toHaveProperty('discussed');
    expect(completion).not.toHaveProperty('discussed_at');
  });

  it('scale completion missing a score gets null signal (cannot evaluate)', async () => {
    const completion = await runCompletion(7, null);
    expect(completion.is_scale).toBe(true);
    expect(completion.signal).toBeNull();
    expect(completion).not.toHaveProperty('discussed');
  });

  describe('discussed / discussed_at initialization', () => {
    it('repair completion initializes discussed {} and discussed_at null', async () => {
      const completion = await runCompletion(4, 6); // gap 2, min 4 -> repair
      expect(completion.signal).toBe('repair');
      expect(completion.discussed).toEqual({});
      expect(completion.discussed_at).toBeNull();
    });

    it('divergence completion initializes discussed {} and discussed_at null', async () => {
      const completion = await runCompletion(2, 8); // gap 6 -> divergence
      expect(completion.signal).toBe('divergence');
      expect(completion.discussed).toEqual({});
      expect(completion.discussed_at).toBeNull();
    });

    it('deepener completion does NOT get discussed fields', async () => {
      const completion = await runCompletion(10, 9);
      expect(completion.signal).toBe('deepener');
      expect(completion).not.toHaveProperty('discussed');
      expect(completion).not.toHaveProperty('discussed_at');
    });

    it('steady completion does NOT get discussed fields', async () => {
      const completion = await runCompletion(6, 7);
      expect(completion.signal).toBe('steady');
      expect(completion).not.toHaveProperty('discussed');
      expect(completion).not.toHaveProperty('discussed_at');
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Signal boundary matrix (pure)
// ---------------------------------------------------------------------------

describe('computeCompletionSignal boundary matrix', () => {
  const signalFor = (a: number, b: number) =>
    computeCompletionSignal(true, [{ response_score: a }, { response_score: b }]);

  it('2/8 -> divergence (gap 6 >= 4, wins over repair min 2)', () => {
    expect(signalFor(2, 8)).toBe('divergence');
  });

  it('4/6 -> repair (gap 2 < 4, min 4 <= 4)', () => {
    expect(signalFor(4, 6)).toBe('repair');
  });

  it('3/4 -> repair (gap 1, min 3 <= 4)', () => {
    expect(signalFor(3, 4)).toBe('repair');
  });

  it('9/9 -> deepener (both >= 9)', () => {
    expect(signalFor(9, 9)).toBe('deepener');
  });

  it('9/6 -> steady (gap 3, min 6 > 4, not both >= 9)', () => {
    expect(signalFor(9, 6)).toBe('steady');
  });

  it('6/7 -> steady', () => {
    expect(signalFor(6, 7)).toBe('steady');
  });

  it('non-scale -> null regardless of scores', () => {
    expect(
      computeCompletionSignal(false, [{ response_score: 2 }, { response_score: 8 }])
    ).toBeNull();
  });

  it('scale with fewer than two scores -> null', () => {
    expect(computeCompletionSignal(true, [{ response_score: 5 }])).toBeNull();
    expect(
      computeCompletionSignal(true, [{ response_score: 5 }, { response_score: null }])
    ).toBeNull();
  });
});

describe('discussedKeysAdded', () => {
  it('returns only newly added uid keys', () => {
    expect(discussedKeysAdded({}, { a: 1 })).toEqual(['a']);
    expect(discussedKeysAdded({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
    expect(discussedKeysAdded({ a: 1 }, { a: 1 })).toEqual([]);
    expect(discussedKeysAdded({ a: 1 }, { a: 2 })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. onCompletionDiscussed trigger
// ---------------------------------------------------------------------------

function makeChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): never {
  return {
    before: { data: () => before },
    after: { data: () => after, ref: makeDocRef(COMPLETION_PATH) },
  } as never;
}

function baseCompletion(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    assignment_id: ASSIGNMENT_ID,
    couple_id: COUPLE_ID,
    category: 'conflict_repair',
    prompt_text: 'How are you two finding your way back?',
    is_scale: true,
    signal: 'repair',
    discussed: {},
    discussed_at: null,
    ...overrides,
  };
}

function seedCoupleAndUsers(): void {
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
  });
  store.docs.set(`users/${USER_A}`, { display_name: 'Alex' });
  store.docs.set(`users/${USER_B}`, { display_name: 'Blake' });
}

const context = { params: { completionId: ASSIGNMENT_ID } };

describe('onCompletionDiscussed', () => {
  it('first mark sends the partner a push with the category label and no discussed_at', async () => {
    seedCoupleAndUsers();
    const before = baseCompletion();
    const after = baseCompletion({ discussed: { [USER_A]: new Date() } });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_B,
      {
        title: 'Alex',
        body: "says you two talked about Conflict and repair. Mark it too, and it's tended.",
      },
      { type: 'hearth' }
    );
    // No tended event, no discussed_at write on the first mark.
    expect(logEvent).not.toHaveBeenCalled();
    const doc = store.docs.get(COMPLETION_PATH)!;
    expect(doc.discussed_at).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('falls back to "it" for an unknown category', async () => {
    seedCoupleAndUsers();
    const before = baseCompletion({ category: 'legacy_whatever' });
    const after = baseCompletion({
      category: 'legacy_whatever',
      discussed: { [USER_A]: new Date() },
    });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_B,
      expect.objectContaining({
        body: "says you two talked about it. Mark it too, and it's tended.",
      }),
      { type: 'hearth' }
    );
  });

  it('second mark stamps discussed_at, logs completion_tended, and sends no push', async () => {
    seedCoupleAndUsers();
    const before = baseCompletion({ discussed: { [USER_A]: new Date() } });
    const after = baseCompletion({
      discussed: { [USER_A]: new Date(), [USER_B]: new Date() },
    });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).not.toHaveBeenCalled();
    const updates = store.writeLog.filter(
      (w) => w.op === 'update' && w.path === COMPLETION_PATH && 'discussed_at' in w.data
    );
    expect(updates).toHaveLength(1);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith('completion_tended', USER_B, COUPLE_ID, {
      completion_id: ASSIGNMENT_ID,
      couple_id: COUPLE_ID,
      category: 'conflict_repair',
      signal: 'repair',
    });
    expect(reportError).not.toHaveBeenCalled();
  });

  it('no discussed change (e.g. a reaction update) is a no-op', async () => {
    seedCoupleAndUsers();
    const before = baseCompletion({ discussed: { [USER_A]: new Date() } });
    const after = baseCompletion({
      discussed: { [USER_A]: new Date() },
      reactions: { [USER_B]: 'heart' },
    });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(store.writeLog).toHaveLength(0);
  });

  it("the trigger's own discussed_at write does not loop (discussed unchanged)", async () => {
    seedCoupleAndUsers();
    const marks = { [USER_A]: new Date(), [USER_B]: new Date() };
    const before = baseCompletion({ discussed: marks });
    const after = baseCompletion({ discussed: marks, discussed_at: new Date() });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(store.writeLog).toHaveLength(0);
  });

  it('is idempotent when discussed_at is already set on a both-marked refire', async () => {
    seedCoupleAndUsers();
    // Refire/replay of the second-mark event where discussed_at already landed.
    const before = baseCompletion({ discussed: { [USER_A]: new Date() } });
    const after = baseCompletion({
      discussed: { [USER_A]: new Date(), [USER_B]: new Date() },
      discussed_at: new Date(),
    });
    store.docs.set(COMPLETION_PATH, after);

    await wrappedDiscussed(makeChange(before, after), context);

    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(store.writeLog).toHaveLength(0);
  });
});
