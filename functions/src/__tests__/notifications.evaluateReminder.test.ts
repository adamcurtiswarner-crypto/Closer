/**
 * Truth-table tests for the pure reminder state machine (notifications.ts).
 *
 * SEV-0 #7 regression contract: the old logic fired reminder 1 only in the
 * [4, 6) hour band. Default delivery is 19:00 local, so that band was always
 * 23:00-01:00 — inside quiet hours — and reminder 2 required count === 1, so
 * default-time users received ZERO reminders ever. The new machine:
 *
 *   - Reminder 1: >= 4h after delivery, 0 reminders sent, inside 8 AM-9 PM.
 *     Quiet hours DEFER (no ceiling), they never kill.
 *   - Morning consolidation: a first reminder landing >= 13h after delivery
 *     uses the reminder-2 copy and counts as BOTH (at most one morning nudge).
 *   - Reminder 2 proper: <= 1 sent, >= 13h after delivery, local hour in [8, 10).
 *   - Max 2 reminders per assignment per user; never two on the same run.
 */

import * as functionsTest from 'firebase-functions-test';
import { evaluateReminder } from '../notifications';

const test = functionsTest.default();

afterAll(() => {
  test.cleanup();
});

const REMINDER_1_BODY = 'Still time to respond today.';
const MORNING_BODY = "Yesterday's prompt is still open.";
const MORNING_BODY_FOLLOW_UP = "Yesterday's follow-up is still open.";

function evaluate(
  overrides: Partial<Parameters<typeof evaluateReminder>[0]>
): ReturnType<typeof evaluateReminder> {
  return evaluateReminder({
    hoursSinceDelivery: 0,
    localHour: 12,
    remindersSent: 0,
    isFollowUp: false,
    ...overrides,
  });
}

/**
 * Simulates the hourly schedule against the state machine: starting at the
 * delivery local hour, ticks one hour at a time for `hours` hours, carrying
 * the reminders_sent count forward exactly like the Firestore update does.
 * Returns each send with the local hour it fired at.
 */
function simulateHourlyRuns(
  deliveryLocalHour: number,
  hours: number,
  isFollowUp = false
): Array<{ localHour: number; hoursSinceDelivery: number; body: string | null }> {
  const sends: Array<{
    localHour: number;
    hoursSinceDelivery: number;
    body: string | null;
  }> = [];
  let remindersSent = 0;

  for (let h = 1; h <= hours; h++) {
    const localHour = (deliveryLocalHour + h) % 24;
    const result = evaluateReminder({
      hoursSinceDelivery: h,
      localHour,
      remindersSent,
      isFollowUp,
    });
    if (result.send) {
      sends.push({ localHour, hoursSinceDelivery: h, body: result.body });
      remindersSent = result.countsAs;
    }
  }

  return sends;
}

describe('evaluateReminder — SEV-0 #7 default 19:00 delivery', () => {
  it('sends exactly ONE reminder (next morning, reminder-2 copy, counts as both)', () => {
    const sends = simulateHourlyRuns(19, 48);

    expect(sends).toHaveLength(1);
    expect(sends[0].localHour).toBe(8); // first open-window hour next morning
    expect(sends[0].hoursSinceDelivery).toBe(13);
    expect(sends[0].body).toBe(MORNING_BODY);
  });

  it('the 4-6h window (23:00-01:00) never fires — quiet hours defer', () => {
    expect(evaluate({ hoursSinceDelivery: 4, localHour: 23 }).send).toBe(false);
    expect(evaluate({ hoursSinceDelivery: 5, localHour: 0 }).send).toBe(false);
    expect(evaluate({ hoursSinceDelivery: 6, localHour: 1 }).send).toBe(false);
  });

  it('the deferred morning send counts as BOTH reminders (countsAs 2)', () => {
    const result = evaluate({
      hoursSinceDelivery: 13,
      localHour: 8,
      remindersSent: 0,
    });

    expect(result).toEqual({ send: true, body: MORNING_BODY, countsAs: 2 });
  });

  it('no second morning nudge the hour after the consolidated send', () => {
    const result = evaluate({
      hoursSinceDelivery: 14,
      localHour: 9,
      remindersSent: 2,
    });

    expect(result.send).toBe(false);
  });
});

describe('evaluateReminder — no double-morning stacking', () => {
  it('an 8 PM delivery consolidates at 8 AM (12h) instead of r1@8AM + r2@9AM', () => {
    // 8 AM next morning is only 12h after an 8 PM delivery — below the 13h
    // threshold — but a local midnight has passed, so it must consolidate.
    const result = evaluate({ hoursSinceDelivery: 12, localHour: 8 });

    expect(result).toEqual({ send: true, body: MORNING_BODY, countsAs: 2 });
  });

  it.each([19, 20, 21, 22, 23])(
    'a %i:00 delivery sends exactly one morning nudge across 48 hourly runs',
    (deliveryHour) => {
      const sends = simulateHourlyRuns(deliveryHour, 48);

      expect(sends).toHaveLength(1);
      expect(sends[0].localHour).toBe(8);
      expect(sends[0].body).toBe(MORNING_BODY);
    }
  );
});

describe('evaluateReminder — 9 AM delivery gets both reminders', () => {
  it('sends reminder 1 in the afternoon and reminder 2 next morning', () => {
    const sends = simulateHourlyRuns(9, 48);

    expect(sends).toHaveLength(2);

    // Reminder 1: 4h after a 9 AM delivery = 1 PM.
    expect(sends[0].hoursSinceDelivery).toBe(4);
    expect(sends[0].localHour).toBe(13);
    expect(sends[0].body).toBe(REMINDER_1_BODY);

    // Reminder 2: next morning in the 8-10 AM band (23h -> 8 AM).
    expect(sends[1].hoursSinceDelivery).toBe(23);
    expect(sends[1].localHour).toBe(8);
    expect(sends[1].body).toBe(MORNING_BODY);
  });

  it('reminder 2 proper fires only in the [8, 10) local band', () => {
    const base = { hoursSinceDelivery: 23, remindersSent: 1 };

    expect(evaluate({ ...base, localHour: 7 }).send).toBe(false);
    expect(evaluate({ ...base, localHour: 8 }).send).toBe(true);
    expect(evaluate({ ...base, localHour: 9 }).send).toBe(true);
    expect(evaluate({ ...base, localHour: 10 }).send).toBe(false);
    expect(evaluate({ ...base, localHour: 15 }).send).toBe(false);
  });

  it('reminder 2 fires with count <= 1, not only count === 1', () => {
    // count 0 at >= 13h: consolidated morning send
    expect(
      evaluate({ hoursSinceDelivery: 14, localHour: 9, remindersSent: 0 }).send
    ).toBe(true);
    // count 1 at >= 13h in band: reminder 2 proper
    expect(
      evaluate({ hoursSinceDelivery: 14, localHour: 9, remindersSent: 1 }).send
    ).toBe(true);
  });
});

describe('evaluateReminder — reminder 1 semantics', () => {
  it('fires from 4h with no ceiling (the old < 6 ceiling is gone)', () => {
    expect(evaluate({ hoursSinceDelivery: 3.9, localHour: 12 }).send).toBe(false);
    expect(evaluate({ hoursSinceDelivery: 4, localHour: 12 }).send).toBe(true);
    expect(evaluate({ hoursSinceDelivery: 6, localHour: 12 }).send).toBe(true);
    expect(evaluate({ hoursSinceDelivery: 12.9, localHour: 12 }).send).toBe(true);
  });

  it('uses the same-day copy below 13h', () => {
    const result = evaluate({ hoursSinceDelivery: 8, localHour: 15 });

    expect(result).toEqual({ send: true, body: REMINDER_1_BODY, countsAs: 1 });
  });

  it('only fires for users with 0 reminders', () => {
    expect(
      evaluate({ hoursSinceDelivery: 8, localHour: 15, remindersSent: 1 }).send
    ).toBe(false);
  });

  it('a late catch-up (>= 13h, outside the morning band, 0 sent) still consolidates', () => {
    // e.g. the function was down all morning — user still gets exactly one
    // nudge, with the morning copy, counted as both.
    const result = evaluate({
      hoursSinceDelivery: 16,
      localHour: 11,
      remindersSent: 0,
    });

    expect(result).toEqual({ send: true, body: MORNING_BODY, countsAs: 2 });
  });
});

describe('evaluateReminder — quiet hours deferral', () => {
  it('never sends outside the 8 AM - 9 PM window, whatever the state', () => {
    for (const localHour of [21, 22, 23, 0, 1, 5, 7]) {
      expect(
        evaluate({ hoursSinceDelivery: 5, localHour, remindersSent: 0 }).send
      ).toBe(false);
      expect(
        evaluate({ hoursSinceDelivery: 14, localHour, remindersSent: 0 }).send
      ).toBe(false);
      expect(
        evaluate({ hoursSinceDelivery: 14, localHour, remindersSent: 1 }).send
      ).toBe(false);
    }
  });

  it('sends at the window edges: 8 AM in, 8:xx PM in, 9 PM out', () => {
    expect(evaluate({ hoursSinceDelivery: 5, localHour: 8 }).send).toBe(true);
    expect(evaluate({ hoursSinceDelivery: 5, localHour: 20 }).send).toBe(true);
    expect(evaluate({ hoursSinceDelivery: 5, localHour: 21 }).send).toBe(false);
  });

  it('a skipped run does not consume a reminder (countsAs unchanged)', () => {
    const result = evaluate({
      hoursSinceDelivery: 5,
      localHour: 23,
      remindersSent: 0,
    });

    expect(result.send).toBe(false);
    expect(result.countsAs).toBe(0);
  });
});

describe('evaluateReminder — max 2 / never two on the same run', () => {
  it('never sends once 2 reminders are recorded', () => {
    for (let localHour = 0; localHour < 24; localHour++) {
      for (const hoursSinceDelivery of [4, 8, 13, 23, 40]) {
        expect(
          evaluate({ hoursSinceDelivery, localHour, remindersSent: 2 }).send
        ).toBe(false);
      }
    }
  });

  it('caps every delivery hour at 2 sends across 48 simulated hourly runs', () => {
    for (let deliveryHour = 0; deliveryHour < 24; deliveryHour++) {
      const sends = simulateHourlyRuns(deliveryHour, 48);

      expect(sends.length).toBeLessThanOrEqual(2);
      expect(sends.length).toBeGreaterThanOrEqual(1); // reminders always fire eventually

      // Never two morning nudges back-to-back: consecutive sends must be
      // more than one hourly run apart OR the first was the only one.
      if (sends.length === 2) {
        expect(
          sends[1].hoursSinceDelivery - sends[0].hoursSinceDelivery
        ).toBeGreaterThan(1);
      }
    }
  });

  it('a single evaluation can only ever produce one send', () => {
    const result = evaluate({ hoursSinceDelivery: 14, localHour: 8 });

    expect(result.send).toBe(true);
    expect(result.countsAs).toBe(2); // terminal — next run is a no-op
  });
});

describe('evaluateReminder — follow-up copy variant', () => {
  it('uses the follow-up morning copy for consolidated sends', () => {
    const result = evaluate({
      hoursSinceDelivery: 13,
      localHour: 8,
      isFollowUp: true,
    });

    expect(result.body).toBe(MORNING_BODY_FOLLOW_UP);
  });

  it('uses the follow-up morning copy for reminder 2 proper', () => {
    const result = evaluate({
      hoursSinceDelivery: 23,
      localHour: 9,
      remindersSent: 1,
      isFollowUp: true,
    });

    expect(result.body).toBe(MORNING_BODY_FOLLOW_UP);
  });

  it('reminder 1 same-day copy is shared (no follow-up variant needed)', () => {
    const result = evaluate({
      hoursSinceDelivery: 5,
      localHour: 14,
      isFollowUp: true,
    });

    expect(result.body).toBe(REMINDER_1_BODY);
  });
});
