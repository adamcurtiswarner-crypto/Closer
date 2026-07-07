import { DEFAULT_SCALE_CONFIG } from './scale';

/**
 * Hearth signal taxonomy — mirrors the backend `signal` field on
 * prompt_completions. Order of precedence matches the follow-up branch
 * logic (divergence > repair > deepener).
 */
export type HearthSignal = 'deepener' | 'repair' | 'divergence' | 'steady';

const VALID_SIGNALS: readonly string[] = ['deepener', 'repair', 'divergence', 'steady'];

/**
 * Pure signal computation from the two partners' scores. Same thresholds
 * as the backend (DEFAULT_SCALE_CONFIG): gap >= 4 divergence, min <= 4
 * repair, both >= 9 deepener, else steady. Used as the client-side
 * fallback when a completion doc predates the `signal` field.
 */
export function computeSignal(scoreA: number, scoreB: number): HearthSignal {
  const { lowThreshold, highThreshold, divergenceGap } = DEFAULT_SCALE_CONFIG;
  if (Math.abs(scoreA - scoreB) >= divergenceGap) return 'divergence';
  if (Math.min(scoreA, scoreB) <= lowThreshold) return 'repair';
  if (scoreA >= highThreshold && scoreB >= highThreshold) return 'deepener';
  return 'steady';
}

/**
 * Resolve the effective signal for a completion at the read boundary:
 * - a valid server-provided `signal` always wins;
 * - missing/invalid signal with both scores present → computed fallback;
 * - no scores (old or text completions) → null, rendered quietly as steady.
 */
export function resolveSignal(
  raw: unknown,
  scoreA: number | null | undefined,
  scoreB: number | null | undefined
): HearthSignal | null {
  if (typeof raw === 'string' && VALID_SIGNALS.includes(raw)) {
    return raw as HearthSignal;
  }
  if (typeof scoreA === 'number' && typeof scoreB === 'number') {
    return computeSignal(scoreA, scoreB);
  }
  return null;
}
