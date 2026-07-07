import { computeSignal, resolveSignal } from '../utils/hearthSignal';

describe('hearthSignal', () => {
  describe('computeSignal boundary matrix', () => {
    it('2/8 is divergence (gap 6 >= 4, even though min <= 4)', () => {
      expect(computeSignal(2, 8)).toBe('divergence');
      expect(computeSignal(8, 2)).toBe('divergence');
    });

    it('3/4 is repair (min <= 4, gap below divergence)', () => {
      expect(computeSignal(3, 4)).toBe('repair');
      expect(computeSignal(4, 3)).toBe('repair');
    });

    it('6/7 is steady (no low, no gap, not both high)', () => {
      expect(computeSignal(6, 7)).toBe('steady');
    });

    it('9/9 is deepener (both >= 9)', () => {
      expect(computeSignal(9, 9)).toBe('deepener');
      expect(computeSignal(10, 9)).toBe('deepener');
    });

    it('4/6 is repair, NOT divergence (gap 2 < 4)', () => {
      expect(computeSignal(4, 6)).toBe('repair');
      expect(computeSignal(6, 4)).toBe('repair');
    });

    it('exact divergence gap of 4 triggers divergence', () => {
      expect(computeSignal(5, 9)).toBe('divergence');
      expect(computeSignal(1, 5)).toBe('divergence');
    });

    it('8/9 is steady (one below the high threshold)', () => {
      expect(computeSignal(8, 9)).toBe('steady');
    });
  });

  describe('resolveSignal', () => {
    it('prefers a valid server-provided signal over scores', () => {
      expect(resolveSignal('deepener', 2, 8)).toBe('deepener');
      expect(resolveSignal('steady', 1, 1)).toBe('steady');
    });

    it('computes the fallback when signal is missing but both scores exist', () => {
      expect(resolveSignal(null, 2, 8)).toBe('divergence');
      expect(resolveSignal(undefined, 3, 4)).toBe('repair');
      expect(resolveSignal(undefined, 9, 9)).toBe('deepener');
      expect(resolveSignal(null, 6, 7)).toBe('steady');
    });

    it('computes the fallback when signal is an unknown string', () => {
      expect(resolveSignal('spicy', 9, 9)).toBe('deepener');
    });

    it('returns null (quiet) when no signal and scores are incomplete', () => {
      expect(resolveSignal(null, null, null)).toBeNull();
      expect(resolveSignal(undefined, 7, null)).toBeNull();
      expect(resolveSignal(null, undefined, 3)).toBeNull();
    });
  });
});
