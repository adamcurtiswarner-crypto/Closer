/**
 * Tests for the synthetic-couple canary (functions/src/canary.ts).
 *
 * runCanaryOnce is exercised against an in-memory Firestore fake with
 * injected timings; the "trigger" (onResponseSubmitted creating the
 * completion + repairing the assignment) is simulated by the test writing
 * into the fake store while the canary polls.
 */

jest.mock('../shared', () => {
  const docs = new Map<string, Record<string, unknown>>();

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop(),
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
    set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      const previous = options?.merge ? docs.get(path) || {} : {};
      docs.set(path, { ...previous, ...data });
    },
    update: async (data: Record<string, unknown>) => {
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
    delete: async () => {
      docs.delete(path);
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
    __store: { docs },
    DEFAULT_SCALE_CONFIG: {
      min: 1,
      max: 10,
      low_threshold: 4,
      high_threshold: 9,
      divergence_gap: 4,
      min_label: 'Struggling',
      max_label: 'Thriving',
    },
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

import {
  CANARY_SOURCE,
  canaryConfig,
  canaryAssignmentId,
  buildCanaryAssignment,
  buildCanaryResponse,
  runCanaryOnce,
} from '../canary';
import * as shared from '../shared';

const store = (shared as unknown as {
  __store: { docs: Map<string, Record<string, unknown>> };
}).__store;
const reportError = shared.reportError as jest.Mock;

const NOW = new Date('2026-07-09T12:00:00Z');
const CONFIG = { coupleId: 'canary-couple', userA: 'canary-user-a', userB: 'canary-user-b' };
const ASSIGNMENT_ID = canaryAssignmentId(NOW);

beforeEach(() => {
  store.docs.clear();
  jest.clearAllMocks();
});

describe('canaryConfig', () => {
  it('defaults to the canary-couple shadow ids', () => {
    expect(canaryConfig({})).toEqual({
      coupleId: 'canary-couple',
      userA: 'canary-user-a',
      userB: 'canary-user-b',
    });
  });

  it('is env-configurable', () => {
    expect(
      canaryConfig({
        CANARY_COUPLE_ID: 'sandbox-couple-001',
        CANARY_USER_A: 'sandbox-a',
        CANARY_USER_B: 'sandbox-b',
      })
    ).toEqual({ coupleId: 'sandbox-couple-001', userA: 'sandbox-a', userB: 'sandbox-b' });
  });
});

describe('canary artifact shapes', () => {
  it('assignment ids are canary-prefixed and per-run unique', () => {
    expect(ASSIGNMENT_ID).toMatch(/^canary_\d{8}T\d{6}$/);
    expect(canaryAssignmentId(new Date('2026-07-09T13:00:00Z'))).not.toBe(ASSIGNMENT_ID);
  });

  it('assignment carries source canary, scale format, delivered status', () => {
    const assignment = buildCanaryAssignment(CONFIG, '2026-07-09');
    expect(assignment.source).toBe(CANARY_SOURCE);
    expect(assignment.couple_id).toBe(CONFIG.coupleId);
    expect(assignment.response_format).toBe('scale');
    expect(assignment.status).toBe('delivered');
    expect(assignment.assigned_date).toBe('2026-07-09');
    expect(assignment.assignment_kind).toBe('daily');
  });

  it('responses are steady (7/7 — never repair/divergence) and submitted', () => {
    const response = buildCanaryResponse(ASSIGNMENT_ID, CONFIG, CONFIG.userA);
    expect(response.response_score).toBe(7);
    expect(response.status).toBe('submitted');
    expect(response.assignment_id).toBe(ASSIGNMENT_ID);
    expect(response.couple_id).toBe(CONFIG.coupleId);
  });
});

/** Simulates onResponseSubmitted after `delayMs`: completion + status repair. */
function simulateTriggerAfter(delayMs: number): void {
  setTimeout(() => {
    store.docs.set(`prompt_completions/${ASSIGNMENT_ID}`, {
      assignment_id: ASSIGNMENT_ID,
      couple_id: CONFIG.coupleId,
    });
    const assignment = store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`);
    if (assignment) {
      store.docs.set(`prompt_assignments/${ASSIGNMENT_ID}`, {
        ...assignment,
        status: 'completed',
      });
    }
  }, delayMs);
}

describe('runCanaryOnce', () => {
  it('succeeds when the pipeline produces the completion, then deletes all artifacts', async () => {
    simulateTriggerAfter(60);

    const result = await runCanaryOnce({
      config: CONFIG,
      now: NOW,
      timeoutMs: 2000,
      pollIntervalMs: 20,
    });

    expect(result.ok).toBe(true);
    expect(result.failure).toBeNull();
    expect(reportError).not.toHaveBeenCalled();

    // Every canary artifact removed; the shadow couple doc is kept.
    const leftover = [...store.docs.keys()].filter(
      (path) =>
        path.startsWith('prompt_assignments/') ||
        path.startsWith('prompt_responses/') ||
        path.startsWith('prompt_completions/')
    );
    expect(leftover).toEqual([]);
    expect(store.docs.get(`couples/${CONFIG.coupleId}`)).toMatchObject({
      member_ids: [CONFIG.userA, CONFIG.userB],
      status: 'canary',
    });
  });

  it('reports to error_logs when the completion never appears — and still cleans up', async () => {
    const result = await runCanaryOnce({
      config: CONFIG,
      now: NOW,
      timeoutMs: 100,
      pollIntervalMs: 20,
    });

    expect(result.ok).toBe(false);
    expect(result.failure).toContain('MISSING');
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      'canary',
      expect.any(Error),
      expect.objectContaining({
        coupleId: CONFIG.coupleId,
        extra: expect.objectContaining({ assignmentId: ASSIGNMENT_ID }),
      })
    );

    const leftover = [...store.docs.keys()].filter((path) =>
      path.startsWith('prompt_')
    );
    expect(leftover).toEqual([]);
  });

  it('sweeps leftovers from a prior crashed run before starting', async () => {
    // A stale assignment/response pair from a crashed run.
    store.docs.set('prompt_assignments/canary_stale', {
      couple_id: CONFIG.coupleId,
      source: CANARY_SOURCE,
      status: 'delivered',
    });
    store.docs.set('prompt_responses/canary_stale_x', {
      couple_id: CONFIG.coupleId,
    });

    simulateTriggerAfter(60);
    const result = await runCanaryOnce({
      config: CONFIG,
      now: NOW,
      timeoutMs: 2000,
      pollIntervalMs: 20,
    });

    expect(result.ok).toBe(true);
    expect(store.docs.has('prompt_assignments/canary_stale')).toBe(false);
    expect(store.docs.has('prompt_responses/canary_stale_x')).toBe(false);
  });

  it('never lets the shadow couple look active to status queries', async () => {
    simulateTriggerAfter(60);
    await runCanaryOnce({ config: CONFIG, now: NOW, timeoutMs: 2000, pollIntervalMs: 20 });

    const couple = store.docs.get(`couples/${CONFIG.coupleId}`)!;
    expect(couple.status).toBe('canary');
    expect(couple.status).not.toBe('active');
  });
});
