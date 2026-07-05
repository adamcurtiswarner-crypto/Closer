import type { ScaleConfig } from '@/types';

// Locked v1 defaults — mirrors the backend contract for scale_config.
export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  min: 1,
  max: 10,
  lowThreshold: 4,
  highThreshold: 9,
  divergenceGap: 4,
  minLabel: 'Struggling',
  maxLabel: 'Thriving',
};

/** A score is valid when it is a whole number within [min, max]. */
export function isValidScore(
  score: number,
  min: number = DEFAULT_SCALE_CONFIG.min,
  max: number = DEFAULT_SCALE_CONFIG.max
): boolean {
  return Number.isInteger(score) && score >= min && score <= max;
}

/**
 * A "middle" outcome triggers no follow-up branch: not both high (deepener),
 * no low score (repair), and no wide gap (divergence). The reveal shows a
 * light optional line instead.
 */
export function isMiddleScaleOutcome(
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
  config: ScaleConfig | null
): boolean {
  if (scoreA == null || scoreB == null) return false;
  const cfg = config ?? DEFAULT_SCALE_CONFIG;
  const bothHigh = scoreA >= cfg.highThreshold && scoreB >= cfg.highThreshold;
  const anyLow = Math.min(scoreA, scoreB) <= cfg.lowThreshold;
  const divergent = Math.abs(scoreA - scoreB) >= cfg.divergenceGap;
  return !bothHigh && !anyLow && !divergent;
}
