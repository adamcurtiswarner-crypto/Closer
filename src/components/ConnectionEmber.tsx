import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { colors } from '@/config/theme';

/**
 * "The thread catches" — the ember on the connection thread between the two
 * avatars, lit only once BOTH partners have answered the day (founder ask
 * 2026-08-02).
 *
 * This is the slot the streak pill used to occupy. A streak counts a debt
 * you can break; an ember marks a moment you made together — same real
 * estate, opposite emotional charge, and it keeps the anti-guilt doctrine
 * intact (nothing appears when the day is unanswered; absence is never
 * marked, only presence).
 *
 * Motion, in two acts:
 *   1. IGNITION (only when the day completes while you're on screen): a
 *      spark leaves each avatar — coral from you, purple from them —
 *      travels inward, and they meet in the middle, where the ember blooms.
 *   2. BREATH: a slow glow that persists for the rest of the day.
 *
 * Mounting into an already-complete day skips the ignition and settles
 * straight to the breath — the ceremony belongs to the moment it happened,
 * not to every remount. Reduced motion gets the lit ember with no travel
 * and no pulse.
 */

const SPARK_TRAVEL_MS = 620;
const BLOOM_DELAY_MS = SPARK_TRAVEL_MS - 60; // bloom as the sparks arrive
const BREATH_MS = 2600;
/** How far each spark travels inward, in px (half the thread, roughly). */
const SPARK_DISTANCE = 34;

interface ConnectionEmberProps {
  /** Both partners have answered today. */
  lit: boolean;
  /**
   * True when `lit` flipped while this screen was mounted — the couple was
   * present for the moment, so the ignition plays. Mounting already-lit
   * settles straight to the breath.
   */
  igniting: boolean;
}

export function ConnectionEmber({ lit, igniting }: ConnectionEmberProps) {
  const reduceMotion = useReducedMotion();

  // Ember core + halo
  const emberScale = useSharedValue(igniting && !reduceMotion ? 0 : 1);
  const emberOpacity = useSharedValue(igniting && !reduceMotion ? 0 : 1);
  const glowOpacity = useSharedValue(reduceMotion ? 0.5 : 0.35);
  // Sparks travelling inward (0 = at the avatar end, 1 = at the centre)
  const sparkProgress = useSharedValue(igniting && !reduceMotion ? 0 : 1);
  const sparkOpacity = useSharedValue(0);

  useEffect(() => {
    if (!lit) return;

    if (reduceMotion) {
      emberScale.value = 1;
      emberOpacity.value = 1;
      glowOpacity.value = 0.5;
      sparkOpacity.value = 0;
      return;
    }

    const breathe = () => {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.28, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    };

    if (!igniting) {
      emberScale.value = 1;
      emberOpacity.value = 1;
      breathe();
      return;
    }

    // Act 1 — the sparks leave the avatars and travel inward.
    sparkOpacity.value = withSequence(
      withTiming(1, { duration: 140 }),
      withDelay(
        SPARK_TRAVEL_MS - 240,
        withTiming(0, { duration: 100 })
      )
    );
    sparkProgress.value = withTiming(1, {
      duration: SPARK_TRAVEL_MS,
      easing: Easing.inOut(Easing.ease),
    });

    // Act 2 — the ember blooms where they meet, then breathes.
    emberOpacity.value = withDelay(BLOOM_DELAY_MS, withTiming(1, { duration: 220 }));
    emberScale.value = withDelay(
      BLOOM_DELAY_MS,
      withSpring(1, { damping: 9, stiffness: 170 })
    );
    glowOpacity.value = withDelay(
      BLOOM_DELAY_MS + 220,
      withTiming(0.6, { duration: 260 }, () => {
        // Chaining inside the callback keeps the breath from fighting the bloom.
      })
    );
    const breathTimer = setTimeout(breathe, BLOOM_DELAY_MS + 500);
    return () => clearTimeout(breathTimer);
  }, [
    lit,
    igniting,
    reduceMotion,
    emberScale,
    emberOpacity,
    glowOpacity,
    sparkProgress,
    sparkOpacity,
  ]);

  const emberStyle = useAnimatedStyle(() => ({
    opacity: emberOpacity.value,
    transform: [{ scale: emberScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * emberOpacity.value,
  }));
  const sparkLeftStyle = useAnimatedStyle(() => ({
    opacity: sparkOpacity.value,
    transform: [{ translateX: -SPARK_DISTANCE * (1 - sparkProgress.value) }],
  }));
  const sparkRightStyle = useAnimatedStyle(() => ({
    opacity: sparkOpacity.value,
    transform: [{ translateX: SPARK_DISTANCE * (1 - sparkProgress.value) }],
  }));

  if (!lit) return null;

  return (
    <View style={styles.wrap} testID="connection-ember" pointerEvents="none">
      {/* Sparks — one from each side, only during the ignition */}
      <Animated.View style={[styles.spark, styles.sparkYou, sparkLeftStyle]} />
      <Animated.View style={[styles.spark, styles.sparkPartner, sparkRightStyle]} />

      {/* Halo + ember core */}
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.ember, emberStyle]}>
        <Icon name="flame" size="xs" color={colors.accent.primary} weight="fill" />
      </Animated.View>
    </View>
  );
}

const EMBER_SIZE = 22;
const GLOW_SIZE = 34;

const styles = StyleSheet.create({
  wrap: {
    width: EMBER_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: colors.surface.warmTint,
  },
  ember: {
    width: EMBER_SIZE,
    height: EMBER_SIZE,
    borderRadius: EMBER_SIZE / 2,
    backgroundColor: colors.surface.warmTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sparkYou: {
    backgroundColor: colors.accent.primary,
  },
  sparkPartner: {
    backgroundColor: colors.brand.purple,
  },
});
