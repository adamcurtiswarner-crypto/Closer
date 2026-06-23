import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Icon } from './Icon';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { DayActivity } from '@/hooks/useMonthlyActivity';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface StreakRingProps {
  currentStreak: number;
  days: DayActivity[];
  completedCount: number;
  isStreakActive: boolean;
  month: string;
  year: number;
  startDayOffset: number;
  celebrate?: boolean;
}

function getMotivation(streak: number): string {
  if (streak === 0) return 'Start your streak today';
  if (streak === 1) return 'A beginning';
  if (streak <= 3) return 'Building momentum';
  if (streak <= 7) return 'A quiet habit forming';
  if (streak <= 14) return 'Steady together';
  if (streak <= 30) return 'Something real';
  return 'A practice that lasts';
}

function AnimatedFlame({ size = 22 }: { size?: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400 }),
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon name="flame" size={size} color="#D4522A" weight="fill" />
    </Animated.View>
  );
}

function CalendarDay({ day }: { day: DayActivity }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (day.status === 'today') {
      pulse.value = withDelay(500,
        withRepeat(
          withSequence(
            withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          ),
          -1
        )
      );
    }
  }, [day.status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: day.status === 'today' ? pulse.value : 1 }],
  }));

  const isCompleted = day.status === 'completed';
  const isPartial = day.status === 'partial-you' || day.status === 'partial-partner';
  const isMissed = day.status === 'missed';
  const isDayToday = day.status === 'today';
  const isUpcoming = day.status === 'upcoming';

  return (
    <View style={styles.cellWrapper}>
      <Animated.View style={[
        styles.dayCell,
        isCompleted && styles.dayCellCompleted,
        isPartial && styles.dayCellPartial,
        isMissed && styles.dayCellMissed,
        isDayToday && styles.dayCellToday,
        isUpcoming && styles.dayCellUpcoming,
        pulseStyle,
      ]}>
        <Text style={[
          styles.dayNumber,
          (isCompleted || isPartial) && styles.dayNumberLight,
          isMissed && styles.dayNumberMissed,
          isDayToday && styles.dayNumberToday,
          isUpcoming && styles.dayNumberUpcoming,
        ]}>
          {day.dayNumber}
        </Text>
        {isCompleted && (
          <View style={styles.checkOverlay}>
            <Icon name="check" size={10} color="#ffffff" weight="bold" />
          </View>
        )}
        {isPartial && (
          <View style={styles.checkOverlay}>
            <Icon name="check" size={10} color="#ffffff" weight="bold" />
          </View>
        )}
        {isMissed && (
          <View style={styles.missedOverlay}>
            <Icon name="x" size={8} color="#ef4444" weight="bold" />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export function StreakRing({
  currentStreak,
  days,
  completedCount,
  isStreakActive,
  month,
  year,
  startDayOffset,
}: StreakRingProps) {
  const gridCells: (DayActivity | null)[] = [];
  for (let i = 0; i < startDayOffset; i++) {
    gridCells.push(null);
  }
  for (const day of days) {
    gridCells.push(day);
  }
  while (gridCells.length % 7 !== 0) {
    gridCells.push(null);
  }

  const rows: (DayActivity | null)[][] = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    rows.push(gridCells.slice(i, i + 7));
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Streak header */}
      <View style={styles.streakHeader}>
        <AnimatedFlame size={24} />
        <Text style={[styles.streakCount, isStreakActive ? styles.streakActive : styles.streakInactive]}>
          {currentStreak}
        </Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      {/* Month title */}
      <Text style={styles.monthTitle}>{month} {year}</Text>

      {/* Day headers */}
      <View style={styles.dayHeaderRow}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={styles.cellWrapper}>
            <Text style={styles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {rows.map((row, rowIndex) => (
        <Animated.View
          key={rowIndex}
          entering={FadeIn.duration(300).delay(100 + rowIndex * 60)}
          style={styles.calendarRow}
        >
          {row.map((cell, cellIndex) => (
            cell ? (
              <CalendarDay key={cell.date} day={cell} />
            ) : (
              <View key={`empty-${rowIndex}-${cellIndex}`} style={styles.cellWrapper} />
            )
          ))}
        </Animated.View>
      ))}

      {/* Motivation */}
      <Animated.Text
        entering={FadeIn.duration(400).delay(500)}
        style={styles.motivation}
      >
        {getMotivation(currentStreak)}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  streakCount: {
    fontSize: 28,
    fontFamily: 'Nunito-Black',
    fontWeight: '600',
  },
  streakActive: { color: '#D4522A' },
  streakInactive: { color: '#B8B8C4' },
  streakLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    fontWeight: '600',
    color: '#1E1E2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeaderText: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '500',
    color: '#B8B8C4',
    textAlign: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
  },
  cellWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellCompleted: {
    backgroundColor: '#D4522A',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  dayCellPartial: {
    backgroundColor: '#3b82f6',
  },
  dayCellMissed: {
    backgroundColor: '#fef2f2',
  },
  dayCellToday: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#D4522A',
  },
  dayCellUpcoming: {
    backgroundColor: '#E2DED8',
  },
  dayNumber: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '500',
    color: '#1E1E2E',
  },
  dayNumberLight: {
    color: '#ffffff',
  },
  dayNumberMissed: {
    color: '#ef4444',
    opacity: 0.6,
  },
  dayNumberToday: {
    color: '#D4522A',
    fontWeight: '600',
  },
  dayNumberUpcoming: {
    color: '#B8B8C4',
  },
  checkOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  missedOverlay: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  motivation: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '500',
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 14,
  },
});
