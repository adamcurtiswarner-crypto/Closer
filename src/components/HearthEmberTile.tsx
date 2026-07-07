import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon, IconName } from './Icon';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import type { CategoryEmberState } from '@/hooks/useHearth';

/**
 * Visual state system for Hearth surfaces. Tokens only, and every state
 * is always paired with a text label at the call site — color is never
 * the sole carrier of meaning.
 */
export type HearthVisualState = CategoryEmberState | 'tended';

export const HEARTH_STATE_VISUALS: Record<
  HearthVisualState,
  { bg: string; fg: string; border: string }
> = {
  repair: {
    bg: colors.accent.primaryLight,
    fg: colors.accent.primary,
    border: colors.accent.primaryLight,
  },
  divergence: {
    bg: colors.brand.purpleLight,
    fg: colors.brand.purple,
    border: colors.brand.purpleLight,
  },
  deepener: {
    bg: colors.brand.greenLight,
    fg: colors.semantic.success,
    border: colors.brand.greenLight,
  },
  tended: {
    bg: colors.brand.greenLight,
    fg: colors.semantic.success,
    border: colors.brand.greenLight,
  },
  steady: {
    bg: colors.surface.card,
    fg: colors.text.secondary,
    border: colors.border.default,
  },
};

/** Quiet 8px breathing dot for un-tended repair embers. */
function PulseDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(1, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View testID="hearth-pulse-dot" style={[styles.pulseDot, animatedStyle]} />;
}

interface HearthEmberTileProps {
  label: string;
  icon: IconName;
  state: CategoryEmberState;
  stateLabel: string;
  onPress: () => void;
  testID?: string;
}

export function HearthEmberTile({
  label,
  icon,
  state,
  stateLabel,
  onPress,
  testID,
}: HearthEmberTileProps) {
  const visual = HEARTH_STATE_VISUALS[state];

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: visual.bg, borderColor: visual.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${stateLabel}`}
      activeOpacity={0.8}
      testID={testID}
    >
      {state === 'repair' && <PulseDot />}
      <Icon name={icon} size="md" color={visual.fg} weight="light" />
      <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      <Text
        style={[styles.stateLabel, { color: visual.fg }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.4}
      >
        {stateLabel}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 104,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.smd,
    gap: spacing.xs,
    justifyContent: 'flex-end',
    ...shadow.cardSubtle,
  },
  label: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  stateLabel: {
    ...typography.caption,
  },
  pulseDot: {
    position: 'absolute',
    top: spacing.smd,
    right: spacing.smd,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
});
