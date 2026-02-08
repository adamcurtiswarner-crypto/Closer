import { useCouple } from './useCouple';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  isStreakActive: boolean;
}

export function useStreak(): StreakData & { isLoading: boolean } {
  const { data: couple, isLoading } = useCouple();

  if (!couple) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isStreakActive: false,
      isLoading,
    };
  }

  return {
    currentStreak: couple.currentStreak,
    longestStreak: couple.longestStreak,
    isStreakActive: couple.currentStreak > 0,
    isLoading,
  };
}
