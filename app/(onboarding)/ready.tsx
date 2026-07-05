import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Icon } from '@/components';
import { colors, radius, spacing, typography } from '@/config/theme';
import { useAuth } from '@/hooks/useAuth';
import { completeOnboarding } from '@/utils/onboarding';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

// Matches the backend default in functions/src/prompts.ts
// (notification_time || '19:00') and the sign-up default in useAuth.
const DEFAULT_PROMPT_TIME = '19:00';

const TIME_OPTIONS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '21:00', label: '9:00 PM' },
];

export default function ReadyScreen() {
  const { user, refreshUser } = useAuth();
  const [selectedTime, setSelectedTime] = useState(
    user?.notificationTime || DEFAULT_PROMPT_TIME
  );
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();

  const timeLabel =
    TIME_OPTIONS.find((option) => option.value === selectedTime)?.label || '7:00 PM';

  const handleStart = async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      await completeOnboarding(user.id, { notificationTime: selectedTime });
      await refreshUser();
      router.replace('/(app)/today');
    } catch (error) {
      logger.error('Could not complete onboarding:', error);
      Alert.alert('Could not complete setup', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <View style={styles.checkmark}>
            <Icon name="check" size="xl" color={colors.accent.primary} weight="bold" />
          </View>
          <Text style={styles.title}>
            {t('onboarding.ready.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.ready.subtitle', { time: timeLabel })}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.timeSection}>
          <Text style={styles.timeLabel}>{t('onboarding.ready.changeTime')}</Text>
          <View style={styles.timeRow}>
            {TIME_OPTIONS.map((option) => {
              const isSelected = selectedTime === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={isSelected ? { selected: true } : {}}
                  style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                  onPress={() => setSelectedTime(option.value)}
                >
                  <Text
                    style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <TouchableOpacity
            style={styles.cta}
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={isSaving}
            onPress={handleStart}
          >
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.4}>
              {isSaving ? t('common.saving') : t('onboarding.ready.startNow')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkmark: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  timeSection: {
    marginBottom: spacing.xl,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.smd,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  timeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.smd,
    minHeight: 44,
    justifyContent: 'center',
  },
  timeChipSelected: {
    backgroundColor: colors.surface.warmTint,
    borderColor: colors.accent.primary,
  },
  timeChipText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  timeChipTextSelected: {
    color: colors.accent.primary,
  },
  // Full-width pill CTA
  cta: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  ctaText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
