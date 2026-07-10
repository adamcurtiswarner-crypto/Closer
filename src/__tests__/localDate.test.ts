/**
 * Tests for src/utils/localDate.ts.
 *
 * Regression contract: "today" must be the DEVICE-LOCAL calendar day, never
 * the UTC date. `toISOString().split('T')[0]` at 8 PM Eastern reads tomorrow,
 * which used to blank the Today screen and pull next-day delivery early.
 */
import { todayLocalISO, localDateWindow } from '../utils/localDate';
import { TZ_SCENARIOS, wallClockAt } from './fixtures/tzMatrix';

describe('todayLocalISO', () => {
  it('formats the local date as YYYY-MM-DD with zero padding', () => {
    // Local-time constructor — no timezone math involved
    expect(todayLocalISO(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    expect(todayLocalISO(new Date(2026, 10, 30, 0, 0, 1))).toBe('2026-11-30');
  });

  it('uses the LOCAL day even when UTC has already rolled over', () => {
    const elevenPmLocal = new Date(2026, 6, 8, 23, 30, 0);
    // For any device west of UTC this instant is already 2026-07-09 in UTC;
    // the local day must win regardless of the machine running the tests.
    expect(todayLocalISO(elevenPmLocal)).toBe('2026-07-08');
    const offsetMinutes = elevenPmLocal.getTimezoneOffset();
    if (offsetMinutes > 30) {
      expect(elevenPmLocal.toISOString().split('T')[0]).not.toBe('2026-07-08');
    }
  });

  it('defaults to now', () => {
    const now = new Date();
    expect(todayLocalISO()).toBe(todayLocalISO(now));
  });
});

describe('localDateWindow', () => {
  it('returns [yesterday, today, tomorrow] around the local day', () => {
    expect(localDateWindow(new Date(2026, 6, 8, 9, 0, 0))).toEqual([
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
    ]);
  });

  it('crosses month and year boundaries', () => {
    expect(localDateWindow(new Date(2026, 0, 1, 9, 0, 0))).toEqual([
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
  });

  it('keeps todayLocalISO as the middle element', () => {
    const now = new Date(2026, 2, 15, 20, 45, 0);
    expect(localDateWindow(now)[1]).toBe(todayLocalISO(now));
  });
});

// ---------------------------------------------------------------------------
// Shared tz/DST scenario matrix — the CLIENT half of the client/server
// contract. The same fixture table drives the server-side assertions in
// functions/src/__tests__/prompts.tz.test.ts (assignmentDateWindow). For any
// instant, the device-local window computed here must contain the server's
// tz-local "today" AND the partner's local date — otherwise assignments
// vanish around date boundaries.
//
// These tests are machine-independent because jest.config.js pins
// process.env.TZ = 'UTC': wallClockAt() reconstructs the wall clock a device
// in the scenario timezone would observe, and the Date getters used by
// localDate.ts then read exactly those components.
// ---------------------------------------------------------------------------

describe('tz/DST scenario matrix (shared with functions prompts.tz.test.ts)', () => {
  it.each(TZ_SCENARIOS.map((s) => [s.name, s] as const))(
    '%s — device-local day matches the matrix',
    (_name, scenario) => {
      const deviceNow = wallClockAt(scenario.instantUtc, scenario.timezone);
      expect(todayLocalISO(deviceNow)).toBe(scenario.expectedLocalDate);

      const window = localDateWindow(deviceNow);
      expect(window[1]).toBe(scenario.expectedLocalDate);
      // Window is contiguous: [yesterday, today, tomorrow]
      expect(window).toHaveLength(3);
      expect(window[0] < window[1] && window[1] < window[2]).toBe(true);
    }
  );

  it.each(
    TZ_SCENARIOS.filter((s) => s.partnerTimezone).map((s) => [s.name, s] as const)
  )('%s — partner windows intersect (both directions)', (_name, scenario) => {
    const myWindow = localDateWindow(wallClockAt(scenario.instantUtc, scenario.timezone));
    const partnerWindow = localDateWindow(
      wallClockAt(scenario.instantUtc, scenario.partnerTimezone!)
    );

    // My window must include the partner's "today" and vice versa — the
    // contract that lets each client see an assignment the server dated in
    // the OTHER partner's timezone.
    expect(myWindow).toContain(scenario.expectedPartnerLocalDate);
    expect(partnerWindow).toContain(scenario.expectedLocalDate);

    // And the raw windows overlap on at least one date.
    expect(myWindow.some((d) => partnerWindow.includes(d))).toBe(true);
  });

  it('jest runs with TZ pinned to UTC (machine-independence guard)', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(new Date().getTimezoneOffset()).toBe(0);
  });
});
