// Progressive trial unlock (21-day trial):
//
//   Days 1-7:   full premium access
//   Days 8-14:  follow-ups limited to 3/week
//   Days 15-21: follow-ups limited to 1/week, Us view grays after viewing
//
// The trial start date comes from the couple doc (premium_trial_start) or
// from RevenueCat's trial period. This module is pure — no Firebase reads.

export const TRIAL_TOTAL_DAYS = 21;
export const TRIAL_PHASE_1_END = 7;
export const TRIAL_PHASE_2_END = 14;

/** Follow-up limits per trial phase (per week). */
export const TRIAL_FOLLOW_UP_LIMITS = {
  phase1: Infinity, // full access
  phase2: 3,
  phase3: 1,
} as const;

export type TrialPhase = 'phase1' | 'phase2' | 'phase3' | 'expired' | 'none';

export interface TrialState {
  phase: TrialPhase;
  dayNumber: number;
  daysRemaining: number;
  followUpWeeklyLimit: number;
  usViewRestricted: boolean;
}

/**
 * Compute the current trial phase from the trial start date.
 * Returns 'none' when trialStart is null (no trial active).
 */
export function computeTrialState(
  trialStart: Date | null,
  now: Date = new Date()
): TrialState {
  if (!trialStart) {
    return {
      phase: 'none',
      dayNumber: 0,
      daysRemaining: 0,
      followUpWeeklyLimit: Infinity,
      usViewRestricted: false,
    };
  }

  const elapsed = now.getTime() - trialStart.getTime();
  const dayNumber = Math.floor(elapsed / 86400000) + 1;
  const daysRemaining = Math.max(0, TRIAL_TOTAL_DAYS - dayNumber + 1);

  if (dayNumber > TRIAL_TOTAL_DAYS) {
    return {
      phase: 'expired',
      dayNumber,
      daysRemaining: 0,
      followUpWeeklyLimit: 0,
      usViewRestricted: true,
    };
  }

  if (dayNumber <= TRIAL_PHASE_1_END) {
    return {
      phase: 'phase1',
      dayNumber,
      daysRemaining,
      followUpWeeklyLimit: TRIAL_FOLLOW_UP_LIMITS.phase1,
      usViewRestricted: false,
    };
  }

  if (dayNumber <= TRIAL_PHASE_2_END) {
    return {
      phase: 'phase2',
      dayNumber,
      daysRemaining,
      followUpWeeklyLimit: TRIAL_FOLLOW_UP_LIMITS.phase2,
      usViewRestricted: false,
    };
  }

  return {
    phase: 'phase3',
    dayNumber,
    daysRemaining,
    followUpWeeklyLimit: TRIAL_FOLLOW_UP_LIMITS.phase3,
    usViewRestricted: true,
  };
}
