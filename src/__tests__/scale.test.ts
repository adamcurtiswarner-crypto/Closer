import { isValidScore, isMiddleScaleOutcome, DEFAULT_SCALE_CONFIG } from '../utils/scale';
import type { ScaleConfig } from '../types';

describe('isValidScore', () => {
  it('accepts whole numbers 1 through 10', () => {
    for (let n = 1; n <= 10; n++) {
      expect(isValidScore(n)).toBe(true);
    }
  });

  it('rejects out-of-range scores', () => {
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(11)).toBe(false);
    expect(isValidScore(-3)).toBe(false);
  });

  it('rejects non-integer scores', () => {
    expect(isValidScore(5.5)).toBe(false);
    expect(isValidScore(NaN)).toBe(false);
  });
});

describe('isMiddleScaleOutcome', () => {
  const config: ScaleConfig = DEFAULT_SCALE_CONFIG;

  it('is false when either score is missing', () => {
    expect(isMiddleScaleOutcome(null, 6, config)).toBe(false);
    expect(isMiddleScaleOutcome(6, null, config)).toBe(false);
    expect(isMiddleScaleOutcome(undefined, undefined, config)).toBe(false);
  });

  it('is false when both scores are high (deepener territory)', () => {
    expect(isMiddleScaleOutcome(9, 10, config)).toBe(false);
  });

  it('is false when a score is low (repair territory)', () => {
    expect(isMiddleScaleOutcome(3, 7, config)).toBe(false);
    expect(isMiddleScaleOutcome(4, 6, config)).toBe(false);
  });

  it('is false when scores diverge widely (divergence territory)', () => {
    expect(isMiddleScaleOutcome(5, 9, config)).toBe(false);
  });

  it('is true for middle scores with no branch triggered', () => {
    expect(isMiddleScaleOutcome(6, 7, config)).toBe(true);
    expect(isMiddleScaleOutcome(5, 6, config)).toBe(true);
    expect(isMiddleScaleOutcome(7, 8, config)).toBe(true);
  });

  it('falls back to default thresholds when config is null', () => {
    expect(isMiddleScaleOutcome(6, 7, null)).toBe(true);
    expect(isMiddleScaleOutcome(9, 9, null)).toBe(false);
  });
});
