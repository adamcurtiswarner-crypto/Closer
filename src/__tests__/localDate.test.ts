/**
 * Tests for src/utils/localDate.ts.
 *
 * Regression contract: "today" must be the DEVICE-LOCAL calendar day, never
 * the UTC date. `toISOString().split('T')[0]` at 8 PM Eastern reads tomorrow,
 * which used to blank the Today screen and pull next-day delivery early.
 */
import { todayLocalISO, localDateWindow } from '../utils/localDate';

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
