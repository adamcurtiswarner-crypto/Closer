/**
 * Unit tests for revenueCatWebhook (admin.ts) — SEV-0 #9 fail-closed contract.
 *
 * Security contract:
 *   - Missing/empty REVENUECAT_WEBHOOK_KEY → 500 + reportError (fail CLOSED).
 *     The old `if (expectedKey && ...)` guard accepted forged events whenever
 *     the key was unconfigured.
 *   - Wrong or missing Authorization header → 401.
 *   - Correct bearer key → 200 and the entitlement/event branches run.
 */

const mockSubscriptionSet = jest.fn();
const mockUserGet = jest.fn();
const mockCoupleUpdate = jest.fn();
const mockErrorLogAdd = jest.fn();

jest.mock('firebase-admin', () => {
  const firestoreFn = jest.fn(() => ({
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => ({
        get: name === 'users' ? mockUserGet : jest.fn(),
        set: name === 'subscriptions' ? mockSubscriptionSet : jest.fn(),
        update: name === 'couples' ? mockCoupleUpdate : jest.fn(),
      })),
      add: name === 'error_logs' ? mockErrorLogAdd : jest.fn(),
    })),
  })) as jest.Mock & {
    FieldValue: Record<string, unknown>;
    Timestamp: Record<string, unknown>;
  };
  firestoreFn.FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    arrayRemove: (...tokens: unknown[]) => ({ __op: 'arrayRemove', tokens }),
  };
  firestoreFn.Timestamp = {
    fromMillis: (ms: number) => ({ __ms: ms, toDate: () => new Date(ms) }),
    fromDate: (d: Date) => ({ __ms: d.getTime(), toDate: () => d }),
  };
  return {
    initializeApp: jest.fn(),
    firestore: firestoreFn,
    messaging: jest.fn(() => ({ sendEach: jest.fn() })),
  };
});

import * as functionsTest from 'firebase-functions-test';

const test = functionsTest.default();
// Make functions.config() readable outside the Functions runtime; the
// webhook only consults it when the env var is missing.
test.mockConfig({});

import { revenueCatWebhook } from '../admin';

const WEBHOOK_KEY = 'test-webhook-secret';

interface MockResponse {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  send: (payload: unknown) => MockResponse;
}

function createRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    send(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function createReq(overrides: {
  method?: string;
  authorization?: string;
  body?: unknown;
}): { method: string; headers: Record<string, string | undefined>; body: unknown } {
  return {
    method: overrides.method ?? 'POST',
    headers: { authorization: overrides.authorization },
    body: overrides.body,
  };
}

async function invoke(req: unknown, res: MockResponse): Promise<void> {
  await (revenueCatWebhook as unknown as (
    req: unknown,
    res: unknown
  ) => Promise<void>)(req, res);
}

function eventBody(
  type: string,
  extras: Record<string, unknown> = {}
): { event: Record<string, unknown> } {
  return {
    event: { type, app_user_id: 'user-1', store: 'APP_STORE', ...extras },
  };
}

function authedReq(body: unknown): ReturnType<typeof createReq> {
  return createReq({ authorization: `Bearer ${WEBHOOK_KEY}`, body });
}

function userWithCouple(coupleId: string | null): void {
  mockUserGet.mockResolvedValue({
    exists: true,
    data: () => ({ couple_id: coupleId }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REVENUECAT_WEBHOOK_KEY = WEBHOOK_KEY;
  mockSubscriptionSet.mockResolvedValue(undefined);
  mockCoupleUpdate.mockResolvedValue(undefined);
  mockErrorLogAdd.mockResolvedValue(undefined);
  userWithCouple('couple-1');
});

afterEach(() => {
  delete process.env.REVENUECAT_WEBHOOK_KEY;
});

afterAll(() => {
  test.cleanup();
});

describe('revenueCatWebhook — fail closed on missing key (SEV-0 #9)', () => {
  it('rejects with 500 when REVENUECAT_WEBHOOK_KEY is unset, even with a header', async () => {
    delete process.env.REVENUECAT_WEBHOOK_KEY;
    const res = createRes();

    await invoke(
      createReq({
        authorization: 'Bearer forged-key',
        body: eventBody('INITIAL_PURCHASE'),
      }),
      res
    );

    expect(res.statusCode).toBe(500);
    expect(mockSubscriptionSet).not.toHaveBeenCalled();
    expect(mockCoupleUpdate).not.toHaveBeenCalled();
  });

  it('rejects with 500 when the key is an empty string', async () => {
    process.env.REVENUECAT_WEBHOOK_KEY = '';
    const res = createRes();

    await invoke(
      createReq({ authorization: 'Bearer ', body: eventBody('RENEWAL') }),
      res
    );

    expect(res.statusCode).toBe(500);
    expect(mockSubscriptionSet).not.toHaveBeenCalled();
  });

  it('reports the misconfiguration to error_logs for alerting', async () => {
    delete process.env.REVENUECAT_WEBHOOK_KEY;
    const res = createRes();

    await invoke(createReq({ body: eventBody('INITIAL_PURCHASE') }), res);

    expect(mockErrorLogAdd).toHaveBeenCalledTimes(1);
    expect(mockErrorLogAdd.mock.calls[0][0]).toMatchObject({
      function_name: 'revenueCatWebhook',
      message: expect.stringContaining('REVENUECAT_WEBHOOK_KEY'),
    });
  });
});

describe('revenueCatWebhook — auth header validation', () => {
  it('rejects a wrong bearer key with 401', async () => {
    const res = createRes();

    await invoke(
      createReq({
        authorization: 'Bearer wrong-key',
        body: eventBody('INITIAL_PURCHASE'),
      }),
      res
    );

    expect(res.statusCode).toBe(401);
    expect(mockSubscriptionSet).not.toHaveBeenCalled();
  });

  it('rejects a missing Authorization header with 401', async () => {
    const res = createRes();

    await invoke(createReq({ body: eventBody('RENEWAL') }), res);

    expect(res.statusCode).toBe(401);
    expect(mockSubscriptionSet).not.toHaveBeenCalled();
  });

  it('rejects a key without the Bearer prefix with 401', async () => {
    const res = createRes();

    await invoke(
      createReq({ authorization: WEBHOOK_KEY, body: eventBody('RENEWAL') }),
      res
    );

    expect(res.statusCode).toBe(401);
  });

  it('rejects non-POST methods with 405', async () => {
    const res = createRes();

    await invoke(createReq({ method: 'GET' }), res);

    expect(res.statusCode).toBe(405);
  });
});

describe('revenueCatWebhook — payload validation (authenticated)', () => {
  it('rejects a body without an event with 400', async () => {
    const res = createRes();

    await invoke(authedReq({}), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('Missing event');
  });

  it('rejects an event without app_user_id with 400', async () => {
    const res = createRes();

    await invoke(authedReq({ event: { type: 'RENEWAL' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('Missing app_user_id');
  });
});

describe('revenueCatWebhook — entitlement event branches (authenticated)', () => {
  const EXPIRATION_MS = 1799999999000;

  it.each(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'])(
    '%s activates the subscription and stamps couple premium_until',
    async (type) => {
      const res = createRes();

      await invoke(
        authedReq(eventBody(type, { expiration_at_ms: EXPIRATION_MS })),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockSubscriptionSet).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          couple_id: 'couple-1',
          status: 'active',
          plan: 'premium',
          platform: 'APP_STORE',
          expires_at: expect.objectContaining({ __ms: EXPIRATION_MS }),
        }),
        { merge: true }
      );
      expect(mockCoupleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          premium_until: expect.objectContaining({ __ms: EXPIRATION_MS }),
          premium_source: 'user-1',
        })
      );
    }
  );

  it('CANCELLATION marks the subscription cancelled without touching premium_until', async () => {
    const res = createRes();

    await invoke(authedReq(eventBody('CANCELLATION')), res);

    expect(res.statusCode).toBe(200);
    expect(mockSubscriptionSet).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', status: 'cancelled' }),
      { merge: true }
    );
    expect(mockCoupleUpdate).not.toHaveBeenCalled();
  });

  it('EXPIRATION marks the subscription expired and lets premium lapse naturally', async () => {
    const res = createRes();

    await invoke(authedReq(eventBody('EXPIRATION')), res);

    expect(res.statusCode).toBe(200);
    expect(mockSubscriptionSet).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', status: 'expired' }),
      { merge: true }
    );
    expect(mockCoupleUpdate).not.toHaveBeenCalled();
  });

  it('ignores unknown event types but still returns 200', async () => {
    const res = createRes();

    await invoke(authedReq(eventBody('TRANSFER')), res);

    expect(res.statusCode).toBe(200);
    expect(mockSubscriptionSet).not.toHaveBeenCalled();
    expect(mockCoupleUpdate).not.toHaveBeenCalled();
  });

  it('handles a purchaser without a couple: subscription saved, no couple update', async () => {
    userWithCouple(null);
    const res = createRes();

    await invoke(
      authedReq(eventBody('INITIAL_PURCHASE', { expiration_at_ms: EXPIRATION_MS })),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mockSubscriptionSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', couple_id: null }),
      { merge: true }
    );
    expect(mockCoupleUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 and reports the error when Firestore fails mid-handler', async () => {
    mockSubscriptionSet.mockRejectedValue(new Error('firestore down'));
    const res = createRes();

    await invoke(authedReq(eventBody('RENEWAL')), res);

    expect(res.statusCode).toBe(500);
    expect(mockErrorLogAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        function_name: 'revenueCatWebhook',
        message: 'firestore down',
      })
    );
  });
});
