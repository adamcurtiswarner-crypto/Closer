import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { card } from '@/config/theme';

interface AccentBarProps {
  /** Override the bar color (e.g. category accent). Defaults to accent.primary. */
  color?: string;
  /** Extra styles — supports reanimated animated styles (e.g. pulse). */
  style?: StyleProp<ViewStyle>;
}

/**
 * The single 3px accent bar rendered across the top of a card.
 *
 * Policy: only the PRIMARY card of a screen renders an accent bar
 * (Today's prompt/reveal card). Secondary cards must not.
 * The parent card needs `overflow: 'hidden'` (bar is absolutely positioned).
 */
export function AccentBar({ color, style }: AccentBarProps) {
  return (
    <Animated.View
      style={[styles.bar, color ? { backgroundColor: color } : null, style]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    ...card.accentBar,
  },
});
