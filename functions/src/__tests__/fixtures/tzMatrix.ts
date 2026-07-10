/**
 * Shared timezone/DST scenario matrix.
 *
 * SYNC WARNING: this file exists in TWO byte-identical copies —
 *   src/__tests__/fixtures/tzMatrix.ts            (app test suite)
 *   functions/src/__tests__/fixtures/tzMatrix.ts  (functions test suite)
 * because the two suites are separate npm packages with separate TypeScript
 * roots. Update both together; `diff` them to verify
 * (`diff src/__tests__/fixtures/tzMatrix.ts functions/src/__tests__/fixtures/tzMatrix.ts`).
 * The whole point of the matrix is that the client's
 * localDateWindow() (src/utils/localDate.ts) and the server's
 * assignmentDateWindow(timezone) (functions/src/prompts.ts) agree — for the
 * SAME instant, the two windows must intersect and each side's "today" must
 * fall inside the other's window, or partners stop seeing each other's
 * assignments around date boundaries.
 *
 * Consumed by:
 *   - src/__tests__/localDate.test.ts            (client localDateWindow)
 *   - functions/src/__tests__/prompts.tz.test.ts (server assignmentDateWindow)
 */

export interface TzScenario {
  name: string;
  /** The absolute instant under test (ISO-8601, UTC). */
  instantUtc: string;
  /** IANA timezone of the primary user's device. '' = server UTC fallback. */
  timezone: string;
  /** Expected local calendar day (yyyy-MM-dd) in `timezone` at the instant. */
  expectedLocalDate: string;
  /** Optional partner on a different clock at the SAME instant. */
  partnerTimezone?: string;
  expectedPartnerLocalDate?: string;
}

export const TZ_SCENARIOS: readonly TzScenario[] = [
  {
    // The founding bug: at 8 PM Eastern the UTC date has already rolled to
    // tomorrow. "Today" must still be July 8 for the user.
    name: '8pm ET — UTC has rolled over',
    instantUtc: '2026-07-09T00:30:00Z', // 8:30 PM Jul 8 in New York (EDT, UTC-4)
    timezone: 'America/New_York',
    expectedLocalDate: '2026-07-08',
    partnerTimezone: 'America/Los_Angeles', // 5:30 PM Jul 8 (PDT)
    expectedPartnerLocalDate: '2026-07-08',
  },
  {
    // Just past local midnight: the ET partner is on the new day while the
    // PT partner is still on yesterday — adjacent local dates, windows must
    // still intersect.
    name: 'midnight local ET — partners on adjacent dates',
    instantUtc: '2026-07-09T04:05:00Z', // 12:05 AM Jul 9 ET / 9:05 PM Jul 8 PT
    timezone: 'America/New_York',
    expectedLocalDate: '2026-07-09',
    partnerTimezone: 'America/Los_Angeles',
    expectedPartnerLocalDate: '2026-07-08',
  },
  {
    // US DST starts Mar 8 2026 (2:00 AM EST jumps to 3:00 AM EDT). 07:30Z
    // would be 2:30 AM EST — a wall-clock time that does not exist; the
    // clock reads 3:30 AM EDT. PT has not transitioned yet (PST until
    // 10:00Z) and is still on Mar 7.
    name: 'DST spring forward — Mar 8 2026',
    instantUtc: '2026-03-08T07:30:00Z', // 3:30 AM EDT Mar 8 / 11:30 PM PST Mar 7
    timezone: 'America/New_York',
    expectedLocalDate: '2026-03-08',
    partnerTimezone: 'America/Los_Angeles',
    expectedPartnerLocalDate: '2026-03-07',
  },
  {
    // US DST ends Nov 1 2026 (2:00 AM EDT falls back to 1:00 AM EST).
    // 05:30Z is 1:30 AM EDT — the first pass through the repeated hour.
    name: 'DST fall back — Nov 1 2026',
    instantUtc: '2026-11-01T05:30:00Z', // 1:30 AM EDT Nov 1 / 10:30 PM PDT Oct 31
    timezone: 'America/New_York',
    expectedLocalDate: '2026-11-01',
    partnerTimezone: 'America/Los_Angeles',
    expectedPartnerLocalDate: '2026-10-31',
  },
  {
    // 10 PM ET: both coasts still agree on the local date but UTC is already
    // tomorrow — neither side may leak the UTC date as "today".
    name: '10pm ET / 7pm PT — same local date, UTC ahead',
    instantUtc: '2026-07-09T02:00:00Z', // 10:00 PM Jul 8 ET / 7:00 PM Jul 8 PT
    timezone: 'America/New_York',
    expectedLocalDate: '2026-07-08',
    partnerTimezone: 'America/Los_Angeles',
    expectedPartnerLocalDate: '2026-07-08',
  },
  {
    // A user doc with no timezone: the server falls back to UTC (see
    // assignmentDateWindow). The client always has a device timezone, so
    // client tests treat '' as a UTC device.
    name: 'empty timezone — server falls back to UTC',
    instantUtc: '2026-07-09T00:30:00Z',
    timezone: '',
    expectedLocalDate: '2026-07-09',
  },
] as const;

/**
 * The wall-clock (calendar) components of `instantUtc` in `timeZone`,
 * DST-aware via Intl. Used to build the Date a device in that timezone
 * would observe — machine-independent as long as jest pins TZ=UTC.
 */
export function wallClockAt(instantUtc: string, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(instantUtc));
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  // hour12:false can yield "24" at midnight in some ICU versions — normalize.
  const hour = get('hour') % 24;
  return new Date(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
}
