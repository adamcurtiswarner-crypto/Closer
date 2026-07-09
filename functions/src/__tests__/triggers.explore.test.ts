/**
 * Explore-source push branching in onResponseSubmitted (triggers.ts).
 *
 * Answering an explore prompt = sending your partner a question:
 *   - first response  -> partner gets "sent you a question: \"...\"" with
 *     data { type: 'explore_question', assignment_id, prompt_id }
 *   - second response -> first responder gets "answered your question. See
 *     both answers." with data { type: 'explore_complete', assignment_id }
 * Daily prompts keep their existing copy and data types exactly.
 */
import * as functionsTest from 'firebase-functions-test';

// ---------------------------------------------------------------------------
// In-memory Firestore fake (same harness as triggers.race.test.ts).
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

  return {
    db: { collection: makeCollection },
    __store: { docs, writeLog },
    APP_NAME: 'Stoke',
    DEPTH_THRESHOLD: 3,
    DEEP_WEEK_FLOOR: 4,
    DEFAULT_SCALE_CONFIG: {
      min: 1,
      max: 10,
      low_threshold: 4,
      high_threshold: 9,
      divergence_gap: 4,
      min_label: 'Struggling',
      max_label: 'Thriving',
    },
    initializeDepthProgress: () => ({}),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    reportError: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../followUps', () => ({
  ...jest.requireActual('../followUps'),
  evaluateFollowUpOnCompletion: jest.fn().mockResolvedValue(undefined),
}));

import { onResponseSubmitted, truncatePromptText } from '../triggers';
import * as shared from '../shared';

const fft = functionsTest.default();
const wrapped = fft.wrap(onResponseSubmitted);

const store = (shared as unknown as {
  __store: {
    docs: Map<string, Record<string, unknown>>;
    writeLog: Array<{ op: string; path: string; data: Record<string, unknown> }>;
  };
}).__store;

const sendPushNotification = shared.sendPushNotification as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ASSIGNMENT_ID = 'assign-explore-1';
const COUPLE_ID = 'couple-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const PROMPT_ID = 'prompt-1';
const PROMPT_TEXT = 'What made you smile today?';

function makeResponse(userId: string, submittedAt: Date): Record<string, unknown> {
  return {
    assignment_id: ASSIGNMENT_ID,
    couple_id: COUPLE_ID,
    user_id: userId,
    prompt_id: PROMPT_ID,
    response_text: 'a thoughtful answer',
    response_score: null,
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
    prompt_text: PROMPT_TEXT,
    prompt_type: 'daily_connection',
    category: 'daily_connection',
    source: 'explore',
    response_format: 'text',
    status: 'delivered',
    response_count: 0,
    first_responder_id: null,
    ...assignmentOverrides,
  });
  store.docs.set(`couples/${COUPLE_ID}`, {
    member_ids: [USER_A, USER_B],
    status: 'active',
  });
  store.docs.set(`users/${USER_A}`, { display_name: 'Alex' });
  store.docs.set(`users/${USER_B}`, { display_name: 'Blake' });
  store.docs.set(`prompts/${PROMPT_ID}`, {
    type: 'daily_connection',
    emotional_depth: 'surface',
  });
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
// truncatePromptText
// ---------------------------------------------------------------------------

describe('truncatePromptText', () => {
  it('leaves short prompts untouched', () => {
    expect(truncatePromptText('Short question?')).toBe('Short question?');
  });

  it('trims to ~60 chars with a single ellipsis, no trailing space', () => {
    const long =
      'What is the one thing you have always wanted to ask me but never quite found the moment for?';
    const truncated = truncatePromptText(long);
    expect(truncated.length).toBeLessThanOrEqual(60);
    expect(truncated.endsWith('…')).toBe(true);
    expect(truncated).not.toMatch(/\s…$/);
  });

  it('handles empty/undefined-ish input', () => {
    expect(truncatePromptText('')).toBe('');
    expect(truncatePromptText('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Explore first response — "sent you a question"
// ---------------------------------------------------------------------------

describe('explore first response', () => {
  it("notifies the partner with the question copy and explore_question deep-link data", async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({ response_count: 1, first_responder_id: USER_A, status: 'partial' });

    await wrapped(makeSnap(first));

    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_B,
      {
        title: 'Alex',
        body: `sent you a question: "${PROMPT_TEXT}"`,
      },
      {
        type: 'explore_question',
        assignment_id: ASSIGNMENT_ID,
        prompt_id: PROMPT_ID,
      }
    );
  });

  it('truncates a long prompt in the push body', async () => {
    const longPrompt =
      'What is the one thing you have always wanted to ask me but never quite found the moment for?';
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({
      prompt_text: longPrompt,
      response_count: 1,
      first_responder_id: USER_A,
      status: 'partial',
    });

    await wrapped(makeSnap(first));

    const body = sendPushNotification.mock.calls[0][1].body as string;
    expect(body).toBe(`sent you a question: "${truncatePromptText(longPrompt)}"`);
    expect(body).toContain('…');
  });

  it('personalizes {partner}/{me} tokens FOR THE RECIPIENT before quoting', async () => {
    // Recipient is USER_B (Blake): {partner} = the sender (Alex), {me} = Blake.
    const tokenized = 'How sure are you that {partner} would show up for {me}?';
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({
      prompt_text: tokenized,
      response_count: 1,
      first_responder_id: USER_A,
      status: 'partial',
    });

    await wrapped(makeSnap(first));

    const body = sendPushNotification.mock.calls[0][1].body as string;
    expect(body).toBe('sent you a question: "How sure are you that Alex would show up for Blake?"');
    expect(body).not.toContain('{partner}');
    expect(body).not.toContain('{me}');
  });

  it('falls back to "your partner"/"you" when display names are missing', async () => {
    const tokenized = '{partner} wants to know: what made {me} smile today?';
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({
      prompt_text: tokenized,
      response_count: 1,
      first_responder_id: USER_A,
      status: 'partial',
    });
    store.docs.set(`users/${USER_A}`, {}); // sender never set a display name
    store.docs.set(`users/${USER_B}`, {}); // recipient neither

    await wrapped(makeSnap(first));

    const body = sendPushNotification.mock.calls[0][1].body as string;
    expect(body).toBe(
      'sent you a question: "Your partner wants to know: what made you smile today?"'
    );
  });

  it('personalizes BEFORE truncating so tokens never straddle the ellipsis', async () => {
    // 55 chars before the token — the token itself would be cut mid-way if
    // truncation ran first; personalizing first keeps the name intact.
    const tokenized =
      'What is one small thing from this week you never told {partner} about at all?';
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({
      prompt_text: tokenized,
      response_count: 1,
      first_responder_id: USER_A,
      status: 'partial',
    });

    await wrapped(makeSnap(first));

    const body = sendPushNotification.mock.calls[0][1].body as string;
    expect(body).toContain('Alex');
    expect(body).not.toContain('{');
    expect(body).not.toContain('}');
  });

  it("respects the partner's notify_partner_response opt-out", async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedBaseDocs({ response_count: 1, first_responder_id: USER_A, status: 'partial' });
    store.docs.set(`users/${USER_B}`, {
      display_name: 'Blake',
      notify_partner_response: false,
    });

    await wrapped(makeSnap(first));

    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Explore completion — "answered your question"
// ---------------------------------------------------------------------------

describe('explore completion', () => {
  it('notifies the first responder with explore copy and explore_complete data', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-08T11:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    store.docs.set('prompt_responses/resp-2', second);
    seedBaseDocs({ response_count: 2, first_responder_id: USER_A, status: 'completed' });

    await wrapped(makeSnap(second));

    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_A,
      {
        title: 'Blake',
        body: 'answered your question. See both answers.',
      },
      {
        type: 'explore_complete',
        assignment_id: ASSIGNMENT_ID,
      }
    );
  });

  it('writes the completion with the explore assignment category (Hearth visibility)', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-08T11:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    store.docs.set('prompt_responses/resp-2', second);
    seedBaseDocs({ response_count: 2, first_responder_id: USER_A, status: 'completed' });

    await wrapped(makeSnap(second));

    const completion = store.docs.get(`prompt_completions/${ASSIGNMENT_ID}`)!;
    expect(completion.category).toBe('daily_connection');
  });
});

// ---------------------------------------------------------------------------
// Daily prompts keep their copy EXACTLY
// ---------------------------------------------------------------------------

describe('daily prompts are untouched', () => {
  function seedDaily(overrides: Record<string, unknown>): void {
    seedBaseDocs(overrides);
    const assignment = store.docs.get(`prompt_assignments/${ASSIGNMENT_ID}`)!;
    delete (assignment as Record<string, unknown>).source;
    store.docs.set(`prompt_assignments/${ASSIGNMENT_ID}`, assignment);
  }

  it('first daily response keeps the existing nudge copy and data type', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    seedDaily({ response_count: 1, first_responder_id: USER_A, status: 'partial' });

    await wrapped(makeSnap(first));

    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_B,
      {
        title: 'Alex',
        body: "answered today's prompt. Your turn — takes 2 minutes.",
      },
      { type: 'partner_responded' }
    );
  });

  it('daily completion keeps the existing reveal copy and data type', async () => {
    const first = makeResponse(USER_A, new Date('2026-07-08T10:00:00Z'));
    const second = makeResponse(USER_B, new Date('2026-07-08T11:00:00Z'));
    store.docs.set('prompt_responses/resp-1', first);
    store.docs.set('prompt_responses/resp-2', second);
    seedDaily({ response_count: 2, first_responder_id: USER_A, status: 'completed' });

    await wrapped(makeSnap(second));

    expect(sendPushNotification).toHaveBeenCalledWith(
      USER_A,
      {
        title: 'Blake',
        body: 'answered too. Tap to reveal both responses.',
      },
      { type: 'prompt' }
    );
  });
});
