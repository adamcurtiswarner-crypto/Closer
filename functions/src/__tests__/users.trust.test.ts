/**
 * Trust-cluster tests for users.ts (SEV-0 #2/#3):
 *
 * - unlinkCouple: server-side breakup — dissolves the couple, clears BOTH
 *   users' couple_id and coupleId custom claims, cancels pending invites,
 *   pushes the partner quietly. (The old client-side unlink could only
 *   clear the caller's own doc, leaving the partner half-linked.)
 * - deleteAccount: snapshots purge_couple_id BEFORE nulling couple_id and
 *   clears both members' claims.
 * - cleanupDeletedAccounts: uses purge_couple_id (couple_id is already null
 *   at purge time) and scrubs the deleted user's embedded response copies
 *   in prompt_completions.responses[] and memory_artifacts.responses[].
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// firebase-admin mock (auth claims, storage, firestore statics)
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
// In-memory Firestore fake (hearth.test.ts pattern) with subcollections,
// delete(), and ==/<= query operators (cleanup queries scheduled_purge_at).
// ---------------------------------------------------------------------------

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();
  const writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }> = [];

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string): Record<string, unknown> => ({
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
import { unlinkCouple, deleteAccount, cleanupDeletedAccounts } from '../users';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrappedUnlink = fft.wrap(unlinkCouple);
const wrappedDelete = fft.wrap(deleteAccount);
const wrappedCleanup = fft.wrap(cleanupDeletedAccounts);

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
}).__store;

const authMock = (admin as unknown as {
  __authMock: { getUser: jest.Mock; setCustomUserClaims: jest.Mock; deleteUser: jest.Mock };
}).__authMock;

const sendPushNotification = shared.sendPushNotification as unknown as jest.Mock;
const logEvent = shared.logEvent as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_A = 'user-a';
const USER_B = 'user-b';
const COUPLE_ID = 'couple-1';

const pastTimestamp = () => {
  const d = new Date(Date.now() - 60 * 1000);
  return { toDate: () => d, toMillis: () => d.getTime() };
};

function seedActiveCouple(): void {
  store.docs.set(`users/${USER_A}`, { email: 'a@example.com', couple_id: COUPLE_ID });
  store.docs.set(`users/${USER_B}`, { email: 'b@example.com', couple_id: COUPLE_ID });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
  });
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  jest.clearAllMocks();
  authMock.getUser.mockResolvedValue({ customClaims: { coupleId: COUPLE_ID } });
  authMock.setCustomUserClaims.mockResolvedValue(undefined);
  authMock.deleteUser.mockResolvedValue(undefined);
});

afterAll(() => {
  fft.cleanup();
});

// ---------------------------------------------------------------------------
// unlinkCouple
// ---------------------------------------------------------------------------

describe('unlinkCouple', () => {
  it('dissolves the couple and unlinks BOTH users', async () => {
    seedActiveCouple();
    store.docs.set('couple_invites/ABC234', {
      inviter_id: USER_A,
      couple_id: COUPLE_ID,
      status: 'pending',
    });

    const result = await wrappedUnlink({}, { auth: { uid: USER_A } });
    expect(result).toEqual({ success: true });

    const couple = store.docs.get(`couples/${COUPLE_ID}`)!;
    expect(couple.status).toBe('deleted');
    expect(couple.unlinked_at).toBe('SERVER_TIMESTAMP');

    expect(store.docs.get(`users/${USER_A}`)!.couple_id).toBeNull();
    expect(store.docs.get(`users/${USER_B}`)!.couple_id).toBeNull();

    expect(store.docs.get('couple_invites/ABC234')!.status).toBe('cancelled');
    expect(logEvent).toHaveBeenCalledWith('couple_unlinked', USER_A, COUPLE_ID, {});
  });

  it('clears the coupleId custom claim for BOTH members', async () => {
    seedActiveCouple();
    authMock.getUser.mockResolvedValue({ customClaims: { coupleId: COUPLE_ID, other: 1 } });

    await wrappedUnlink({}, { auth: { uid: USER_A } });

    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(USER_A, { other: 1 });
    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(USER_B, { other: 1 });
  });

  it('sends the quiet push to the partner only', async () => {
    seedActiveCouple();
    await wrappedUnlink({}, { auth: { uid: USER_A } });

    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_B,
      { title: 'Stoke', body: 'Your partner has left Stoke.' },
      { type: 'prompt' }
    );
  });

  it('rejects a caller who is not in a couple', async () => {
    store.docs.set(`users/${USER_A}`, { email: 'a@example.com', couple_id: null });

    await expect(wrappedUnlink({}, { auth: { uid: USER_A } })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Not in a couple',
    });
  });

  it('rejects a caller who is not a member of the couple', async () => {
    seedActiveCouple();
    store.docs.set('users/stranger', { email: 's@example.com', couple_id: COUPLE_ID });

    await expect(wrappedUnlink({}, { auth: { uid: 'stranger' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(store.docs.get(`couples/${COUPLE_ID}`)!.status).toBe('active');
  });

  it('self-heals the caller when the couple doc is gone', async () => {
    store.docs.set(`users/${USER_A}`, { email: 'a@example.com', couple_id: 'ghost-couple' });

    const result = await wrappedUnlink({}, { auth: { uid: USER_A } });
    expect(result).toEqual({ success: true });
    expect(store.docs.get(`users/${USER_A}`)!.couple_id).toBeNull();
    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(USER_A, {});
  });

  it('requires authentication', async () => {
    await expect(wrappedUnlink({}, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});

// ---------------------------------------------------------------------------
// deleteAccount — purge_couple_id snapshot + claim clearing
// ---------------------------------------------------------------------------

describe('deleteAccount (trust cluster additions)', () => {
  it('snapshots purge_couple_id before nulling couple_id', async () => {
    seedActiveCouple();

    await wrappedDelete({}, { auth: { uid: USER_A } });

    const userA = store.docs.get(`users/${USER_A}`)!;
    expect(userA.is_deleted).toBe(true);
    expect(userA.purge_couple_id).toBe(COUPLE_ID);
    expect(userA.couple_id).toBeNull();
    expect(store.docs.get(`users/${USER_B}`)!.couple_id).toBeNull();
    expect(store.docs.get(`couples/${COUPLE_ID}`)!.status).toBe('deleted');
  });

  it('stores purge_couple_id as null for uncoupled users', async () => {
    store.docs.set(`users/${USER_A}`, { email: 'a@example.com', couple_id: null });

    await wrappedDelete({}, { auth: { uid: USER_A } });

    expect(store.docs.get(`users/${USER_A}`)!.purge_couple_id).toBeNull();
  });

  it('clears the coupleId claim for both members', async () => {
    seedActiveCouple();
    authMock.getUser.mockResolvedValue({ customClaims: { coupleId: COUPLE_ID } });

    await wrappedDelete({}, { auth: { uid: USER_A } });

    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(USER_A, {});
    expect(authMock.setCustomUserClaims).toHaveBeenCalledWith(USER_B, {});
  });
});

// ---------------------------------------------------------------------------
// cleanupDeletedAccounts — purge uses the snapshot and scrubs embedded copies
// ---------------------------------------------------------------------------

describe('cleanupDeletedAccounts purge', () => {
  function seedPurgeableUser(): void {
    // couple_id already null (deleteAccount nulled it); snapshot present.
    store.docs.set(`users/${USER_A}`, {
      email: 'a@example.com',
      couple_id: null,
      purge_couple_id: COUPLE_ID,
      is_deleted: true,
      scheduled_purge_at: pastTimestamp(),
    });

    store.docs.set('prompt_responses/resp-1', {
      user_id: USER_A,
      couple_id: COUPLE_ID,
      assignment_id: 'assign-1',
      response_text: 'private answer',
    });

    store.docs.set('prompt_completions/assign-1', {
      couple_id: COUPLE_ID,
      responses: [
        { user_id: USER_A, response_text: 'private answer', response_text_encrypted: 'x', image_url: 'http://img' },
        { user_id: USER_B, response_text: 'partner answer', response_text_encrypted: 'y', image_url: null },
      ],
    });

    store.docs.set('memory_artifacts/mem-1', {
      couple_id: COUPLE_ID,
      responses: [
        { user_id: USER_A, response_text: 'private memory', response_text_encrypted: 'x', image_url: null },
        { user_id: USER_B, response_text: 'partner memory', response_text_encrypted: 'y', image_url: null },
      ],
    });

    store.docs.set(`couples/${COUPLE_ID}/messages/msg-1`, {
      sender_id: USER_A,
      text: 'secret chat',
    });
    store.docs.set(`couples/${COUPLE_ID}/messages/msg-2`, {
      sender_id: USER_B,
      text: 'partner chat',
    });
  }

  it('purges chat via purge_couple_id even though couple_id is null', async () => {
    seedPurgeableUser();

    await wrappedCleanup({});

    expect(store.docs.has(`couples/${COUPLE_ID}/messages/msg-1`)).toBe(false);
    // Partner's messages are untouched
    expect(store.docs.has(`couples/${COUPLE_ID}/messages/msg-2`)).toBe(true);
    // User doc itself purged
    expect(store.docs.has(`users/${USER_A}`)).toBe(false);
  });

  it('scrubs the deleted user from prompt_completions.responses[]', async () => {
    seedPurgeableUser();

    await wrappedCleanup({});

    const completion = store.docs.get('prompt_completions/assign-1')!;
    const responses = completion.responses as Array<Record<string, unknown>>;
    const mine = responses.find((r) => r.user_id === USER_A)!;
    const theirs = responses.find((r) => r.user_id === USER_B)!;

    expect(mine.response_text).toBe('[removed]');
    expect(mine.response_text_encrypted).toBe('[removed]');
    expect(mine.image_url).toBeNull();
    expect(theirs.response_text).toBe('partner answer');

    // The source response doc is deleted outright
    expect(store.docs.has('prompt_responses/resp-1')).toBe(false);
  });

  it('scrubs the deleted user from memory_artifacts.responses[]', async () => {
    seedPurgeableUser();

    await wrappedCleanup({});

    const memory = store.docs.get('memory_artifacts/mem-1')!;
    const responses = memory.responses as Array<Record<string, unknown>>;
    expect(responses.find((r) => r.user_id === USER_A)!.response_text).toBe('[removed]');
    expect(responses.find((r) => r.user_id === USER_B)!.response_text).toBe('partner memory');
  });

  it('does not purge users before their scheduled_purge_at', async () => {
    seedPurgeableUser();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    store.docs.set(`users/${USER_A}`, {
      ...store.docs.get(`users/${USER_A}`)!,
      scheduled_purge_at: { toDate: () => future, toMillis: () => future.getTime() },
    });

    await wrappedCleanup({});

    expect(store.docs.has(`users/${USER_A}`)).toBe(true);
    expect(store.docs.has('prompt_responses/resp-1')).toBe(true);
  });
});
