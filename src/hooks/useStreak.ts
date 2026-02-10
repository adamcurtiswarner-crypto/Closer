import { useCouple } from './useCouple';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyCompletions: number;
  isStreakActive: boolean;
}

export function useStreak(): StreakData & { isLoading: boolean } {
  const { data: couple, isLoading } = useCouple();

  if (!couple) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      weeklyCompletions: 0,
      isStreakActive: false,
      isLoading,
    };
  }

  return {
    currentStreak: couple.currentStreak,
    longestStreak: couple.longestStreak,
    weeklyCompletions: couple.currentWeekCompletions,
    isStreakActive: couple.currentStreak > 0,
    isLoading,
  };
}
