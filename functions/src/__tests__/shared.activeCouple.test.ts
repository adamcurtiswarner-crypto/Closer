/**
 * Unit tests for isActiveCouple (shared.ts) — the guard that stops a
 * dissolved couple from receiving anything.
 *
 * The defect it closes (found in prod 2026-08-23): deliverDailyPrompts
 * iterates onboarded users and delivers to `user.couple_id` with no status
 * check, so BOTH of the founder couple's prior deleted couples were being
 * assigned a fresh prompt every morning and pushing every uid still listed
 * in member_ids. member_ids is never cleared at breakup, so the effect is
 * that ex-partners keep receiving notifications from a relationship that
 * ended. The founders were getting three identical "Today's prompt is
 * ready." pushes back to back at 08:14 local.
 */
import { isActiveCouple } from '../shared';

describe('isActiveCouple', () => {
  it('accepts an active couple', () => {
    expect(isActiveCouple({ status: 'active', member_ids: ['a', 'b'] })).toBe(true);
  });

  it('rejects a dissolved couple — the prod defect', () => {
    expect(isActiveCouple({ status: 'deleted', member_ids: ['a', 'b'] })).toBe(false);
  });

  it('rejects a couple that has not finished pairing', () => {
    expect(isActiveCouple({ status: 'pending', member_ids: ['a'] })).toBe(false);
  });

  it('rejects a missing or malformed couple rather than defaulting open', () => {
    // Delivery is a push to a real person's phone; an unreadable couple doc
    // must fail closed, not fall through to "probably fine".
    expect(isActiveCouple(undefined)).toBe(false);
    expect(isActiveCouple(null)).toBe(false);
    expect(isActiveCouple({})).toBe(false);
    expect(isActiveCouple({ status: null })).toBe(false);
    expect(isActiveCouple({ status: 'ACTIVE' })).toBe(false);
  });

  it('rejects the canary couple — it is not a real relationship', () => {
    // canary-couple carries status 'canary' and drives the hourly pipeline
    // probe; it must never enter a user-facing send path.
    expect(isActiveCouple({ status: 'canary', member_ids: ['canary-u', 'canary-u'] }))
      .toBe(false);
  });
});
