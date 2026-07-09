/**
 * Device-local calendar-day helpers.
 *
 * `new Date().toISOString().split('T')[0]` is the UTC date — at 8 PM Eastern
 * it already reads tomorrow, which used to blank the Today screen and
 * auto-trigger next-day delivery early. Anything that means "the user's
 * calendar day" must go through these instead.
 *
 * The server dates assignments in the USER'S timezone (see
 * functions/src/prompts.ts assignmentDateWindow), so the device-local day is
 * the matching client-side truth.
 */

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The device-local calendar day as YYYY-MM-DD. */
export function todayLocalISO(now: Date = new Date()): string {
  return toLocalISO(now);
}

/**
 * The device-local [yesterday, today, tomorrow] window as YYYY-MM-DD strings.
 * Mirrors the server's assignmentDateWindow: partners in different timezones
 * (or a server/client date skew) can sit on adjacent local dates, so
 * assignment queries match the whole window and prefer today's date.
 */
export function localDateWindow(now: Date = new Date()): [string, string, string] {
  const dayMs = 86400000;
  return [
    toLocalISO(new Date(now.getTime() - dayMs)),
    toLocalISO(now),
    toLocalISO(new Date(now.getTime() + dayMs)),
  ];
}
