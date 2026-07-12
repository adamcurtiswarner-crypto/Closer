import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import type { HearthSignal } from '@/utils/hearthSignal';
import type { HearthTileState } from '@/hooks/useHearth';

/**
 * Per-entry visual state system for Hearth surfaces (queue cards, category
 * detail rows). Tokens only, and every state is always paired with a text
 * label at the call site — color is never the sole carrier of meaning.
 */
export type HearthVisualState = HearthSignal | 'tended';

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

/**
 * Grid tile visuals for the accumulated per-category state. Steady is a
 * warm neutral — warmTint with secondary text, alive rather than the dead
 * gray. Unlit gets a reduced-opacity treatment on top of the card surface.
 */
export const HEARTH_TILE_VISUALS: Record<
  HearthTileState,
  { bg: string; fg: string; border: string }
> = {
  talk: {
    bg: colors.accent.primaryLight,
    fg: colors.accent.primary,
    border: colors.accent.primaryLight,
  },
  compare: {
    bg: colors.brand.purpleLight,
    fg: colors.brand.purple,
    border: colors.brand.purpleLight,
  },
  glowing: {
    bg: colors.brand.greenLight,
    fg: colors.semantic.success,
    border: colors.brand.greenLight,
  },
  tended: {
    bg: colors.semantic.successLight,
    fg: colors.semantic.success,
    border: colors.semantic.successLight,
  },
  steady: {
    bg: colors.surface.warmTint,
    fg: colors.text.secondary,
    border: colors.surface.warmTint,
  },
  unlit: {
    bg: colors.surface.card,
    fg: colors.text.muted,
    border: colors.border.default,
  },
};

const UNLIT_OPACITY = 0.55;

/** Quiet 8px breathing dot for tiles with an open "talk about it". */
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
  state: HearthTileState;
  stateLabel: string;
  /** Caption tally line below the state label ("3 answered · warming"). */
  tally?: string;
  onPress: () => void;
  testID?: string;
}

export function HearthEmberTile({
  label,
  icon,
  state,
  stateLabel,
  tally,
  onPress,
  testID,
}: HearthEmberTileProps) {
  const visual = HEARTH_TILE_VISUALS[state];
  const accessibilityLabel = tally
    ? `${label}, ${stateLabel}, ${tally}`
    : `${label}, ${stateLabel}`;

  // At 3-across width a long single-word label ("Communication") char-wraps
  // mid-word on iOS. Forcing single-word labels to ONE line makes the
  // overflow exceed numberOfLines, which is what actually triggers
  // adjustsFontSizeToFit — the label shrinks a step instead of breaking
  // "Communicatio / n". Multi-word labels ("Growth and independence") wrap
  // at spaces across two lines; if a wrapped word would still overflow onto
  // a third line, the same shrink kicks in.
  const isSingleWordLabel = !label.trim().includes(' ');

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        { backgroundColor: visual.bg, borderColor: visual.border },
        state === 'unlit' && styles.unlit,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.8}
      testID={testID}
    >
      {state === 'talk' && <PulseDot />}
      <Icon name={icon} size="md" color={visual.fg} weight="light" />
      <Text
        style={styles.label}
        numberOfLines={isSingleWordLabel ? 1 : 2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        lineBreakStrategyIOS="standard"
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
      <View style={styles.stateRow}>
        {state === 'tended' && (
          <Icon name="check" size={12} color={visual.fg} weight="bold" />
        )}
        <Text
          style={[styles.stateLabel, { color: visual.fg }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {stateLabel}
        </Text>
      </View>
      {tally != null && tally !== '' && (
        // Two lines, never an ellipsis — the unlit hint and the
        // "N answered · warming" tally both wrap at spaces if the column
        // runs narrow (~15 caption characters per line at 3-across).
        <Text style={styles.tally} numberOfLines={2} maxFontSizeMultiplier={1.4}>
          {tally}
        </Text>
      )}
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
  unlit: {
    opacity: UNLIT_OPACITY,
  },
  label: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stateLabel: {
    ...typography.caption,
  },
  tally: {
    ...typography.caption,
    color: colors.text.secondary,
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
