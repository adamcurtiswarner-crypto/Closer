import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { FollowUpContextLine } from './FollowUpContext';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import type { FollowUpBranch } from '@/types';

interface FollowUpLockedCardProps {
  /** Branch drives the context line; the line stays visible while locked. */
  branch?: FollowUpBranch;
  /** The follow-up question — rendered blurred, never hidden entirely. */
  promptText: string;
  onSeePremium: () => void;
}

/**
 * The locked state of a follow-up assignment (premiumGates on, couple free).
 * The context line tells the truth about what surfaced ("Your scores were
 * far apart on this"); the question itself is blurred behind a quiet
 * Premium line. Skipping stays free and lives outside this card.
 */
export function FollowUpLockedCard({
  branch,
  promptText,
  onSeePremium,
}: FollowUpLockedCardProps) {
  const { t } = useTranslation();

  useEffect(() => {
    logEvent('gate_hit', { surface: 'follow_up' });
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(400)} testID="follow-up-locked">
      {branch && <FollowUpContextLine branch={branch} />}
      <View style={styles.card}>
        {/* Blurred question — visually present (the follow-up EXISTS and we
            say so), unreadable, and hidden from screen readers so the blur
            cannot be bypassed. */}
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.blurredText} numberOfLines={3}>
            {promptText}
          </Text>
        </View>

        <View style={styles.lockRow}>
          <Icon name="lock" size="sm" color={colors.text.secondary} weight="light" />
          <Text style={styles.lockedLine}>{t('gates.followUpLine')}</Text>
        </View>

        <TouchableOpacity
          style={styles.premiumButton}
          onPress={onSeePremium}
          accessibilityRole="button"
          activeOpacity={0.8}
          testID="follow-up-locked-cta"
        >
          <Text style={styles.premiumButtonText} maxFontSizeMultiplier={1.4}>
            {t('gates.seePremium')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  blurredText: {
    ...typography.heading,
    textAlign: 'center',
    // Blur effect: transparent glyphs, soft shadow where the text sits.
    color: 'transparent',
    textShadowColor: colors.text.muted,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  lockedLine: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  premiumButton: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  premiumButtonText: {
    ...typography.btn,
    color: colors.accent.primary,
  },
});
