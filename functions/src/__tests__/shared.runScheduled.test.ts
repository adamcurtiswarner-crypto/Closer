/**
 * Unit tests for runScheduled (shared.ts) — the wrapper that makes a
 * scheduled function's top-level failure visible to alerting.
 *
 * Why it exists (2026-11-14): `cleanupDeletedAccounts` wrapped every
 * per-user step in try/catch but not the query that selects the users, and
 * `aggregateWeeklyMetrics` had no try/catch at all. Both failed on every run
 * for at least four days on a missing composite index. The failure was in
 * Cloud Logging the whole time and reached no alerting path we own, because
 * `checkErrorAlerts` reads `error_logs` and nothing wrote a doc there. The
 * account-purge job is the one that was down, which is a compliance defect,
 * not a cosmetic one.
 *
 * The contract asserted here: a thrown error writes exactly one `error_logs`
 * doc with `alerted: false` (so `checkErrorAlerts` picks it up) AND is
 * rethrown, so Cloud Scheduler still records the run as failed. A wrapper
 * that swallowed the error would turn a loud outage into a silent one.
 */

const added: Array<Record<string, unknown>> = [];

jest.mock('firebase-admin', () => {
  const firestoreFn = jest.fn(() => ({
    collection: (name: string) => ({
      add: async (data: Record<string, unknown>) => {
        added.push({ __collection: name, ...data });
        return { id: 'err-1' };
      },
      doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
    }),
  })) as jest.Mock & { FieldValue: Record<string, unknown> };
  firestoreFn.FieldValue = { serverTimestamp: () => ({ __op: 'serverTimestamp' }) };
  return { initializeApp: jest.fn(), firestore: firestoreFn, messaging: jest.fn() };
});

import { runScheduled } from '../shared';

describe('runScheduled', () => {
  beforeEach(() => {
    added.length = 0;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the body result and logs nothing on success', async () => {
    const result = await runScheduled('happyPath', async () => 'done');

    expect(result).toBe('done');
    expect(added).toHaveLength(0);
  });

  it('reports a thrown error to error_logs and rethrows it', async () => {
    const boom = new Error('9 FAILED_PRECONDITION: The query requires an index.');

    await expect(
      runScheduled('cleanupDeletedAccounts', async () => {
        throw boom;
      })
    ).rejects.toThrow('FAILED_PRECONDITION');

    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      __collection: 'error_logs',
      function_name: 'cleanupDeletedAccounts',
      alerted: false,
    });
    expect(String(added[0].message)).toContain('FAILED_PRECONDITION');
  });

  it('reports a failure thrown before any inner try/catch could catch it', async () => {
    // This is the exact shape of the Nov 2026 outage: the selection query
    // throws, so the per-item loop (and its own catch) never runs.
    const selectUsers = async () => {
      throw new Error('index missing');
    };

    await expect(
      runScheduled('aggregateWeeklyMetrics', async () => {
        const users = await selectUsers();
        for (const _u of users as unknown as unknown[]) {
          try {
            /* per-item work that was already guarded */
          } catch {
            /* and therefore never reached */
          }
        }
        return null;
      })
    ).rejects.toThrow('index missing');

    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ function_name: 'aggregateWeeklyMetrics' });
  });

  it('still rethrows when writing the error_log itself fails', async () => {
    const admin = jest.requireMock('firebase-admin');
    admin.firestore.mockReturnValueOnce({
      collection: () => ({
        add: async () => {
          throw new Error('firestore unavailable');
        },
      }),
    });

    await expect(
      runScheduled('doubleFault', async () => {
        throw new Error('original failure');
      })
    ).rejects.toThrow('original failure');
  });
});
