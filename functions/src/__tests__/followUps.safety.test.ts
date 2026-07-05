/**
 * Safety off-ramp suppression tests for evaluateFollowUpOnCompletion.
 *
 * Spec: if EITHER partner's response text contains crisis language, no
 * follow-up is created — score branches (deepener/repair/divergence) AND
 * the repair step-2 chaining exception alike. A neutral event is logged
 * with the assignment id only; the matched text never appears anywhere.
 */
import * as functionsTest from 'firebase-functions-test';

jest.mock('../shared', () => {
  const actual = jest.requireActual('../shared');

  const docs = new Map<string, Record<string, unknown>>();
  const writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }> = [];
  let addCounter = 0;

  const segmentCount = (path: string): number => path.split('/').length;

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop(),
    get: async () => ({
      exists: docs.has(path),
      id: path.split('/').pop(),
      data: () => docs.get(path),
    }),
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
    add: async (data: Record<string, unknown>) => {
      addCounter += 1;
      const path = `${name}/auto-${addCounter}`;
      writeLog.push({ op: 'add', path, data });
      docs.set(path, { ...data });
      return makeDocRef(path);
    },
  });

  return {
    ...actual, // real containsCrisisLanguage, DEFAULT_SCALE_CONFIG, etc.
    db: { collection: makeCollection },
    __store: { docs, writeLog },
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

import { evaluateFollowUpOnCompletion } from '../followUps';
import * as shared from '../shared';

const fft = functionsTest.default();

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
}).__store;

const logEvent = shared.logEvent as unknown as jest.Mock;
const reportError = shared.reportError as unknown as jest.Mock;

const ASSIGNMENT_ID = 'assign-1';
const COUPLE_ID = 'couple-1';
const USER_ID = 'user-a';
const CRISIS_TEXT = 'honestly some days I want to hurt myself';

function dailyScaleAssignment(): Record<string, unknown> {
  return {
    couple_id: COUPLE_ID,
    assignment_kind: 'daily',
    response_format: 'scale',
    category: 'communication',
    scale_config: null,
    delivery_timezone: 'America/Los_Angeles',
  };
}

function repairStepOneAssignment(): Record<string, unknown> {
  return {
    couple_id: COUPLE_ID,
    assignment_kind: 'follow_up',
    response_format: 'text',
    category: 'communication',
    delivery_timezone: 'America/Los_Angeles',
    follow_up: {
      branch: 'repair',
      step: 1,
      parent_assignment_id: 'parent-1',
      template_id: 'tpl-repair-1',
    },
  };
}

function seedTemplates(): void {
  store.docs.set('follow_up_templates/tpl-deepener-1', {
    category: 'communication',
    branch: 'deepener',
    step: 1,
    text: 'What made this week feel so close?',
    variant: 1,
    active: true,
  });
  store.docs.set('follow_up_templates/tpl-repair-1', {
    category: 'communication',
    branch: 'repair',
    step: 1,
    text: 'What felt hard this week?',
    variant: 1,
    active: true,
  });
  store.docs.set('follow_up_templates/tpl-repair-2', {
    category: 'communication',
    branch: 'repair',
    step: 2,
    text: 'What would feeling closer look like?',
    variant: 1,
    active: true,
  });
}

function followUpCreates(): Array<{ op: string; path: string; data: Record<string, unknown> }> {
  return store.writeLog.filter(
    (w) => w.op === 'add' && w.path.startsWith('prompt_assignments/')
  );
}

function suppressionEvents(): unknown[][] {
  return logEvent.mock.calls.filter(([name]) => name === 'follow_up_suppressed_safety');
}

beforeEach(() => {
  store.docs.clear();
  store.writeLog.length = 0;
  jest.clearAllMocks();
  seedTemplates();
});

afterAll(() => {
  fft.cleanup();
});

describe('score-branch suppression', () => {
  it('creates a deepener follow-up for qualifying scores without crisis language (control)', async () => {
    await evaluateFollowUpOnCompletion(
      ASSIGNMENT_ID,
      dailyScaleAssignment(),
      [
        { response_score: 9, response_text: 'we felt really close' },
        { response_score: 10, response_text: 'a lovely week together' },
      ],
      USER_ID
    );

    expect(followUpCreates()).toHaveLength(1);
    expect(followUpCreates()[0].data.assignment_kind).toBe('follow_up');
    expect(suppressionEvents()).toHaveLength(0);
  });

  it('suppresses the follow-up when one response contains crisis language despite qualifying scores', async () => {
    await evaluateFollowUpOnCompletion(
      ASSIGNMENT_ID,
      dailyScaleAssignment(),
      [
        { response_score: 9, response_text: CRISIS_TEXT },
        { response_score: 10, response_text: 'a lovely week together' },
      ],
      USER_ID
    );

    expect(followUpCreates()).toHaveLength(0);
    expect(suppressionEvents()).toHaveLength(1);
  });

  it('suppresses when the OTHER partner wrote the crisis text (either response counts)', async () => {
    // Repair-qualifying scores (min <= 4) with crisis language in the second response
    await evaluateFollowUpOnCompletion(
      ASSIGNMENT_ID,
      dailyScaleAssignment(),
      [
        { response_score: 3, response_text: 'it was a rough week' },
        { response_score: 5, response_text: 'I am afraid of him sometimes' },
      ],
      USER_ID
    );

    expect(followUpCreates()).toHaveLength(0);
    expect(suppressionEvents()).toHaveLength(1);
  });

  it('logs a neutral event only — assignment id, never response content', async () => {
    await evaluateFollowUpOnCompletion(
      ASSIGNMENT_ID,
      dailyScaleAssignment(),
      [
        { response_score: 9, response_text: CRISIS_TEXT },
        { response_score: 10, response_text: 'fine' },
      ],
      USER_ID
    );

    expect(logEvent).toHaveBeenCalledWith(
      'follow_up_suppressed_safety',
      USER_ID,
      COUPLE_ID,
      { assignment_id: ASSIGNMENT_ID }
    );
    // Nothing anywhere in the logged payloads may contain the response text.
    const serialized = JSON.stringify(logEvent.mock.calls);
    expect(serialized).not.toContain('hurt myself');
    expect(serialized).not.toContain(CRISIS_TEXT);
    // And the suppressed path never writes any document.
    expect(store.writeLog).toHaveLength(0);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('handles missing response_text safely (scale responses without notes)', async () => {
    await evaluateFollowUpOnCompletion(
      ASSIGNMENT_ID,
      dailyScaleAssignment(),
      [
        { response_score: 9, response_text: null },
        { response_score: 10 },
      ],
      USER_ID
    );

    // No crisis language — normal deepener path proceeds.
    expect(followUpCreates()).toHaveLength(1);
    expect(suppressionEvents()).toHaveLength(0);
  });
});

describe('repair step-2 chaining suppression', () => {
  it('chains repair step 2 for a clean step-1 completion (control)', async () => {
    await evaluateFollowUpOnCompletion(
      'fu-step1',
      repairStepOneAssignment(),
      [
        { response_score: null, response_text: 'we talked it through' },
        { response_score: null, response_text: 'it helped to name it' },
      ],
      USER_ID
    );

    expect(followUpCreates()).toHaveLength(1);
    const created = followUpCreates()[0].data as { follow_up?: { branch?: string; step?: number } };
    expect(created.follow_up?.branch).toBe('repair');
    expect(created.follow_up?.step).toBe(2);
  });

  it('does NOT chain step 2 when a step-1 response contains crisis language', async () => {
    await evaluateFollowUpOnCompletion(
      'fu-step1',
      repairStepOneAssignment(),
      [
        { response_score: null, response_text: CRISIS_TEXT },
        { response_score: null, response_text: 'it helped to name it' },
      ],
      USER_ID
    );

    expect(followUpCreates()).toHaveLength(0);
    expect(suppressionEvents()).toHaveLength(1);
    expect(logEvent).toHaveBeenCalledWith(
      'follow_up_suppressed_safety',
      USER_ID,
      COUPLE_ID,
      { assignment_id: 'fu-step1' }
    );
  });
});
