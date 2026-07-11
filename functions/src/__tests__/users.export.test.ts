/**
 * exportUserData tests — the human-first export:
 *
 * - readable: header, plain-words profile (no couple_id/ids/URLs), responses
 *   grouped by calendar date descending with question text joined server-side
 *   (assignment hit → prompts fallback → '(question unavailable)'),
 *   {partner}/{me} personalized for the exporter, explore marked, scores shown.
 * - raw: full JSON with Firestore timestamps as ISO strings and tokened
 *   storage URLs dropped (photos note kept).
 * - auth + 24h rate limit stay enforced.
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// firebase-admin mock (users.trust.test.ts pattern)
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
// In-memory Firestore fake (users.trust.test.ts pattern)
// ---------------------------------------------------------------------------

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string): Record<string, unknown> => ({
    id: path.split('/').pop(),
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
    set: async (data: Record<string, unknown>) => {
      docs.set(path, { ...data });
    },
    update: async (data: Record<string, unknown>) => {
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
    delete: async () => {
      docs.delete(path);
    },
    collection: (sub: string) => makeCollection(`${path}/${sub}`),
  });

  const compare = (op: string, docValue: unknown, value: unknown): boolean => {
    if (op === '==') return docValue === value;
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
    get: () => makeQuery(name, []).get(),
  });

  const actual = jest.requireActual('../shared');

  return {
    db: { collection: makeCollection },
    __store: { docs },
    APP_NAME: 'Stoke',
    getWeekId: actual.getWeekId,
    enforceRateLimit: jest.fn().mockResolvedValue(undefined),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

import { exportUserData } from '../users';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrappedExport = fft.wrap(exportUserData);

const store = (shared as unknown as {
  __store: { docs: Map<string, Record<string, unknown>> };
}).__store;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_A = 'user-a';
const USER_B = 'user-b';
const COUPLE_ID = 'couple-1';

const ts = (iso: string) => {
  const d = new Date(iso);
  return { toDate: () => d, toMillis: () => d.getTime() };
};

interface ExportResult {
  exported_at: string;
  readable: string;
  raw: Record<string, unknown>;
}

function seedExportFixtures(): void {
  store.docs.set(`users/${USER_A}`, {
    email: 'adam@example.com',
    display_name: 'Adam Warner',
    couple_id: COUPLE_ID,
    photo_url: 'https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fa%2Fprofile.jpg?alt=media&token=abc',
    created_at: ts('2026-01-05T12:00:00Z'),
    push_tokens: [{ token: 'ExponentPushToken[secret]' }],
  });
  store.docs.set(`users/${USER_B}`, {
    email: 'sarah@example.com',
    display_name: 'Sarah Lee',
    couple_id: COUPLE_ID,
  });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
  });

  // Daily assignment — prompt_text lives on the assignment, tokened.
  store.docs.set('prompt_assignments/assign-daily', {
    couple_id: COUPLE_ID,
    prompt_text: 'What made you smile about {partner} today?',
    assigned_date: '2026-07-10',
    source: 'daily',
  });
  store.docs.set('prompt_responses/resp-daily', {
    user_id: USER_A,
    couple_id: COUPLE_ID,
    assignment_id: 'assign-daily',
    prompt_id: 'prompt-1',
    response_text: 'The way she laughed at breakfast.',
    response_score: 8,
    submitted_at: ts('2026-07-10T21:30:00Z'),
    created_at: ts('2026-07-10T21:00:00Z'),
    image_url: 'https://firebasestorage.googleapis.com/v0/b/x/o/responses%2Fimg.jpg?alt=media&token=def',
  });

  // Explore assignment — marked in the readable output.
  store.docs.set('prompt_assignments/assign-explore', {
    couple_id: COUPLE_ID,
    prompt_text: 'Ask {me} anything about our first trip.',
    assigned_date: '2026-07-08',
    source: 'explore',
  });
  store.docs.set('prompt_responses/resp-explore', {
    user_id: USER_A,
    couple_id: COUPLE_ID,
    assignment_id: 'assign-explore',
    prompt_id: 'prompt-2',
    response_text: 'That sunset in Lisbon.',
    submitted_at: ts('2026-07-08T20:00:00Z'),
    created_at: ts('2026-07-08T19:00:00Z'),
    image_url: null,
  });

  // Assignment gone — question comes from the prompts collection fallback.
  store.docs.set('prompts/prompt-3', {
    text: 'What are you grateful for this week?',
  });
  store.docs.set('prompt_responses/resp-fallback', {
    user_id: USER_A,
    couple_id: COUPLE_ID,
    assignment_id: 'assign-missing',
    prompt_id: 'prompt-3',
    response_text: 'Quiet mornings.',
    submitted_at: ts('2026-07-06T18:00:00Z'),
    created_at: ts('2026-07-06T18:00:00Z'),
    image_url: null,
  });

  // Neither assignment nor prompt exists.
  store.docs.set('prompt_responses/resp-orphan', {
    user_id: USER_A,
    couple_id: COUPLE_ID,
    assignment_id: 'assign-gone',
    prompt_id: 'prompt-gone',
    response_text: 'An orphaned answer.',
    submitted_at: ts('2026-07-01T18:00:00Z'),
    created_at: ts('2026-07-01T18:00:00Z'),
    image_url: null,
  });
}

beforeEach(() => {
  store.docs.clear();
  jest.clearAllMocks();
});

afterAll(() => {
  fft.cleanup();
});

// ---------------------------------------------------------------------------
// readable
// ---------------------------------------------------------------------------

describe('exportUserData readable document', () => {
  it('opens with the header and plain-words profile', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    expect(result.readable.startsWith('Your Stoke export — ')).toBe(true);
    expect(result.readable).toContain('Name: Adam Warner');
    expect(result.readable).toContain('Email: adam@example.com');
    expect(result.readable).toContain('Joined: January 5, 2026');
  });

  it('keeps internal ids and URLs out of the readable document', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    expect(result.readable).not.toContain(COUPLE_ID);
    expect(result.readable).not.toContain('assign-daily');
    expect(result.readable).not.toContain('http');
    expect(result.readable).not.toContain('ExponentPushToken');
  });

  it('joins each answer to its question from the assignment, personalized', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    // {partner} → partner's first name; exporter = {me}
    expect(result.readable).toContain('What made you smile about Sarah today?');
    expect(result.readable).toContain('Ask Adam anything about our first trip.');
    expect(result.readable).not.toContain('{partner}');
    expect(result.readable).not.toContain('{me}');
    expect(result.readable).toContain('You wrote: The way she laughed at breakfast.');
    expect(result.readable).toContain('Score: 8/10');
  });

  it('falls back to the prompts collection, then to (question unavailable)', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    expect(result.readable).toContain('What are you grateful for this week?');
    expect(result.readable).toContain('(question unavailable)');
    expect(result.readable).toContain('You wrote: An orphaned answer.');
  });

  it('marks explore questions and groups days newest first', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    expect(result.readable).toContain(
      'Ask Adam anything about our first trip. (a question between you two)'
    );

    const july10 = result.readable.indexOf('July 10, 2026');
    const july8 = result.readable.indexOf('July 8, 2026');
    const july6 = result.readable.indexOf('July 6, 2026');
    expect(july10).toBeGreaterThan(-1);
    expect(july8).toBeGreaterThan(july10);
    expect(july6).toBeGreaterThan(july8);
  });

  it('handles a user with no responses', async () => {
    store.docs.set(`users/${USER_A}`, {
      email: 'adam@example.com',
      display_name: 'Adam Warner',
      couple_id: null,
      created_at: ts('2026-01-05T12:00:00Z'),
    });

    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;
    expect(result.readable).toContain('No responses yet.');
  });
});

// ---------------------------------------------------------------------------
// raw
// ---------------------------------------------------------------------------

describe('exportUserData raw copy', () => {
  it('converts Firestore timestamps to ISO strings', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    const profile = result.raw.profile as Record<string, unknown>;
    expect(profile.created_at).toBe('2026-01-05T12:00:00.000Z');

    const responses = result.raw.prompt_responses as Array<Record<string, unknown>>;
    const daily = responses.find((r) => r.id === 'resp-daily')!;
    expect(daily.submitted_at).toBe('2026-07-10T21:30:00.000Z');
    expect(JSON.stringify(result.raw)).not.toContain('_seconds');
  });

  it('drops tokened storage URLs and keeps the photos note', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    expect(JSON.stringify(result.raw)).not.toContain('token=');
    expect(JSON.stringify(result.raw)).not.toContain('firebasestorage');
    const responses = result.raw.prompt_responses as Array<Record<string, unknown>>;
    expect(responses.find((r) => r.id === 'resp-daily')!.image_url).toBeNull();
    const profile = result.raw.profile as Record<string, unknown>;
    expect(profile.photo_url).toBeNull();
    expect(result.raw.photos_note).toContain('re-downloaded in the app');
  });

  it('still excludes push tokens and keeps the answer text portable', async () => {
    seedExportFixtures();
    const result = (await wrappedExport({}, { auth: { uid: USER_A } })) as ExportResult;

    const profile = result.raw.profile as Record<string, unknown>;
    expect(profile.push_tokens).toBeUndefined();
    expect(JSON.stringify(result.raw)).toContain('The way she laughed at breakfast.');
  });
});

// ---------------------------------------------------------------------------
// auth + rate limit stay enforced
// ---------------------------------------------------------------------------

describe('exportUserData guards', () => {
  it('requires authentication', async () => {
    await expect(wrappedExport({}, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('enforces the 24-hour rate limit', async () => {
    seedExportFixtures();
    store.docs.set(`users/${USER_A}`, {
      ...store.docs.get(`users/${USER_A}`)!,
      last_export_at: ts(new Date(Date.now() - 60 * 60 * 1000).toISOString()),
    });

    await expect(wrappedExport({}, { auth: { uid: USER_A } })).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('marks last_export_at after a successful export', async () => {
    seedExportFixtures();
    await wrappedExport({}, { auth: { uid: USER_A } });
    expect(store.docs.get(`users/${USER_A}`)!.last_export_at).toBe('SERVER_TIMESTAMP');
  });
});
