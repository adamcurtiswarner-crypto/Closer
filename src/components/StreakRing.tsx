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
  ReduceMotion,
} from 'react-native-reanimated';
import type { DayActivity } from '@/hooks/useMonthlyActivity';

import { colors, spacing, typography } from '@/config/theme';
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
        withTiming(-8, { duration: 300, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        withTiming(8, { duration: 300, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        withTiming(-4, { duration: 200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        withTiming(4, { duration: 200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 400, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon name="flame" size={size} color={colors.accent.primary} weight="fill" />
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
            withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
          ),
          -1,
          false,
          undefined,
          ReduceMotion.System
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
            <Icon name="check" size={10} color={colors.text.inverse} weight="bold" />
          </View>
        )}
        {isPartial && (
          <View style={styles.checkOverlay}>
            <Icon name="check" size={10} color={colors.text.inverse} weight="bold" />
          </View>
        )}
        {isMissed && (
          <View style={styles.missedOverlay}>
            <Icon name="x" size={8} color={colors.semantic.destructive} weight="bold" />
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
        <Text
          style={[styles.streakCount, isStreakActive ? styles.streakActive : styles.streakInactive]}
          maxFontSizeMultiplier={1.4}
        >
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
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.cardPad,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streakCount: {
    ...typography.display,
  },
  streakActive: { color: colors.accent.primary },
  streakInactive: { color: colors.text.muted },
  streakLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  monthTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.smd,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayHeaderText: {
    ...typography.caption,
    color: colors.text.secondary,
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
    backgroundColor: colors.accent.primary,
    borderWidth: 2,
    borderColor: colors.semantic.neutral,
  },
  dayCellPartial: {
    backgroundColor: colors.accent.secondary,
  },
  dayCellMissed: {
    backgroundColor: colors.semantic.destructiveLight,
  },
  dayCellToday: {
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  dayCellUpcoming: {
    backgroundColor: colors.border.default,
  },
  dayNumber: {
    ...typography.caption,
    color: colors.text.primary,
  },
  dayNumberLight: {
    color: colors.text.inverse,
  },
  dayNumberMissed: {
    color: colors.semantic.destructive,
    opacity: 0.6,
  },
  dayNumberToday: {
    color: colors.accent.primary,
  },
  dayNumberUpcoming: {
    color: colors.text.muted,
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
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
