/**
 * Unit tests for the timezone-local delivery date logic in prompts.ts.
 *
 * The bug being locked down: deliverPromptToCouple used to compute "today"
 * from server UTC. Midnight UTC is 8 PM US/Eastern, so opening the app after
 * 8 PM ET created (and pushed) TOMORROW's assignment the same evening —
 * "Today's prompt is ready." at 8 PM after the couple had already answered
 * that morning. "Today" must always be the USER's local calendar day, and
 * dedupe must hold across a ±1-day window so partners in different timezones
 * cannot double-deliver around a date boundary.
 */

import * as functionsTest from 'firebase-functions-test';
import {
  assignmentDateWindow,
  shouldDeliverDaily,
  DAILY_REDELIVERY_COOLDOWN_MS,
} from '../prompts';
import { findDueScheduledFollowUp } from '../followUps';
import { TZ_SCENARIOS, wallClockAt } from './fixtures/tzMatrix';

const test = functionsTest.default();

describe('assignmentDateWindow — tz-local "today"', () => {
  // 00:30 UTC on July 9 = 8:30 PM on July 8 in New York (UTC-4 in July)
  const utcMidnightBoundary = new Date('2026-07-09T00:30:00Z');

  it('computes today in the user timezone, not server UTC (the phantom-push bug)', () => {
    const ny = assignmentDateWindow('America/New_York', utcMidnightBoundary);
    expect(ny.today).toBe('2026-07-08'); // still July 8 for the user

    const utc = assignmentDateWindow('UTC', utcMidnightBoundary);
    expect(utc.today).toBe('2026-07-09'); // the old buggy value
  });

  it('computes today ahead of UTC for eastern-hemisphere timezones', () => {
    // 8 PM UTC on July 9 = 5 AM July 10 in Tokyo (UTC+9)
    const window = assignmentDateWindow('Asia/Tokyo', new Date('2026-07-09T20:00:00Z'));
    expect(window.today).toBe('2026-07-10');
  });

  it('returns a contiguous ±1-day window around the local today', () => {
    const window = assignmentDateWindow('America/New_York', utcMidnightBoundary);
    expect(window).toEqual({
      yesterday: '2026-07-07',
      today: '2026-07-08',
      tomorrow: '2026-07-09',
    });
  });

  it('spans month boundaries correctly', () => {
    // 1 AM UTC on Aug 1 = 9 PM July 31 in New York
    const window = assignmentDateWindow('America/New_York', new Date('2026-08-01T01:00:00Z'));
    expect(window).toEqual({
      yesterday: '2026-07-30',
      today: '2026-07-31',
      tomorrow: '2026-08-01',
    });
  });

  it('falls back to UTC when the timezone is empty', () => {
    const window = assignmentDateWindow('', utcMidnightBoundary);
    expect(window.today).toBe('2026-07-09');
  });

  it('matches UTC and local dates when no boundary is crossed', () => {
    const midday = new Date('2026-07-09T16:00:00Z'); // noon in New York
    expect(assignmentDateWindow('America/New_York', midday).today).toBe('2026-07-09');
    expect(assignmentDateWindow('UTC', midday).today).toBe('2026-07-09');
  });
});

// ---------------------------------------------------------------------------
// shouldDeliverDaily — "the day always arrives" (founder decision 2026-07-10).
//
// Replaces hasLiveAssignmentInWindow, whose OLD semantics blocked delivery
// whenever ANY live assignment sat in the ±1-day window — so yesterday's
// 'partial' held today's prompt hostage to the slow partner. NEW semantics:
// deliver unless (1) a non-expired non-explore assignment is dated >= today,
// or (2) the newest non-explore assignment was created within the last ~20h
// (cross-timezone rollover cooldown).
// ---------------------------------------------------------------------------
describe('shouldDeliverDaily — the day always arrives', () => {
  const TODAY = '2026-07-10';
  const YESTERDAY = '2026-07-09';
  const TOMORROW = '2026-07-11';
  // 7 PM UTC on the local "today" — an ordinary evening delivery slot.
  const NOW_MS = Date.parse('2026-07-10T19:00:00Z');
  const hoursAgo = (h: number): number => NOW_MS - h * 60 * 60 * 1000;

  it('delivers into an empty window', () => {
    expect(shouldDeliverDaily([], TODAY, NOW_MS)).toBe(true);
  });

  it("delivers over yesterday's stale partial — the founder scenario (2026-07-10)", () => {
    // OLD behavior: yesterday's partial blocked today's prompt until the slow
    // partner answered or it expired. NEW: the sealed day stays open, and a
    // fresh question still arrives.
    const assignments = [
      { status: 'partial', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(24) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(true);
  });

  it("delivers over yesterday's stale delivered (neither partner answered)", () => {
    const assignments = [
      { status: 'delivered', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(22) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(true);
  });

  it('skips when yesterday-dated assignment was created only 6h ago (late-night cross-tz delivery)', () => {
    // Rule 2 cooldown: partners' local dates straddle midnight — a prompt
    // delivered late in one partner's local yesterday must not be followed by
    // a second prompt a few hours later in the other partner's local today.
    const assignments = [
      { status: 'partial', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(6) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it('skips for each live status dated today (delivered, partial, completed)', () => {
    for (const status of ['delivered', 'partial', 'completed']) {
      const assignments = [
        { status, source: 'daily', assigned_date: TODAY, created_at: hoursAgo(2) },
      ];
      expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
    }
  });

  it("skips for a 'scheduled' follow-up dated today (activateDueFollowUp will activate it)", () => {
    // Even created long ago: the day is already handled by the follow-up.
    const assignments = [
      { status: 'scheduled', source: 'daily', assigned_date: TODAY, created_at: hoursAgo(30) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it('skips for a tz-shifted live assignment dated tomorrow', () => {
    const assignments = [
      { status: 'delivered', source: 'daily', assigned_date: TOMORROW, created_at: hoursAgo(1) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it("delivers when the window holds only yesterday's expired assignment", () => {
    const assignments = [
      { status: 'expired', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(40) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(true);
  });

  it('expired status never blocks via the date rule, even dated today', () => {
    const assignments = [
      { status: 'expired', source: 'daily', assigned_date: TODAY, created_at: hoursAgo(30) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(true);
  });

  it('the ~20h cooldown counts ANY status — even an expired doc created recently', () => {
    // Belt-and-braces: two daily prompts must never arrive within ~20h.
    const assignments = [
      { status: 'expired', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(6) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it('explore assignments never block, whatever their shape', () => {
    const assignments = [
      { status: 'partial', source: 'explore', assigned_date: TODAY, created_at: hoursAgo(1) },
      { status: 'delivered', source: 'explore', assigned_date: TODAY, created_at: hoursAgo(2) },
      { status: 'completed', source: 'explore', assigned_date: TOMORROW, created_at: hoursAgo(0.5) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(true);
  });

  it('still skips when a live daily assignment hides among explore ones', () => {
    const assignments = [
      { status: 'partial', source: 'explore', assigned_date: TODAY, created_at: hoursAgo(1) },
      { status: 'delivered', source: 'daily', assigned_date: TODAY, created_at: hoursAgo(2) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it('treats a missing created_at as old — the date rule alone decides', () => {
    // Dated yesterday, no created_at: deliver.
    expect(
      shouldDeliverDaily(
        [{ status: 'partial', source: 'daily', assigned_date: YESTERDAY }],
        TODAY,
        NOW_MS
      )
    ).toBe(true);
    // Dated today, no created_at: still skip via the date rule.
    expect(
      shouldDeliverDaily(
        [{ status: 'partial', source: 'daily', assigned_date: TODAY }],
        TODAY,
        NOW_MS
      )
    ).toBe(false);
  });

  it('treats a missing status as live when dated today (never double-deliver on bad data)', () => {
    expect(
      shouldDeliverDaily([{ source: 'daily', assigned_date: TODAY }], TODAY, NOW_MS)
    ).toBe(false);
  });

  it('handles Firestore Timestamp-shaped created_at via toMillis()', () => {
    const timestampLike = { toMillis: () => hoursAgo(3) };
    expect(
      shouldDeliverDaily(
        [{ status: 'partial', source: 'daily', assigned_date: YESTERDAY, created_at: timestampLike }],
        TODAY,
        NOW_MS
      )
    ).toBe(false);
  });

  it('cooldown boundary: exactly 20h old no longer blocks; just under does', () => {
    const base = { status: 'partial', source: 'daily', assigned_date: YESTERDAY };
    expect(
      shouldDeliverDaily(
        [{ ...base, created_at: NOW_MS - DAILY_REDELIVERY_COOLDOWN_MS }],
        TODAY,
        NOW_MS
      )
    ).toBe(true);
    expect(
      shouldDeliverDaily(
        [{ ...base, created_at: NOW_MS - DAILY_REDELIVERY_COOLDOWN_MS + 1 }],
        TODAY,
        NOW_MS
      )
    ).toBe(false);
  });

  it('uses the NEWEST non-explore created_at for the cooldown', () => {
    // Yesterday's stale daily is old enough, but a follow-up created 5h ago
    // (any non-explore doc) keeps the cooldown active.
    const assignments = [
      { status: 'partial', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(26) },
      { status: 'expired', source: 'daily', assigned_date: YESTERDAY, created_at: hoursAgo(5) },
    ];
    expect(shouldDeliverDaily(assignments, TODAY, NOW_MS)).toBe(false);
  });

  it("blocks the evening re-delivery scenario: this morning's completed prompt is in the window", () => {
    // Original phantom-push scenario: answered this morning (completed, dated
    // local today). At 8:30 PM ET the old UTC "today" rolled to tomorrow and
    // delivered again. With the tz-local window, the completed assignment is
    // dated >= local today and still blocks a second delivery.
    const instant = new Date('2026-07-09T00:30:00Z');
    const window = assignmentDateWindow('America/New_York', instant);
    const assignments = [
      {
        assigned_date: window.today,
        status: 'completed',
        source: 'daily',
        created_at: instant.getTime() - 10 * 60 * 60 * 1000,
      },
    ];
    const inWindow = assignments.filter(
      (a) => a.assigned_date >= window.yesterday && a.assigned_date <= window.tomorrow
    );
    expect(shouldDeliverDaily(inWindow, window.today, instant.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shared tz/DST scenario matrix — the SERVER half of the client/server
// contract. The same fixture table drives the client-side assertions in
// src/__tests__/localDate.test.ts (localDateWindow). For any instant, the
// server's assignmentDateWindow(tz) must agree with the matrix's expected
// local date, and windows for cross-timezone partners must intersect so a
// prompt dated in one partner's timezone stays visible to the other.
//
// The client's localDateWindow(deviceNow) is exactly the ±1-day window
// around the device-local calendar day — the same shape as
// assignmentDateWindow — so `clientWindowFor` mirrors it here (the client
// package cannot be imported across the npm boundary; the shared fixture
// table keeps the two suites asserting the same expectations).
// ---------------------------------------------------------------------------

describe('tz/DST scenario matrix (shared with src localDate.test.ts)', () => {
  /** Mirror of the client's localDateWindow() for a device in `tz`. */
  const clientWindowFor = (instantUtc: string, tz: string): [string, string, string] => {
    const localISO = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const deviceNow = wallClockAt(instantUtc, tz);
    const dayMs = 86400000;
    return [
      localISO(new Date(deviceNow.getTime() - dayMs)),
      localISO(deviceNow),
      localISO(new Date(deviceNow.getTime() + dayMs)),
    ];
  };

  it.each(TZ_SCENARIOS.map((s) => [s.name, s] as const))(
    '%s — server tz-local today matches the matrix',
    (_name, scenario) => {
      const window = assignmentDateWindow(scenario.timezone, new Date(scenario.instantUtc));
      expect(window.today).toBe(scenario.expectedLocalDate);
      // Window is contiguous around today.
      expect(window.yesterday < window.today && window.today < window.tomorrow).toBe(true);
    }
  );

  it.each(
    TZ_SCENARIOS.filter((s) => s.partnerTimezone).map((s) => [s.name, s] as const)
  )('%s — server windows for both partners intersect', (_name, scenario) => {
    const mine = assignmentDateWindow(scenario.timezone, new Date(scenario.instantUtc));
    const partners = assignmentDateWindow(
      scenario.partnerTimezone!,
      new Date(scenario.instantUtc)
    );

    // An assignment dated "today" in either partner's timezone must fall
    // inside the OTHER partner's dedupe window (no double delivery, no
    // invisible assignment).
    expect(partners.today >= mine.yesterday && partners.today <= mine.tomorrow).toBe(true);
    expect(mine.today >= partners.yesterday && mine.today <= partners.tomorrow).toBe(true);
    expect(partners.today).toBe(scenario.expectedPartnerLocalDate);
  });

  it.each(TZ_SCENARIOS.map((s) => [s.name, s] as const))(
    '%s — client window and server window intersect for the same instant',
    (_name, scenario) => {
      const server = assignmentDateWindow(scenario.timezone, new Date(scenario.instantUtc));
      const client = clientWindowFor(scenario.instantUtc, scenario.timezone);

      // Same device+user timezone: the two "today"s must be identical, and
      // each side's today must sit inside the other's window.
      expect(client[1]).toBe(server.today);
      expect(client).toContain(server.today);
      expect(server.today >= client[0] && server.today <= client[2]).toBe(true);
      expect(client[1] >= server.yesterday && client[1] <= server.tomorrow).toBe(true);
    }
  );

  it('jest runs with TZ pinned to UTC (machine-independence guard)', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(new Date().getTimezoneOffset()).toBe(0);
  });
});

describe('activateDueFollowUp catch-up semantics with tz-local today', () => {
  it('activates a follow-up scheduled for an earlier local date (<= today, not strict equality)', () => {
    // A follow-up scheduled while "today" was still UTC-based must not be
    // stranded when the local date is one day behind.
    const scheduled = [{ assigned_date: '2026-07-08' }];
    expect(findDueScheduledFollowUp(scheduled, '2026-07-09')).toEqual(scheduled[0]);
    expect(findDueScheduledFollowUp(scheduled, '2026-07-08')).toEqual(scheduled[0]);
  });

  it('does not activate a follow-up scheduled for a future local date', () => {
    const scheduled = [{ assigned_date: '2026-07-10' }];
    expect(findDueScheduledFollowUp(scheduled, '2026-07-09')).toBeNull();
  });
});

afterAll(() => {
  test.cleanup();
});
