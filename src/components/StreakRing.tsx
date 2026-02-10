import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

interface StreakRingProps {
  currentStreak: number;
  weeklyCompletions: number;  // 0-7 completions this week
  isStreakActive: boolean;
}

function getMotivation(streak: number): string {
  if (streak === 0) return 'Start your streak today';
  if (streak === 1) return 'Great start!';
  if (streak <= 3) return 'Building momentum';
  if (streak <= 7) return 'On a roll!';
  if (streak <= 14) return 'Incredible dedication';
  if (streak <= 30) return 'Unstoppable together';
  return 'Legendary connection';
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakRing({ currentStreak, weeklyCompletions, isStreakActive }: StreakRingProps) {
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      {/* Streak circle */}
      <View style={styles.circleOuter}>
        <View style={[styles.circleInner, isStreakActive ? styles.circleActive : styles.circleInactive]}>
          <Text style={styles.streakEmoji}>{currentStreak > 0 ? '\uD83D\uDD25' : '\u26AA'}</Text>
          <Text style={[styles.streakNumber, isStreakActive ? styles.numberActive : styles.numberInactive]}>
            {currentStreak}
          </Text>
          <Text style={styles.dayLabel}>
            {currentStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.textContainer}>
        <Text style={styles.motivation}>{getMotivation(currentStreak)}</Text>

        {/* Weekly progress dots with day labels */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={styles.dayColumn}>
              <View
                style={[
                  styles.weekDot,
                  i < weeklyCompletions ? styles.weekDotFilled : styles.weekDotEmpty,
                ]}
              >
                {i < weeklyCompletions && (
                  <Text style={styles.checkmark}>{'\u2713'}</Text>
                )}
              </View>
              <Text style={styles.dayLabelText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.weekLabel}>{weeklyCompletions}/7 this week</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  circleOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  circleActive: {
    borderColor: '#c97454',
  },
  circleInactive: {
    borderColor: '#e7e5e4',
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: -2,
  },
  numberActive: {
    color: '#c97454',
  },
  numberInactive: {
    color: '#a8a29e',
  },
  dayLabel: {
    fontSize: 10,
    color: '#a8a29e',
    marginTop: -2,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  motivation: {
    fontSize: 14,
    fontWeight: '500',
    color: '#57534e',
    marginBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDotFilled: {
    backgroundColor: '#c97454',
  },
  weekDotEmpty: {
    backgroundColor: '#f5f5f4',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dayLabelText: {
    fontSize: 10,
    color: '#a8a29e',
    fontWeight: '500',
  },
  weekLabel: {
    fontSize: 12,
    color: '#a8a29e',
    marginTop: 10,
  },
});
