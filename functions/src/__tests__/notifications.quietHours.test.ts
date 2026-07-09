/**
 * Unit tests for the response-reminder quiet-hours guard (notifications.ts).
 *
 * Contract: no reminder of any kind is sent outside 8 AM - 9 PM in the
 * recipient's LOCAL time. A skipped reminder is not counted as sent — the
 * hourly schedule naturally retries in the next open window. This kills the
 * "7 PM delivery reminds at 11 PM - 1 AM" phantom pushes.
 */

import * as functionsTest from 'firebase-functions-test';
import { formatInTimeZone } from 'date-fns-tz';
import { isWithinReminderWindow } from '../notifications';

const test = functionsTest.default();

describe('isWithinReminderWindow', () => {
  it('allows sends from 8 AM (inclusive) to 9 PM (exclusive) local', () => {
    expect(isWithinReminderWindow(8)).toBe(true);
    expect(isWithinReminderWindow(12)).toBe(true);
    expect(isWithinReminderWindow(20)).toBe(true);
  });

  it('blocks late evening and overnight hours', () => {
    expect(isWithinReminderWindow(21)).toBe(false);
    expect(isWithinReminderWindow(22)).toBe(false);
    expect(isWithinReminderWindow(23)).toBe(false);
    expect(isWithinReminderWindow(0)).toBe(false);
    expect(isWithinReminderWindow(1)).toBe(false);
  });

  it('blocks early morning hours before 8 AM', () => {
    expect(isWithinReminderWindow(5)).toBe(false);
    expect(isWithinReminderWindow(7)).toBe(false);
  });
});

describe('quiet hours applied to the recipient local hour', () => {
  // The exact defect scenario: prompt delivered 7 PM ET, reminder 1 window
  // (4-6h after delivery) lands at 11 PM - 1 AM ET.
  it('skips reminder 1 for a 7 PM delivery whose 4-6h window lands at 11 PM local', () => {
    const now = new Date('2026-07-10T03:00:00Z'); // 11 PM July 9 in New York
    const localHour = parseInt(formatInTimeZone(now, 'America/New_York', 'HH'), 10);

    expect(localHour).toBe(23);
    expect(isWithinReminderWindow(localHour)).toBe(false);
  });

  it('allows an afternoon reminder in the recipient timezone', () => {
    const now = new Date('2026-07-09T20:00:00Z'); // 4 PM in New York
    const localHour = parseInt(formatInTimeZone(now, 'America/New_York', 'HH'), 10);

    expect(localHour).toBe(16);
    expect(isWithinReminderWindow(localHour)).toBe(true);
  });

  it('evaluates the window per-recipient: same instant, different timezones', () => {
    const now = new Date('2026-07-10T05:00:00Z');

    const nyHour = parseInt(formatInTimeZone(now, 'America/New_York', 'HH'), 10); // 1 AM
    const berlinHour = parseInt(formatInTimeZone(now, 'Europe/Berlin', 'HH'), 10); // 7 AM
    const tokyoHour = parseInt(formatInTimeZone(now, 'Asia/Tokyo', 'HH'), 10); // 2 PM

    expect(isWithinReminderWindow(nyHour)).toBe(false);
    expect(isWithinReminderWindow(berlinHour)).toBe(false);
    expect(isWithinReminderWindow(tokyoHour)).toBe(true);
  });

  it('keeps the reminder-2 morning band (8-10 AM) inside the quiet-hours window', () => {
    // Reminder 2 fires at 8-10 AM local; the guard must never block it.
    expect(isWithinReminderWindow(8)).toBe(true);
    expect(isWithinReminderWindow(9)).toBe(true);
  });
});

afterAll(() => {
  test.cleanup();
});
