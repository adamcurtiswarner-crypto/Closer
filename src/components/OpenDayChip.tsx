import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

export type OpenDayChipState = 'sealed' | 'open' | 'reveal';

/**
 * Which of the chip's three states the secondary day is in, or null when
 * there is nothing honest to show (both-unanswered never reaches here —
 * the selector excludes untouched days).
 * - sealed: I answered, partner hasn't — static, the seal holds.
 * - open:   partner answered, I haven't — their words wait on mine.
 * - reveal: both answered — the finished day is one tap away.
 */
export function openDayChipState(info: {
  iAnswered: boolean;
  partnerAnswered: boolean;
  isComplete: boolean;
}): OpenDayChipState | null {
  if (info.isComplete) return 'reveal';
  if (info.iAnswered && !info.partnerAnswered) return 'sealed';
  if (info.partnerAnswered && !info.iAnswered) return 'open';
  return null;
}

interface OpenDayChipProps {
  iAnswered: boolean;
  partnerAnswered: boolean;
  isComplete: boolean;
  /** Partner display name — caller falls back to "your partner". */
  partnerName: string;
  /** Open the responding flow for the still-open question ('open' state). */
  onOpenResponding: () => void;
  /** Present the finished day's reveal ('reveal' state). */
  onOpenReveal: () => void;
}

/**
 * Quiet, compact row under the day's primary card: yesterday's question is
 * still live alongside today's ("the day always arrives"). Deliberately
 * subordinate — subtle shadow, no accent bar, one line of type. Renders
 * nothing when there is no secondary state to speak to.
 */
export function OpenDayChip({
  iAnswered,
  partnerAnswered,
  isComplete,
  partnerName,
  onOpenResponding,
  onOpenReveal,
}: OpenDayChipProps) {
  const { t } = useTranslation();

  const state = openDayChipState({ iAnswered, partnerAnswered, isComplete });
  if (state === null) return null;

  if (state === 'sealed') {
    const label = t('today.openDaySealed', { name: partnerName });
    return (
      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <View
          style={styles.chip}
          accessible
          accessibilityLabel={label}
          testID="open-day-chip-sealed"
        >
          <Icon name="lock" size={16} color={colors.text.muted} weight="light" />
          <Text style={[styles.text, styles.textMuted]} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const isReveal = state === 'reveal';
  const label = isReveal
    ? t('today.openDayReveal')
    : t('today.openDayStillOpen');

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(300)}>
      <TouchableOpacity
        style={styles.chip}
        onPress={isReveal ? onOpenReveal : onOpenResponding}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={isReveal ? 'open-day-chip-reveal' : 'open-day-chip-open'}
      >
        <Icon
          name={isReveal ? 'checks' : 'chat-circle'}
          size={16}
          color={colors.accent.primary}
        />
        <Text style={styles.text} numberOfLines={2}>
          {label}
        </Text>
        <Icon name="caret-right" size={14} color={colors.text.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginTop: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    ...shadow.cardSubtle,
  },
  text: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  textMuted: {
    color: colors.text.secondary,
  },
});
