import {
  computeTrialState,
  TRIAL_TOTAL_DAYS,
  TRIAL_PHASE_1_END,
  TRIAL_PHASE_2_END,
  TRIAL_FOLLOW_UP_LIMITS,
} from '../utils/trialPhase';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe('computeTrialState', () => {
  it('returns "none" when no trial start date', () => {
    const state = computeTrialState(null);
    expect(state.phase).toBe('none');
    expect(state.dayNumber).toBe(0);
    expect(state.followUpWeeklyLimit).toBe(Infinity);
    expect(state.usViewRestricted).toBe(false);
  });

  it('phase 1 (days 1-7): full access', () => {
    const state = computeTrialState(daysFromNow(1));
    expect(state.phase).toBe('phase1');
    expect(state.dayNumber).toBe(1);
    expect(state.daysRemaining).toBe(TRIAL_TOTAL_DAYS);
    expect(state.followUpWeeklyLimit).toBe(TRIAL_FOLLOW_UP_LIMITS.phase1);
    expect(state.usViewRestricted).toBe(false);
  });

  it('day 7 is still phase 1', () => {
    const state = computeTrialState(daysFromNow(TRIAL_PHASE_1_END));
    expect(state.phase).toBe('phase1');
    expect(state.dayNumber).toBe(TRIAL_PHASE_1_END);
  });

  it('phase 2 (days 8-14): limited follow-ups', () => {
    const state = computeTrialState(daysFromNow(TRIAL_PHASE_1_END + 1));
    expect(state.phase).toBe('phase2');
    expect(state.dayNumber).toBe(TRIAL_PHASE_1_END + 1);
    expect(state.followUpWeeklyLimit).toBe(TRIAL_FOLLOW_UP_LIMITS.phase2);
    expect(state.usViewRestricted).toBe(false);
  });

  it('day 14 is still phase 2', () => {
    const state = computeTrialState(daysFromNow(TRIAL_PHASE_2_END));
    expect(state.phase).toBe('phase2');
    expect(state.dayNumber).toBe(TRIAL_PHASE_2_END);
  });

  it('phase 3 (days 15-21): minimal access', () => {
    const state = computeTrialState(daysFromNow(TRIAL_PHASE_2_END + 1));
    expect(state.phase).toBe('phase3');
    expect(state.dayNumber).toBe(TRIAL_PHASE_2_END + 1);
    expect(state.followUpWeeklyLimit).toBe(TRIAL_FOLLOW_UP_LIMITS.phase3);
    expect(state.usViewRestricted).toBe(true);
  });

  it('day 21 is still phase 3 with 1 day remaining', () => {
    const state = computeTrialState(daysFromNow(TRIAL_TOTAL_DAYS));
    expect(state.phase).toBe('phase3');
    expect(state.dayNumber).toBe(TRIAL_TOTAL_DAYS);
    expect(state.daysRemaining).toBe(1);
  });

  it('expired after day 21', () => {
    const state = computeTrialState(daysFromNow(TRIAL_TOTAL_DAYS + 1));
    expect(state.phase).toBe('expired');
    expect(state.daysRemaining).toBe(0);
    expect(state.followUpWeeklyLimit).toBe(0);
    expect(state.usViewRestricted).toBe(true);
  });

  it('daysRemaining decreases correctly', () => {
    const day1 = computeTrialState(daysFromNow(1));
    const day10 = computeTrialState(daysFromNow(10));
    const day20 = computeTrialState(daysFromNow(20));

    expect(day1.daysRemaining).toBe(21);
    expect(day10.daysRemaining).toBe(12);
    expect(day20.daysRemaining).toBe(2);
  });
});
