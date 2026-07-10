/**
 * Regression tests for the SEV-0 content death spiral in prompt selection
 * (prompts.ts).
 *
 * The bug being locked down: the live daily pool is 100% scale-format prompts
 * at 'medium'/'deep' emotional depth — zero 'surface' prompts exist. Depth
 * progression starts every category at 'surface' and requires surface
 * completions to advance, which is impossible with no surface prompts, so
 * every category a couple answered locked permanently. The pool exhausted in
 * ~2 weeks, and the old empty-pool fallback (`poolDocs[0]`) then served the
 * SAME deterministic prompt every single day.
 *
 * Fixes under test:
 *  1. isPromptEligible — scale prompts are exempt from depth progression
 *     (depth still gates legacy text prompts); recency, week restriction,
 *     day preference, and max-per-week still apply to scale prompts.
 *  2. selectFallbackPrompt — least-recently-used with a shrinking recency
 *     window; never serves the same prompt two days in a row while more
 *     than one prompt exists; selection is randomized, not deterministic.
 */

import * as functionsTest from 'firebase-functions-test';
import {
  isPromptEligible,
  selectFallbackPrompt,
  PromptEligibilityContext,
} from '../prompts';

const fft = functionsTest.default();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TODAY = '2026-07-09';
const YESTERDAY = '2026-07-08';

/** Every category locked at 'surface' — the exact production lock state. */
function lockedAtSurface(types: string[]): Record<string, { level: string }> {
  const progress: Record<string, { level: string }> = {};
  for (const type of types) {
    progress[type] = { level: 'surface' };
  }
  return progress;
}

function makeCtx(overrides: Partial<PromptEligibilityContext> = {}): PromptEligibilityContext {
  return {
    recentPromptIds: [],
    weekNumber: 10,
    currentDayOfWeek: 3,
    weeklyTypeCounts: {},
    depthProgress: lockedAtSurface([
      'communication',
      'intimacy',
      'love_map_update',
      'bid_for_connection',
    ]),
    ...overrides,
  };
}

const scalePrompt = (overrides: Record<string, unknown> = {}) => ({
  response_format: 'scale',
  type: 'communication',
  emotional_depth: 'medium',
  text: 'How connected did you feel this week?',
  ...overrides,
});

const textPrompt = (overrides: Record<string, unknown> = {}) => ({
  response_format: 'text',
  type: 'love_map_update',
  emotional_depth: 'medium',
  text: 'What is one thing on your partner’s mind lately?',
  ...overrides,
});

// ---------------------------------------------------------------------------
// isPromptEligible — depth exemption for scale prompts (the death spiral fix)
// ---------------------------------------------------------------------------

describe('isPromptEligible — scale prompts are exempt from depth progression', () => {
  it('allows a medium scale prompt when the category is locked at surface (regression)', () => {
    expect(isPromptEligible('p1', scalePrompt(), makeCtx())).toBe(true);
  });

  it('allows a deep scale prompt when the category is locked at surface', () => {
    expect(
      isPromptEligible('p1', scalePrompt({ emotional_depth: 'deep' }), makeCtx())
    ).toBe(true);
  });

  it('allows scale prompts of every depth regardless of the recorded level', () => {
    for (const level of ['surface', 'medium', 'deep']) {
      for (const promptDepth of ['surface', 'medium', 'deep']) {
        const ctx = makeCtx({ depthProgress: { communication: { level } } });
        expect(
          isPromptEligible('p1', scalePrompt({ emotional_depth: promptDepth }), ctx)
        ).toBe(true);
      }
    }
  });

  it('allows a scale prompt whose category has no depth_progress entry yet', () => {
    expect(
      isPromptEligible('p1', scalePrompt({ type: 'money' }), makeCtx())
    ).toBe(true);
  });

  it('still gates legacy TEXT prompts: medium text prompt is blocked at surface level', () => {
    expect(isPromptEligible('p1', textPrompt(), makeCtx())).toBe(false);
  });

  it('still gates legacy text prompts without an explicit response_format', () => {
    const legacy = textPrompt({ emotional_depth: 'deep' });
    delete (legacy as Record<string, unknown>).response_format;
    expect(isPromptEligible('p1', legacy, makeCtx())).toBe(false);
  });

  it('allows a text prompt at or below the couple’s level', () => {
    const ctx = makeCtx({
      depthProgress: { love_map_update: { level: 'medium' } },
    });
    expect(isPromptEligible('p1', textPrompt(), ctx)).toBe(true);
    expect(
      isPromptEligible('p1', textPrompt({ emotional_depth: 'surface' }), ctx)
    ).toBe(true);
    expect(
      isPromptEligible('p1', textPrompt({ emotional_depth: 'deep' }), ctx)
    ).toBe(false);
  });
});

describe('isPromptEligible — the other filters still apply to scale prompts', () => {
  it('excludes a scale prompt used in the last 30 days', () => {
    const ctx = makeCtx({ recentPromptIds: ['p1'] });
    expect(isPromptEligible('p1', scalePrompt(), ctx)).toBe(false);
    expect(isPromptEligible('p2', scalePrompt(), ctx)).toBe(true);
  });

  it('enforces week_restriction on scale prompts', () => {
    const restricted = scalePrompt({ week_restriction: 8 });
    expect(isPromptEligible('p1', restricted, makeCtx({ weekNumber: 2 }))).toBe(false);
    expect(isPromptEligible('p1', restricted, makeCtx({ weekNumber: 8 }))).toBe(true);
  });

  it('enforces day_preference on scale prompts', () => {
    const weekendOnly = scalePrompt({ day_preference: [0, 6] });
    expect(isPromptEligible('p1', weekendOnly, makeCtx({ currentDayOfWeek: 3 }))).toBe(false);
    expect(isPromptEligible('p1', weekendOnly, makeCtx({ currentDayOfWeek: 6 }))).toBe(true);
  });

  it('enforces max_per_week on scale prompts', () => {
    const capped = scalePrompt({ max_per_week: 2 });
    expect(
      isPromptEligible('p1', capped, makeCtx({ weeklyTypeCounts: { communication: 2 } }))
    ).toBe(false);
    expect(
      isPromptEligible('p1', capped, makeCtx({ weeklyTypeCounts: { communication: 1 } }))
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectFallbackPrompt — least-recently-used with shrinking recency window
// ---------------------------------------------------------------------------

describe('selectFallbackPrompt — shrinking recency window', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns null for an empty pool', () => {
    expect(selectFallbackPrompt([], new Map(), TODAY)).toBeNull();
  });

  it('returns the only prompt when the pool has exactly one (even if used yesterday)', () => {
    const last = new Map([['a', YESTERDAY]]);
    expect(selectFallbackPrompt([{ id: 'a' }], last, TODAY)).toEqual({ id: 'a' });
  });

  it('prefers a never-assigned prompt over recently used ones', () => {
    const last = new Map([
      ['a', YESTERDAY],
      ['b', '2026-07-01'],
      // 'c' never assigned
    ]);
    for (let i = 0; i < 25; i++) {
      expect(selectFallbackPrompt(pool, last, TODAY)!.id).toBe('c');
    }
  });

  it('prefers a prompt unused for 30+ days over anything more recent', () => {
    const last = new Map([
      ['a', '2026-05-01'], // > 30 days ago
      ['b', '2026-06-20'], // within 30 days
      ['c', YESTERDAY],
    ]);
    for (let i = 0; i < 25; i++) {
      expect(selectFallbackPrompt(pool, last, TODAY)!.id).toBe('a');
    }
  });

  it('shrinks to the 14-day window when nothing clears 30 days', () => {
    const last = new Map([
      ['a', '2026-06-20'], // 19 days ago — clears the 14-day window
      ['b', '2026-07-05'],
      ['c', YESTERDAY],
    ]);
    for (let i = 0; i < 25; i++) {
      expect(selectFallbackPrompt(pool, last, TODAY)!.id).toBe('a');
    }
  });

  it('shrinks to the 7-day window when nothing clears 14 days', () => {
    const last = new Map([
      ['a', '2026-06-30'], // 9 days ago — clears the 7-day window
      ['b', '2026-07-06'],
      ['c', YESTERDAY],
    ]);
    for (let i = 0; i < 25; i++) {
      expect(selectFallbackPrompt(pool, last, TODAY)!.id).toBe('a');
    }
  });

  it('never returns yesterday’s (or today’s) prompt while an alternative exists', () => {
    const last = new Map([
      ['a', YESTERDAY],
      ['b', '2026-07-07'],
      ['c', '2026-07-06'],
    ]);
    for (let i = 0; i < 200; i++) {
      const picked = selectFallbackPrompt(pool, last, TODAY)!;
      expect(picked.id).not.toBe('a');
    }
  });

  it('excludes the most recently assigned prompt even when ALL prompts were used within a day', () => {
    // Degenerate case (explore traffic can touch several prompts per day):
    // everything has a last-day date; the newest is still excluded.
    const last = new Map([
      ['a', TODAY],
      ['b', YESTERDAY],
      ['c', YESTERDAY],
    ]);
    for (let i = 0; i < 200; i++) {
      expect(selectFallbackPrompt(pool, last, TODAY)!.id).not.toBe('a');
    }
  });

  it('is randomized, not deterministic, within a window', () => {
    // 'b' and 'c' both clear the 30-day window; the injected random stream
    // must steer the choice.
    const last = new Map([['a', YESTERDAY]]);
    const low = selectFallbackPrompt(pool, last, TODAY, () => 0)!;
    const high = selectFallbackPrompt(pool, last, TODAY, () => 0.999)!;
    expect(low.id).not.toBe(high.id);
    expect(['b', 'c']).toContain(low.id);
    expect(['b', 'c']).toContain(high.id);

    // And with the real Math.random, both candidates show up over many draws.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(selectFallbackPrompt(pool, last, TODAY)!.id);
    }
    expect(seen).toEqual(new Set(['b', 'c']));
  });

  it('day-over-day simulation: an exhausted 3-prompt pool never repeats consecutively', () => {
    // Simulate 30 consecutive days of fallback-only serving. The assignment
    // history map is updated after each pick, exactly like production.
    const last = new Map<string, string>([
      ['a', '2026-07-06'],
      ['b', '2026-07-07'],
      ['c', YESTERDAY],
    ]);
    let previous: string | null = 'c'; // yesterday's prompt
    for (let offset = 0; offset < 30; offset++) {
      const today = new Date(2026, 6, 9 + offset); // rolls into August correctly
      const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const picked = selectFallbackPrompt(pool, last, todayLocal)!;
      expect(picked.id).not.toBe(previous);
      last.set(picked.id, todayLocal);
      previous = picked.id;
    }
  });
});

afterAll(() => {
  fft.cleanup();
});
