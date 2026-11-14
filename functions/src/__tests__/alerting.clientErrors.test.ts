/**
 * Tests for the `client_error` leg of checkErrorAlerts.
 *
 * Why it exists (2026-11-14): `logger.reportQueryDenied` has written
 * `client_error` docs into /events since July 2026 and NOTHING read them.
 * `checkErrorAlerts` scanned `error_logs` only. The `documentId() in`
 * outage therefore sat in production for 20 days — Open Days never worked
 * once and Your Words showed answers with no questions — and surfaced only
 * because Adam exported a CSV by hand. Creating the `/admins` doc would not
 * have helped, because this scan did not exist.
 *
 * The three behaviours worth pinning:
 *  1. a cursor, not an `alerted` flag — those docs are client-written and
 *     have no such field, and a Firestore equality on a missing field
 *     matches nothing, so the obvious implementation would silently never
 *     fire;
 *  2. the first run initializes the cursor instead of alerting on months of
 *     already-diagnosed backlog;
 *  3. with no admin recipients the cursor is NOT advanced, so the errors
 *     resurface — stamping them handled with nobody listening is exactly
 *     how the August outage stayed hidden.
 */

type Doc = Record<string, unknown>;

const state: {
  events: Array<{ id: string; data: Doc }>;
  errorLogs: Array<{ id: string; data: Doc }>;
  admins: string[];
  cursorDoc: Doc | null;
  cursorWrites: Doc[];
  pushes: Array<{ userId: string; title: string; body: string }>;
} = {
  events: [],
  errorLogs: [],
  admins: [],
  cursorDoc: null,
  cursorWrites: [],
  pushes: [],
};

jest.mock('firebase-admin', () => {
  const FieldValue = { serverTimestamp: () => ({ __op: 'serverTimestamp' }) };
  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(), { FieldValue }),
    messaging: jest.fn(),
  };
});

// Minimal query builder: supports the exact chain the function uses.
function makeEventsQuery() {
  const filters: Array<[string, string, unknown]> = [];
  const q: Record<string, unknown> = {};
  q.where = (field: string, op: string, value: unknown) => {
    filters.push([field, op, value]);
    return q;
  };
  q.orderBy = () => q;
  q.limit = (n: number) => {
    (q as { __limit?: number }).__limit = n;
    return q;
  };
  q.get = async () => {
    let docs = state.events;
    for (const [field, op, value] of filters) {
      if (field === 'event_name' && op === '==') {
        docs = docs.filter((d) => d.data.event_name === value);
      }
      if (field === 'timestamp' && op === '>') {
        docs = docs.filter((d) => Number(d.data.timestamp) > Number(value));
      }
    }
    docs = [...docs].sort((a, b) => Number(b.data.timestamp) - Number(a.data.timestamp));
    const limited = docs.slice(0, (q as { __limit?: number }).__limit ?? docs.length);
    return {
      empty: limited.length === 0,
      size: limited.length,
      docs: limited.map((d) => ({ id: d.id, data: () => d.data, ref: { id: d.id } })),
    };
  };
  return q;
}

const mockSendPush = jest.fn(
  async (userId: string, n: { title: string; body: string }) => {
    state.pushes.push({ userId, title: n.title, body: n.body });
  }
);

jest.mock('../shared', () => {
  const actual = jest.requireActual('../shared');
  return {
    ...actual,
    sendPushNotification: (...args: unknown[]) =>
      (mockSendPush as unknown as (...a: unknown[]) => Promise<void>)(...args),
    db: {
      collection: (name: string) => {
        if (name === 'events') return makeEventsQuery();
        if (name === 'admins') {
          return {
            get: async () => ({
              empty: state.admins.length === 0,
              size: state.admins.length,
              docs: state.admins.map((id) => ({ id })),
            }),
          };
        }
        if (name === 'error_logs') {
          const q: Record<string, unknown> = {};
          q.where = () => q;
          q.orderBy = () => q;
          q.limit = () => q;
          q.get = async () => ({
            empty: state.errorLogs.length === 0,
            size: state.errorLogs.length,
            docs: state.errorLogs.map((d) => ({ id: d.id, data: () => d.data, ref: { id: d.id } })),
          });
          return q;
        }
        if (name === 'admin_state') {
          return { doc: () => makeCursorRef() };
        }
        throw new Error('unexpected collection ' + name);
      },
      doc: (path: string) => {
        if (path.startsWith('admin_state/')) return makeCursorRef();
        throw new Error('unexpected doc ' + path);
      },
      batch: () => ({ update: jest.fn(), commit: jest.fn() }),
    },
  };
});

function makeCursorRef() {
  return {
    get: async () => ({
      exists: state.cursorDoc !== null,
      data: () => state.cursorDoc ?? undefined,
    }),
    set: async (data: Doc) => {
      state.cursorWrites.push(data);
      state.cursorDoc = { ...(state.cursorDoc ?? {}), ...data };
    },
  };
}

/** Invoke the scheduled handler the way firebase-functions-test would. */
async function runCheckErrorAlerts(): Promise<void> {
  const mod = await import('../alerting');
  const fn = mod.checkErrorAlerts as unknown as {
    run: (data: unknown, context: unknown) => Promise<unknown>;
  };
  await fn.run({}, {});
}

function clientError(id: string, timestamp: number, context: string) {
  return {
    id,
    data: {
      event_name: 'client_error',
      timestamp,
      properties: { context, code: 'permission-denied' },
    },
  };
}

describe('checkErrorAlerts — client_error scan', () => {
  beforeEach(() => {
    state.events = [];
    state.errorLogs = [];
    state.admins = ['admin-1'];
    state.cursorDoc = null;
    state.cursorWrites = [];
    state.pushes = [];
    mockSendPush.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes the cursor on the first run instead of alerting on the backlog', async () => {
    // Months of already-diagnosed denials sit in /events.
    state.events = [
      clientError('old-1', 100, 'useOpenDays'),
      clientError('old-2', 200, 'useYourWords.assignmentJoin'),
    ];

    await runCheckErrorAlerts();

    expect(state.pushes).toHaveLength(0);
    expect(state.cursorWrites[0]).toHaveProperty('scanned_through');
    expect(state.cursorWrites[0]).toHaveProperty('initialized_at');
  });

  it('alerts on a denial newer than the cursor and names the failing call site', async () => {
    state.cursorDoc = { scanned_through: 500 };
    state.events = [
      clientError('old', 100, 'useOpenDays'),
      clientError('new', 900, 'usePrompt.assignmentsListener'),
    ];

    await runCheckErrorAlerts();

    expect(state.pushes).toHaveLength(1);
    expect(state.pushes[0].userId).toBe('admin-1');
    expect(state.pushes[0].title).toContain('1 client error');
    expect(state.pushes[0].body).toContain('usePrompt.assignmentsListener');
    // Cursor advances to the newest doc seen, so the next run is quiet.
    expect(state.cursorDoc?.scanned_through).toBe(900);
  });

  it('groups repeated denials by context with a count', async () => {
    state.cursorDoc = { scanned_through: 0 };
    state.events = [
      clientError('a', 10, 'useOpenDays'),
      clientError('b', 20, 'useOpenDays'),
      clientError('c', 30, 'useYourWords.assignmentJoin'),
    ];

    await runCheckErrorAlerts();

    expect(state.pushes[0].title).toContain('3 client errors');
    expect(state.pushes[0].body).toContain('useOpenDays (2)');
    expect(state.pushes[0].body).toContain('useYourWords.assignmentJoin (1)');
  });

  it('stays quiet when nothing is newer than the cursor', async () => {
    state.cursorDoc = { scanned_through: 1000 };
    state.events = [clientError('old', 100, 'useOpenDays')];

    await runCheckErrorAlerts();

    expect(state.pushes).toHaveLength(0);
  });

  it('does NOT advance the cursor when there are no admin recipients', async () => {
    state.admins = [];
    state.cursorDoc = { scanned_through: 0 };
    state.events = [clientError('a', 10, 'useOpenDays')];

    await runCheckErrorAlerts();

    expect(state.pushes).toHaveLength(0);
    // The denial must resurface once an admin exists.
    expect(state.cursorDoc?.scanned_through).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('NO admin recipients configured')
    );
  });

  it('ignores events that are not client errors', async () => {
    state.cursorDoc = { scanned_through: 0 };
    state.events = [
      { id: 'x', data: { event_name: 'prompt_answered', timestamp: 50, properties: {} } },
    ];

    await runCheckErrorAlerts();

    expect(state.pushes).toHaveLength(0);
  });
});
