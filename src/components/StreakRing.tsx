import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { hapticNotification, NotificationFeedbackType } from '@utils/haptics';

interface StreakRingProps {
  currentStreak: number;
  weeklyCompletions: number;
  isStreakActive: boolean;
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

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const PARTICLE_COUNT = 8;

export function StreakRing({ currentStreak, weeklyCompletions, isStreakActive, celebrate = false }: StreakRingProps) {
  // Main ring animation
  const ringScale = useSharedValue(celebrate ? 0.3 : 0.8);
  const numberScale = useSharedValue(celebrate ? 0 : 0.8);
  const numberOpacity = useSharedValue(0);

  // Glow pulse
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Particle burst
  const particleProgress = useSharedValue(0);

  // Flame bounce
  const flameScale = useSharedValue(celebrate ? 0 : 1);
  const flameRotation = useSharedValue(0);

  useEffect(() => {
    if (celebrate) {
      // Stage 1: Ring scales up with overshoot
      ringScale.value = withSpring(1, { damping: 8, stiffness: 120, mass: 0.8 });

      // Stage 2: Flame pops in with bounce
      flameScale.value = withDelay(200, withSpring(1, { damping: 6, stiffness: 200 }));
      flameRotation.value = withDelay(200,
        withSequence(
          withTiming(-12, { duration: 80 }),
          withTiming(12, { duration: 80 }),
          withTiming(-6, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        )
      );

      // Stage 3: Number rolls in
      numberScale.value = withDelay(400, withSpring(1, { damping: 7, stiffness: 180 }));
      numberOpacity.value = withDelay(350, withTiming(1, { duration: 200 }));

      // Stage 4: Glow pulse
      glowOpacity.value = withDelay(300,
        withSequence(
          withTiming(0.6, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) }),
        )
      );
      glowScale.value = withDelay(300,
        withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) })
      );

      // Stage 5: Particle burst
      particleProgress.value = withDelay(250,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
      );

      // Haptic
      hapticNotification(NotificationFeedbackType.Success);
    } else {
      // Quiet entrance
      ringScale.value = withSpring(1, { damping: 14, stiffness: 160 });
      numberOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      numberScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 150 }));
      flameScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 140 }));
    }
  }, [celebrate]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ scale: numberScale.value }],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  // Create particle animated styles
  const particleStyles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
    return useAnimatedStyle(() => {
      const distance = interpolate(particleProgress.value, [0, 1], [0, 60]);
      const opacity = interpolate(particleProgress.value, [0, 0.3, 1], [0, 1, 0]);
      const scale = interpolate(particleProgress.value, [0, 0.2, 1], [0, 1, 0.3]);
      return {
        position: 'absolute' as const,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: i % 2 === 0 ? '#c97454' : '#f9a07a',
        opacity,
        transform: [
          { translateX: Math.cos(angle) * distance },
          { translateY: Math.sin(angle) * distance },
          { scale },
        ],
      };
    });
  });

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Streak circle with particles */}
      <View style={styles.circleContainer}>
        {/* Glow ring */}
        {celebrate && (
          <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />
        )}

        {/* Particles */}
        {celebrate && particleStyles.map((style, i) => (
          <Animated.View key={i} style={style} />
        ))}

        {/* Main ring */}
        <Animated.View style={[styles.circleOuter, ringAnimatedStyle]}>
          <View style={[styles.circleInner, isStreakActive ? styles.circleActive : styles.circleInactive]}>
            <Animated.View style={flameAnimatedStyle}>
              {currentStreak > 0
                ? <Icon name="flame" size={18} color="#c97454" weight="fill" />
                : <Icon name="flame" size={18} color="#d6d3d1" weight="light" />
              }
            </Animated.View>
            <Animated.Text style={[styles.streakNumber, isStreakActive ? styles.numberActive : styles.numberInactive, numberAnimatedStyle]}>
              {currentStreak}
            </Animated.Text>
            <Text style={styles.dayLabel}>
              {currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.textContainer}>
        <Animated.Text
          entering={FadeIn.duration(400).delay(celebrate ? 600 : 200)}
          style={styles.motivation}
        >
          {getMotivation(currentStreak)}
        </Animated.Text>

        {/* Weekly progress dots with staggered pop-in */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((label, i) => (
            <WeekDay
              key={i}
              label={label}
              completed={i < weeklyCompletions}
              delay={celebrate ? 700 + i * 80 : 300 + i * 60}
            />
          ))}
        </View>
        <Animated.Text
          entering={FadeIn.duration(300).delay(celebrate ? 1300 : 800)}
          style={styles.weekLabel}
        >
          {weeklyCompletions}/7 this week
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

function WeekDay({ label, completed, delay }: { label: string; completed: boolean; delay: number }) {
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }));
    if (completed) {
      checkScale.value = withDelay(delay + 150, withSpring(1, { damping: 6, stiffness: 220 }));
    }
  }, [completed, delay]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={styles.dayColumn}>
      <Animated.View
        style={[
          styles.weekDot,
          completed ? styles.weekDotFilled : styles.weekDotEmpty,
          dotStyle,
        ]}
      >
        {completed && (
          <Animated.View style={checkStyle}>
            <Icon name="check" size="xs" color="#ffffff" weight="bold" />
          </Animated.View>
        )}
      </Animated.View>
      <Text style={styles.dayLabelText}>{label}</Text>
    </View>
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
  circleContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#c97454',
  },
  circleOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 24,
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
