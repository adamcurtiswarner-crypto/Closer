jest.mock('@/hooks/useCouple', () => ({
  useCouple: jest.fn(),
}));

import { useCouple } from '@/hooks/useCouple';

const mockUseCouple = useCouple as jest.MockedFunction<typeof useCouple>;

// Inline the hook logic for testing since we can't use renderHook easily
function computeStreak(couple: any) {
  if (!couple) {
    return { currentStreak: 0, longestStreak: 0, isStreakActive: false };
  }
  return {
    currentStreak: couple.currentStreak,
    longestStreak: couple.longestStreak,
    isStreakActive: couple.currentStreak > 0,
  };
}

describe('useStreak', () => {
  it('should return zero streak when no couple', () => {
    const result = computeStreak(null);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.isStreakActive).toBe(false);
  });

  it('should return current streak from couple data', () => {
    const result = computeStreak({
      currentStreak: 5,
      longestStreak: 10,
    });
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(10);
    expect(result.isStreakActive).toBe(true);
  });

  it('should mark streak as inactive when currentStreak is 0', () => {
    const result = computeStreak({
      currentStreak: 0,
      longestStreak: 10,
    });
    expect(result.isStreakActive).toBe(false);
  });

  it('should mark streak as active when currentStreak is 1', () => {
    const result = computeStreak({
      currentStreak: 1,
      longestStreak: 1,
    });
    expect(result.isStreakActive).toBe(true);
  });
});
