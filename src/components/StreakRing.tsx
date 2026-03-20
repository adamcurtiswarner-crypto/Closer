import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface StreakRingProps {
  currentStreak: number;
  weeklyCompletions: number;  // 0-7 completions this week
  isStreakActive: boolean;
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

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakRing({ currentStreak, weeklyCompletions, isStreakActive }: StreakRingProps) {
  const ringScale = useSharedValue(0.6);
  const numberOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 14, stiffness: 160 });
    numberOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      {/* Streak circle */}
      <Animated.View style={[styles.circleOuter, ringAnimatedStyle]}>
        <View style={[styles.circleInner, isStreakActive ? styles.circleActive : styles.circleInactive]}>
          {currentStreak > 0
            ? <Icon name="flame" size={16} color="#c97454" weight="fill" />
            : <Icon name="flame" size={16} color="#d6d3d1" weight="light" />
          }
          <Animated.Text style={[styles.streakNumber, isStreakActive ? styles.numberActive : styles.numberInactive, numberAnimatedStyle]}>
            {currentStreak}
          </Animated.Text>
          <Text style={styles.dayLabel}>
            {currentStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </Animated.View>

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
                  <Icon name="check" size="xs" color="#ffffff" weight="bold" />
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
    fontFamily: 'Inter-Medium',
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
  dayLabelText: {
    fontSize: 10,
    color: '#a8a29e',
    fontWeight: '500',
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    marginTop: 10,
  },
});
