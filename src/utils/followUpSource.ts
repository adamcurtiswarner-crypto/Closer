/**
 * Copy helpers for the "what this came from" block on a follow-up prompt.
 *
 * A follow-up makes a claim about a conversation that already happened —
 * "You two saw this one differently" — and until now it named nothing. The
 * divergence and repair branches are delivered the DAY AFTER the question
 * that triggered them, so by the time you read the card the context is a
 * day old and gone from memory. The deepener arrives the same day.
 *
 * The label has to stay true for all three timings, and for the case where
 * a follow-up sat unanswered for a while, so it is derived from the dates
 * rather than hardcoded to "yesterday".
 */

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Parse a YYYY-MM-DD calendar day as a LOCAL date (never UTC). */
function parseLocalDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days between two calendar days, ignoring clock time. */
function dayDelta(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * A truthful, quiet description of when the originating question was asked,
 * meant to follow the word "From" — e.g. "From yesterday's question".
 *
 * Returns null when the date cannot be parsed, so the caller can render the
 * block without a date rather than printing something wrong.
 */
export function describeSourceDate(
  assignedDate: string | null | undefined,
  today: Date = new Date()
): string | null {
  if (!assignedDate) return null;
  const source = parseLocalDay(assignedDate);
  if (!source) return null;

  const delta = dayDelta(source, today);

  // A future-dated source would mean a clock skew between the partners'
  // devices. Say nothing specific rather than "in 2 days".
  if (delta < 0) return null;
  if (delta === 0) return "today's earlier question";
  if (delta === 1) return "yesterday's question";
  // Within the last week the weekday is the most human reference. Past that
  // it stops being unambiguous ("Thursday" could be two Thursdays ago).
  if (delta < 7) return `${WEEKDAYS[source.getDay()]}'s question`;
  return `the question from ${MONTHS[source.getMonth()]} ${source.getDate()}`;
}

/**
 * A short day label for the collapsed strip — "Today", "Yesterday", "Thu",
 * or "Nov 7". Kept to a few characters so the strip stays one line beside
 * the score scale, even at larger text sizes.
 */
export function shortSourceLabel(
  assignedDate: string | null | undefined,
  today: Date = new Date()
): string | null {
  if (!assignedDate) return null;
  const source = parseLocalDay(assignedDate);
  if (!source) return null;

  const delta = dayDelta(source, today);
  if (delta < 0) return null;
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  if (delta < 7) return WEEKDAYS[source.getDay()].slice(0, 3);
  return `${MONTHS[source.getMonth()]} ${source.getDate()}`;
}

/**
 * The same day, spelled out, for the expanded card's header: "Today",
 * "Yesterday", "Thursday", or "Nov 7".
 */
export function longSourceLabel(
  assignedDate: string | null | undefined,
  today: Date = new Date()
): string | null {
  if (!assignedDate) return null;
  const source = parseLocalDay(assignedDate);
  if (!source) return null;

  const delta = dayDelta(source, today);
  if (delta < 0) return null;
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  if (delta < 7) return WEEKDAYS[source.getDay()];
  return `${MONTHS[source.getMonth()]} ${source.getDate()}`;
}

/**
 * Where a 1-10 score sits on the scale, as a 0-1 fraction. Clamped, because
 * a legacy or malformed score must not push a dot outside the rail.
 */
export function scorePosition(score: number): number {
  const clamped = Math.min(10, Math.max(1, score));
  return (clamped - 1) / 9;
}

/**
 * The gap between two scores, or null when either side has no score.
 * Only scored daily prompts can trigger a follow-up, but a response can
 * still be missing a score (an explore answer, or legacy data), and the
 * block must degrade rather than render NaN.
 */
export function scoreGap(
  a: number | null | undefined,
  b: number | null | undefined
): number | null {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return Math.abs(a - b);
}
