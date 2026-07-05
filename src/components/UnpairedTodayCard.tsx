import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AccentBar } from './AccentBar';
import { Icon } from './Icon';

import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface UnpairedTodayCardProps {
  onInvite: () => void;
  onBrowse: () => void;
}

/**
 * Today's main card for a user with no linked partner. Daily prompt delivery
 * requires a couple, so this tells the truth — the next step is inviting your
 * partner, with browsing questions as the quiet secondary path.
 */
export function UnpairedTodayCard({ onInvite, onBrowse }: UnpairedTodayCardProps) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.card}>
      <AccentBar />
      <Icon name="users" size="xl" color={colors.accent.primary} weight="light" />
      <Text style={styles.eyebrow}>{t('today.unpairedEyebrow')}</Text>
      <Text style={styles.heading}>{t('today.unpairedHeading')}</Text>
      <Text style={styles.body}>{t('today.unpairedBody')}</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onInvite}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('today.invitePartner')}
      >
        <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>
          {t('today.invitePartner')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.ghostButton}
        onPress={onBrowse}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('today.browseQuestions')}
      >
        <Text style={styles.ghostButtonText}>{t('today.browseQuestions')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  ghostButton: {
    minHeight: 44,
    marginTop: spacing.sm,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
