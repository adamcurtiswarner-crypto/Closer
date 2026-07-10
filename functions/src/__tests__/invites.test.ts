/**
 * acceptInvite callable tests (SEV-0 #4 — invite enumeration fix).
 *
 * Clients can no longer read/update invites they didn't create; the whole
 * join happens server-side. These tests cover: the happy path (member added,
 * couple activated, invite consumed, claims set for BOTH members), wrong
 * code, own invite, already-used, expired, malformed input, already-active
 * caller, and a couple in an invalid state.
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// firebase-admin mock: auth() for custom claims, firestore statics for
// FieldValue/Timestamp sentinels.
// ---------------------------------------------------------------------------

jest.mock('firebase-admin', () => {
  const authMock = {
    getUser: jest.fn(),
    setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };
  const fileMock = { delete: jest.fn().mockResolvedValue(undefined) };
  return {
    initializeApp: jest.fn(),
    credential: { applicationDefault: jest.fn() },
    auth: () => authMock,
    storage: () => ({ bucket: () => ({ file: () => fileMock }) }),
    firestore: Object.assign(jest.fn(), {
      FieldValue: {
        serverTimestamp: () => 'SERVER_TIMESTAMP',
        arrayRemove: (...args: unknown[]) => ({ __arrayRemove: args }),
      },
      Timestamp: {
        now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
        fromDate: (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }),
      },
      FieldPath: { documentId: () => '__name__' },
    }),
    __authMock: authMock,
  };
});

// ---------------------------------------------------------------------------
// In-memory Firestore fake (same pattern as hearth.test.ts) injected via the
// shared module mock, extended with runTransaction support.
// ---------------------------------------------------------------------------

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();
  const writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }> = [];

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string): Record<string, unknown> => ({
    id: path.split('/').pop(),
    __path: path,
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
    set: async (data: Record<string, unknown>) => {
      writeLog.push({ op: 'set', path, data });
      docs.set(path, { ...data });
    },
    update: async (data: Record<string, unknown>) => {
      writeLog.push({ op: 'update', path, data });
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
    delete: async () => {
      writeLog.push({ op: 'delete', path, data: {} });
      docs.delete(path);
    },
    collection: (sub: string) => makeCollection(`${path}/${sub}`),
  });

  const compare = (op: string, docValue: unknown, value: unknown): boolean => {
    if (op === '==') return docValue === value;
    if (op === '<=') {
      const a = (docValue as { toMillis?: () => number })?.toMillis?.() ?? (docValue as number);
      const b = (value as { toMillis?: () => number })?.toMillis?.() ?? (value as number);
      return a <= b;
    }
    throw new Error(`Unsupported op in fake query: ${op}`);
  };

  const makeQuery = (name: string, filters: Array<[string, string, unknown]>) => ({
    where: (field: string, op: string, value: unknown) =>
      makeQuery(name, [...filters, [field, op, value]]),
    get: async () => {
      const matched = [...docs.entries()]
        .filter(
          ([path]) =>
            path.startsWith(`${name}/`) && segmentCount(path) === segmentCount(name) + 1
        )
        .filter(([, data]) => filters.every(([field, op, value]) => compare(op, data[field], value)))
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
    where: (field: string, op: string, value: unknown) => makeQuery(name, [[field, op, value]]),
  });

  type FakeTxnRef = { get: () => Promise<unknown>; update: (d: Record<string, unknown>) => Promise<void> };
  const runTransaction = async <T>(fn: (txn: unknown) => Promise<T>): Promise<T> => {
    const txn = {
      get: (ref: FakeTxnRef) => ref.get(),
      // The fake ref's update applies synchronously (no awaits before the
      // write), so fire-and-forget matches transaction commit semantics here.
      update: (ref: FakeTxnRef, data: Record<string, unknown>) => {
        void ref.update(data);
      },
    };
    return fn(txn);
  };

  const actual = jest.requireActual('../shared');

  return {
    db: { collection: makeCollection, runTransaction },
    __store: { docs, writeLog },
    APP_NAME: 'Stoke',
    getWeekId: actual.getWeekId,
    enforceRateLimit: jest.fn().mockResolvedValue(undefined),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

import * as admin from 'firebase-admin';
import { acceptInvite } from '../invites';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrappedAccept = fft.wrap(acceptInvite);

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
}).__store;

const authMock = (admin as unknown as {
  __authMock: { getUser: jest.Mock; setCustomUserClaims: jest.Mock };
}).__authMock;

const logEvent = shared.logEvent as unknown as jest.Mock;
const enforceRateLimit = shared.enforceRateLimit as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INVITER = 'user-inviter';
const ACCEPTOR = 'user-acceptor';
const COUPLE_ID = 'couple-1';
const CODE = 'ABC234';

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
const asTimestamp = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });

function seedHappyPath(): void {
  store.docs.set(`users/${INVITER}`, {
    email: 'inviter@example.com',
    couple_id: COUPLE_ID,
  });
  store.docs.set(`users/${ACCEPTOR}`, {
    email: 'acceptor@example.com',
    couple_id: null,
  });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [INVITER],
    member_emails: ['inviter@example.com'],
    status: 'pending',
  });
  store.docs.set(`couple_invites/${CODE}`, {
    invite_code: CODE,
    inviter_id: INVITER,
    couple_id: COUPLE_ID,
    status: 'pending',
    expires_at: asTimestamp(futureDate),
  });
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  jest.clearAllMocks();
  authMock.getUser.mockResolvedValue({ customClaims: {} });
  authMock.setCustomUserClaims.mockResolvedValue(undefined);
  enforceRateLimit.mockResolvedValue(undefined);
});

afterAll(() => {
  fft.cleanup();
});

const callAs = (uid: string, code: unknown) =>
  wrappedAccept({ code }, { auth: { uid } });

describe('acceptInvite', () => {
  it('joins the caller to the pending couple and returns coupleId', async () => {
    seedHappyPath();

    const result = await callAs(ACCEPTOR, CODE);
    expect(result).toEqual({ coupleId: COUPLE_ID });

    const couple = store.docs.get(`couples/${COUPLE_ID}`)!;
    expect(couple.status).toBe('active');
    expect(couple.member_ids).toEqual([INVITER, ACCEPTOR]);
    expect(couple.member_emails).toEqual(['inviter@example.com', 'acceptor@example.com']);
    expect(couple.linked_at).toBe('SERVER_TIMESTAMP');
    expect(couple.cohort_week).toMatch(/^\d{4}-W\d{2}$/);

    const invite = store.docs.get(`couple_invites/${CODE}`)!;
    expect(invite.status).toBe('accepted');
    expect(invite.accepted_by).toBe(ACCEPTOR);

    expect(store.docs.get(`users/${ACCEPTOR}`)!.couple_id).toBe(COUPLE_ID);
    expect(logEvent).toHaveBeenCalledWith('couple_linked', ACCEPTOR, COUPLE_ID, {
      invite_code: CODE,
    });
  });

  it('sets the coupleId custom claim for BOTH members', async () => {
    seedHappyPath();
    authMock.getUser.mockResolvedValue({ customClaims: { existing: true } });

    await callAs(ACCEPTOR, CODE);

    expect(authMock.setCustomUserClaims).toHaveBeenCalledTimes(2);
    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(INVITER, {
      existing: true,
      coupleId: COUPLE_ID,
    });
    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(ACCEPTOR, {
      existing: true,
      coupleId: COUPLE_ID,
    });
  });

  it('accepts a lowercase code (normalizes to uppercase)', async () => {
    seedHappyPath();
    const result = await callAs(ACCEPTOR, CODE.toLowerCase());
    expect(result).toEqual({ coupleId: COUPLE_ID });
  });

  it('rejects a wrong (nonexistent) code with Invalid invite code', async () => {
    seedHappyPath();
    store.docs.set(`users/${ACCEPTOR}`, { email: 'a@b.c', couple_id: null });

    await expect(callAs(ACCEPTOR, 'ZZZZZ9')).rejects.toMatchObject({
      code: 'not-found',
      message: 'Invalid invite code',
    });
    // Nothing was mutated
    expect(store.docs.get(`couples/${COUPLE_ID}`)!.status).toBe('pending');
  });

  it('rejects malformed codes without touching Firestore', async () => {
    seedHappyPath();
    await expect(callAs(ACCEPTOR, 'AB')).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'Invalid invite code',
    });
    await expect(callAs(ACCEPTOR, 12345)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(store.writeLog).toHaveLength(0);
  });

  it("rejects the inviter accepting their own invite", async () => {
    seedHappyPath();
    // Inviter's own couple is pending, so the active-couple guard passes.
    await expect(callAs(INVITER, CODE)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: "You can't accept your own invite",
    });
    expect(store.docs.get(`couple_invites/${CODE}`)!.status).toBe('pending');
  });

  it('rejects an already-used invite', async () => {
    seedHappyPath();
    store.docs.set(`couple_invites/${CODE}`, {
      ...store.docs.get(`couple_invites/${CODE}`)!,
      status: 'accepted',
    });

    await expect(callAs(ACCEPTOR, CODE)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'This invite has already been used',
    });
  });

  it('rejects an expired invite', async () => {
    seedHappyPath();
    store.docs.set(`couple_invites/${CODE}`, {
      ...store.docs.get(`couple_invites/${CODE}`)!,
      expires_at: asTimestamp(pastDate),
    });

    await expect(callAs(ACCEPTOR, CODE)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'This invite has expired',
    });
  });

  it('rejects a caller who is already in an ACTIVE couple', async () => {
    seedHappyPath();
    store.docs.set('couples/other-couple', {
      member_ids: [ACCEPTOR, 'someone'],
      status: 'active',
    });
    store.docs.set(`users/${ACCEPTOR}`, {
      email: 'acceptor@example.com',
      couple_id: 'other-couple',
    });

    await expect(callAs(ACCEPTOR, CODE)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Already in a couple',
    });
  });

  it('lets a caller with a STALE (deleted) couple_id join', async () => {
    seedHappyPath();
    store.docs.set('couples/old-couple', {
      member_ids: [ACCEPTOR, 'ex-partner'],
      status: 'deleted',
    });
    store.docs.set(`users/${ACCEPTOR}`, {
      email: 'acceptor@example.com',
      couple_id: 'old-couple',
    });

    const result = await callAs(ACCEPTOR, CODE);
    expect(result).toEqual({ coupleId: COUPLE_ID });
    expect(store.docs.get(`users/${ACCEPTOR}`)!.couple_id).toBe(COUPLE_ID);
  });

  it('rejects when the target couple is already active (invalid state)', async () => {
    seedHappyPath();
    store.docs.set(`couples/${COUPLE_ID}`, {
      member_ids: [INVITER, 'someone-else'],
      status: 'active',
    });

    await expect(callAs(ACCEPTOR, CODE)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Invalid invite code',
    });
  });

  it('requires authentication', async () => {
    seedHappyPath();
    await expect(wrappedAccept({ code: CODE }, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('applies the accept_invite rate limit', async () => {
    seedHappyPath();
    await callAs(ACCEPTOR, CODE);
    expect(enforceRateLimit).toHaveBeenCalledWith(ACCEPTOR, 'accept_invite', 5);
  });

  it('still completes the join when claim-setting fails (reported, not thrown)', async () => {
    seedHappyPath();
    authMock.setCustomUserClaims.mockRejectedValue(new Error('auth down'));

    const result = await callAs(ACCEPTOR, CODE);
    expect(result).toEqual({ coupleId: COUPLE_ID });
    expect(shared.reportError).toHaveBeenCalled();
    expect(store.docs.get(`couples/${COUPLE_ID}`)!.status).toBe('active');
  });
});
