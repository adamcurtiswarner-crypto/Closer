/**
 * Tests for the follow-up source copy helpers.
 *
 * The label has to stay true across all three branch timings: a deepener
 * is delivered the same day, while divergence and repair land the day AFTER
 * the question that triggered them. A follow-up can also sit unanswered,
 * so "yesterday's question" cannot be hardcoded.
 */
import { describeSourceDate, scoreGap } from '@/utils/followUpSource';

describe('describeSourceDate', () => {
  // Saturday 2026-11-14, matching the screenshot that prompted this work.
  const today = new Date(2026, 10, 14, 8, 35);

  it('names today for a same-day deepener', () => {
    expect(describeSourceDate('2026-11-14', today)).toBe("today's earlier question");
  });

  it('names yesterday for a next-day divergence or repair', () => {
    expect(describeSourceDate('2026-11-13', today)).toBe("yesterday's question");
  });

  it('uses the weekday within the last week', () => {
    expect(describeSourceDate('2026-11-10', today)).toBe("Tuesday's question");
    expect(describeSourceDate('2026-11-09', today)).toBe("Monday's question");
  });

  it('falls back to a date once a weekday would be ambiguous', () => {
    // 7 days back is the same weekday — "Saturday" would read as today.
    expect(describeSourceDate('2026-11-07', today)).toBe('the question from Nov 7');
    expect(describeSourceDate('2026-10-02', today)).toBe('the question from Oct 2');
  });

  it('parses the day as local, never UTC', () => {
    // Late evening: a UTC parse would roll the comparison to the next day
    // and report yesterday's question as "today's".
    const lateEvening = new Date(2026, 10, 14, 23, 30);
    expect(describeSourceDate('2026-11-13', lateEvening)).toBe("yesterday's question");
    expect(describeSourceDate('2026-11-14', lateEvening)).toBe("today's earlier question");
  });

  it('says nothing rather than something wrong', () => {
    expect(describeSourceDate(null)).toBeNull();
    expect(describeSourceDate(undefined)).toBeNull();
    expect(describeSourceDate('')).toBeNull();
    expect(describeSourceDate('not-a-date', today)).toBeNull();
    // A future date means the partners' clocks disagree; "in 2 days" would
    // be nonsense on a card about a question already answered.
    expect(describeSourceDate('2026-11-16', today)).toBeNull();
  });

  it('crosses a month and a year boundary correctly', () => {
    expect(describeSourceDate('2026-10-31', new Date(2026, 10, 1, 9))).toBe(
      "yesterday's question"
    );
    expect(describeSourceDate('2025-12-31', new Date(2026, 0, 1, 9))).toBe(
      "yesterday's question"
    );
  });
});

describe('scoreGap', () => {
  it('is the absolute distance between the two scores', () => {
    expect(scoreGap(9, 3)).toBe(6);
    expect(scoreGap(3, 9)).toBe(6);
    expect(scoreGap(5, 5)).toBe(0);
  });

  it('is null when either side has no score', () => {
    // Follow-ups are free text and never scored; an explore answer or
    // legacy response can also arrive without one. NaN must never reach
    // the copy.
    expect(scoreGap(null, 5)).toBeNull();
    expect(scoreGap(5, null)).toBeNull();
    expect(scoreGap(undefined, undefined)).toBeNull();
  });
});
