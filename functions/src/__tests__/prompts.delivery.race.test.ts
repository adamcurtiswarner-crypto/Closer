/**
 * Race-condition regression tests for daily prompt delivery (prompts.ts).
 *
 * The P0 being locked down (verified in prod 2026-07-12): a fresh couple got
 * TWO daily assignments created 541ms apart for the same assigned_date — the
 * START NOW button and the Today auto-trigger both fired triggerPromptDelivery
 * at pairing. deliverPromptToCouple's shouldDeliverDaily guard is a
 * check-then-add window query, non-transactional, and a sub-second race beats
 * it: both calls read an empty window, both created an assignment, and the
 * second question instantly displaced the couple's FIRST unviewed reveal.
 *
 * Fix under test: the daily assignment doc uses the DETERMINISTIC id
 * `${coupleId}_${assigned_date}` and is written with `.create()` — Firestore
 * itself rejects the race loser with ALREADY_EXISTS, which returns silently
 * (no duplicate doc, no duplicate pushes, no reportError spam).
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// In-memory Firestore fake, injected via the shared module mock. Supports the
// surface deliverPromptToCouple + selectPromptForCouple use:
// collection().doc().get/update/create and chained where('==' | '>=' | '<=')
// queries. create() is atomic first-writer-wins (the synchronous has-check
// happens before any interleaving point), mirroring Firestore semantics.
// ---------------------------------------------------------------------------

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();
  const writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }> = [];
  /** Doc paths whose next create() throws a NON-already-exists error. */
  const failCreates = new Set<string>();

  const OPS: Record<string, (a: unknown, b: unknown) => boolean> = {
    '==': (a, b) => a === b,
    '>=': (a, b) => typeof a === 'string' && typeof b === 'string' && a >= b,
    '<=': (a, b) => typeof a === 'string' && typeof b === 'string' && a <= b,
  };

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop(),
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
    create: async (data: Record<string, unknown>) => {
      if (failCreates.has(path)) {
        failCreates.delete(path);
        throw new Error('13 INTERNAL: simulated backend failure');
      }
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

  const makeQuery = (
    name: string,
    filters: Array<[string, string, unknown]>
  ) => ({
    where: (field: string, op: string, value: unknown) =>
      makeQuery(name, [...filters, [field, op, value]]),
    get: async () => {
      const matched = [...docs.entries()]
        .filter(([path]) => path.startsWith(`${name}/`) && !path.slice(name.length + 1).includes('/'))
        .filter(([, data]) =>
          filters.every(([field, op, value]) => OPS[op]?.(data[field], value))
        )
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
    where: (field: string, op: string, value: unknown) =>
      makeQuery(name, [[field, op, value]]),
    add: async (data: Record<string, unknown>) => {
      const id = `auto-${writeLog.length}`;
      writeLog.push({ op: 'add', path: `${name}/${id}`, data });
      docs.set(`${name}/${id}`, { ...data });
      return makeDocRef(`${name}/${id}`);
    },
  });

  return {
    db: { collection: makeCollection },
    __store: { docs, writeLog, failCreates },
    APP_NAME: 'Stoke',
    TONE_WEIGHTS: {},
    PULSE_WEIGHTS: { steady: {} },
    DEFAULT_SCALE_CONFIG: { min: 1, max: 10 },
    getEffectiveTone: () => 'solid',
    initializeDepthProgress: () => ({}),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    enforceRateLimit: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

// The follow-up activation path is its own creation flow (followUps.ts) and
// out of scope here — no scheduled follow-up is ever due in these tests.
jest.mock('../followUps', () => ({
  ...jest.requireActual('../followUps'),
  activateDueFollowUp: jest.fn().mockResolvedValue(null),
}));

import {
  deliverPromptToCouple,
  dailyAssignmentId,
  isAlreadyExistsError,
  assignmentDateWindow,
} from '../prompts';
import * as shared from '../shared';

const fft = functionsTest.default();

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
    failCreates: Set<string>;
  };
}).__store;

const sendPushNotification = shared.sendPushNotification as jest.Mock;
const reportError = shared.reportError as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COUPLE_ID = 'couple-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const TZ = 'America/New_York';
const TODAY = assignmentDateWindow(TZ).today;
const EXPECTED_DOC_PATH = `prompt_assignments/${dailyAssignmentId(COUPLE_ID, TODAY)}`;

function seedFreshCouple(): void {
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
    linked_at: { toDate: () => new Date() },
    depth_progress: { communication: { level: 'surface' } },
    current_pulse_tier: 'steady',
  });
  store.docs.set('prompts/prompt-1', {
    status: 'active',
    response_format: 'scale',
    text: 'How connected did you feel today?',
    hint: null,
    type: 'connection',
    requires_conversation: false,
    category: 'connection',
    scale_config: null,
  });
}

function dailyAssignmentDocs(): Array<[string, Record<string, unknown>]> {
  return [...store.docs.entries()].filter(
    ([path, data]) =>
      path.startsWith('prompt_assignments/') && data.assignment_kind === 'daily'
  );
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  store.failCreates.clear();
  jest.clearAllMocks();
  seedFreshCouple();
});

afterAll(() => {
  fft.cleanup();
});

// ---------------------------------------------------------------------------
// Deterministic id scheme
// ---------------------------------------------------------------------------

describe('dailyAssignmentId', () => {
  it('is `${coupleId}_${assignedDate}` — one daily doc per couple per local day', () => {
    expect(dailyAssignmentId('couple-1', '2026-07-12')).toBe('couple-1_2026-07-12');
  });

  it('distinct couples and distinct days never collide', () => {
    const ids = new Set([
      dailyAssignmentId('couple-1', '2026-07-12'),
      dailyAssignmentId('couple-1', '2026-07-13'),
      dailyAssignmentId('couple-2', '2026-07-12'),
    ]);
    expect(ids.size).toBe(3);
  });
});

describe('isAlreadyExistsError', () => {
  it('recognizes the admin SDK numeric gRPC code 6', () => {
    const err = new Error('6 ALREADY_EXISTS: Document already exists');
    (err as Error & { code: number }).code = 6;
    expect(isAlreadyExistsError(err)).toBe(true);
  });

  it('recognizes the string code form', () => {
    const err = new Error('already exists');
    (err as Error & { code: string }).code = 'already-exists';
    expect(isAlreadyExistsError(err)).toBe(true);
  });

  it('recognizes ALREADY_EXISTS in the message when no code is present', () => {
    expect(isAlreadyExistsError(new Error('ALREADY_EXISTS: nope'))).toBe(true);
  });

  it('rejects other Firestore errors and non-errors', () => {
    const internal = new Error('13 INTERNAL: backend failure');
    (internal as Error & { code: number }).code = 13;
    expect(isAlreadyExistsError(internal)).toBe(false);
    expect(isAlreadyExistsError(new Error('permission denied'))).toBe(false);
    expect(isAlreadyExistsError(null)).toBe(false);
    expect(isAlreadyExistsError(undefined)).toBe(false);
    expect(isAlreadyExistsError('ALREADY_EXISTS')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The prod race: two concurrent deliveries at pairing
// ---------------------------------------------------------------------------

describe('deliverPromptToCouple — concurrent double-delivery race (P0)', () => {
  it('two concurrent calls create exactly ONE daily assignment, at the deterministic id', async () => {
    // Both calls pass the check-then-add window query (both read an empty
    // window before either create lands) — exactly the prod interleaving.
    await Promise.all([
      deliverPromptToCouple(COUPLE_ID, TZ),
      deliverPromptToCouple(COUPLE_ID, TZ),
    ]);

    const dailies = dailyAssignmentDocs();
    expect(dailies).toHaveLength(1);
    expect(dailies[0][0]).toBe(EXPECTED_DOC_PATH);
    expect(dailies[0][1].assigned_date).toBe(TODAY);
    expect(dailies[0][1].couple_id).toBe(COUPLE_ID);
    expect(dailies[0][1].source).toBe('daily');
    expect(dailies[0][1].status).toBe('delivered');
  });

  it('the loser resolves silently — no thrown error, no reportError spam', async () => {
    await expect(
      Promise.all([
        deliverPromptToCouple(COUPLE_ID, TZ),
        deliverPromptToCouple(COUPLE_ID, TZ),
      ])
    ).resolves.toBeDefined();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('only the winner pushes — both partners notified exactly once', async () => {
    await Promise.all([
      deliverPromptToCouple(COUPLE_ID, TZ),
      deliverPromptToCouple(COUPLE_ID, TZ),
    ]);

    expect(sendPushNotification).toHaveBeenCalledTimes(2);
    const notified = sendPushNotification.mock.calls.map((c) => c[0]).sort();
    expect(notified).toEqual([USER_A, USER_B]);
    // Payload unchanged by the fix
    expect(sendPushNotification.mock.calls[0][1]).toEqual({
      title: 'Stoke',
      body: "Today's prompt is ready.",
    });
    expect(sendPushNotification.mock.calls[0][2]).toEqual({ type: 'prompt' });
  });

  it('a sequential second call is stopped by the cheap shouldDeliverDaily guard (no create attempt)', async () => {
    await deliverPromptToCouple(COUPLE_ID, TZ);
    const createsAfterFirst = store.writeLog.filter((w) => w.op === 'create').length;

    await deliverPromptToCouple(COUPLE_ID, TZ);

    expect(store.writeLog.filter((w) => w.op === 'create')).toHaveLength(createsAfterFirst);
    expect(dailyAssignmentDocs()).toHaveLength(1);
    expect(sendPushNotification).toHaveBeenCalledTimes(2); // first call only
  });

  it('a single delivery writes the deterministic id and the unchanged payload shape', async () => {
    await deliverPromptToCouple(COUPLE_ID, TZ);

    const [path, data] = dailyAssignmentDocs()[0];
    expect(path).toBe(EXPECTED_DOC_PATH);
    expect(data).toMatchObject({
      couple_id: COUPLE_ID,
      prompt_id: 'prompt-1',
      prompt_text: 'How connected did you feel today?',
      assignment_kind: 'daily',
      assigned_date: TODAY,
      source: 'daily',
      status: 'delivered',
      response_count: 0,
      delivery_timezone: TZ,
    });
  });

  it('non-ALREADY_EXISTS create failures still propagate to the caller', async () => {
    store.failCreates.add(EXPECTED_DOC_PATH);
    await expect(deliverPromptToCouple(COUPLE_ID, TZ)).rejects.toThrow('INTERNAL');
    // And no pushes went out for the failed delivery
    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});
