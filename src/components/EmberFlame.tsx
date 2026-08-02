import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '@/config/theme';

/**
 * The flame inside the connection ember. A Phosphor glyph at this size was a
 * solid blob — this is a purpose-drawn flame in two layers so it still reads
 * as fire at 15px:
 *
 *   1. BODY — asymmetric silhouette: a sharp tip leaning right and one deep
 *             lick on the left, deep-coral base grading to warm coral.
 *   2. CORE — the hot centre, pale peach, sitting low in the bulb.
 *
 * Silhouettes were rendered and compared at 1x and 10x before picking this
 * one; a floating wisp above the tip was cut because at any size it read as
 * a leaf, turning the whole mark into a piece of fruit.
 *
 * Every colour is the palette's existing warm ramp (accent primary → the
 * flame/bloom badge borders), so it stays inside the design system.
 *
 * The flicker is deliberately irregular — unequal beats rather than a clean
 * sine — because evenly-pulsing fire reads as a loading spinner. The body
 * holds still and only the core moves, which keeps it calm enough to sit on
 * screen all day.
 */

/** Warm ramp, all from src/config/theme.ts. */
const FLAME_BASE = colors.accent.primary; // #D4522A
const FLAME_MID = colors.badgeTier.flame.border; // #f09060
const FLAME_HOT = colors.badgeTier.bloom.border; // #f5c4a8

interface EmberFlameProps {
  size?: number;
  /** Skip the flicker (reduced motion is also honoured internally). */
  still?: boolean;
}

export function EmberFlame({ size = 15, still = false }: EmberFlameProps) {
  const reduceMotion = useReducedMotion();
  const quiet = still || reduceMotion;

  // Gradient ids must be unique per instance — react-native-svg resolves
  // url(#id) against a shared registry, so a second flame (Hearth grid)
  // would otherwise repaint the first one's fills.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bodyId = `emberBody${uid}`;
  const coreId = `emberCore${uid}`;

  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.9);

  useEffect(() => {
    if (quiet) {
      coreScale.value = 1;
      coreOpacity.value = 0.9;
      return;
    }

    // Unequal beats — fire never pulses on a metronome.
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0.94, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.06, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 640, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    coreOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420 }),
        withTiming(0.72, { duration: 560 }),
        withTiming(0.92, { duration: 480 })
      ),
      -1,
      true
    );
  }, [quiet, coreScale, coreOpacity]);

  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));

  return (
    <View style={{ width: size, height: size }} testID="ember-flame">
      {/* Body — static, so the flame keeps its shape while the inside moves */}
      <Svg viewBox="0 0 24 24" width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={bodyId} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={FLAME_BASE} />
            <Stop offset="0.62" stopColor={FLAME_BASE} />
            <Stop offset="1" stopColor={FLAME_MID} />
          </LinearGradient>
        </Defs>
        <Path
          d="M13.2 2.1c.4 2.7 1.8 4.4 3.2 6.1 1.6 1.9 3.1 3.8 3.1 6.5a7.5 7.5 0 0 1-15 0c0-2 .7-3.6 1.8-5.1.1 1.1.6 2 1.4 2.6.5-4.1 2.5-7.5 5.5-10.1z"
          fill={`url(#${bodyId})`}
        />
      </Svg>

      {/* Hot core — flickers */}
      <Animated.View style={[StyleSheet.absoluteFill, coreStyle]}>
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          <Defs>
            <LinearGradient id={coreId} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={FLAME_MID} />
              <Stop offset="1" stopColor={FLAME_HOT} />
            </LinearGradient>
          </Defs>
          <Path
            d="M12.3 11c1.3 1.8 2.8 2.9 2.8 5a2.9 2.9 0 0 1-5.8 0c0-1.5.9-2.6 1.6-3.5.3.6.8 1 1.2 1.2-.1-.9 0-1.8.2-2.7z"
            fill={`url(#${coreId})`}
          />
        </Svg>
      </Animated.View>

    </View>
  );
}
