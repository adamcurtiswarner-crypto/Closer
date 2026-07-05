import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface NotificationPrePromptProps {
  visible: boolean;
  partnerName: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Branded pre-prompt shown before the one-shot system notification dialog.
 * Appears after the user's first submitted answer (see useNotificationPrePrompt
 * for the gating rules) — accepting triggers the real permission request.
 */
export function NotificationPrePrompt({
  visible,
  partnerName,
  onAccept,
  onDismiss,
}: NotificationPrePromptProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="chat-circle" size="lg" color={colors.accent.primary} weight="light" />
          </View>
          <Text style={styles.heading}>{t('today.notifHeading')}</Text>
          <Text style={styles.body}>{t('today.notifBody', { name: partnerName })}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onAccept}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('today.notifCta')}
          >
            <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>
              {t('today.notifCta')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={onDismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('today.notNow')}
          >
            <Text style={styles.ghostButtonText}>{t('today.notNow')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 46, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heading: {
    ...typography.heading,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
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
