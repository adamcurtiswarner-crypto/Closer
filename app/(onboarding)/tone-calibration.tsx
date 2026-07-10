import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button, Icon } from '@/components';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/config/theme';

// Skippable — prompt selection falls back to the 'solid' default
// written at sign-up (see useAuth), so no answer is required here.
const TONE_OPTIONS = [
  { value: 'solid', labelKey: 'solid', descriptionKey: 'solidDescription' },
  { value: 'distant', labelKey: 'okay', descriptionKey: 'okayDescription' },
  { value: 'struggling', labelKey: 'struggling', descriptionKey: 'strugglingDescription' },
];

export default function ToneCalibrationScreen() {
  const { user, refreshUser } = useAuth();
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { t } = useTranslation();

  const handleContinue = async () => {
    if (!user?.id || !selectedTone) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tone_calibration: selectedTone,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/first-prompt');
    } catch (error) {
      logger.error('Error saving tone calibration:', error);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/first-prompt');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          {t('onboarding.toneCalibration.title')}
        </Animated.Text>
        <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.subtitle}>
          {t('onboarding.toneCalibration.subtitle')}
        </Animated.Text>

        <View style={styles.optionsContainer}>
          {TONE_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.value}
              entering={FadeInUp.duration(400).delay(200 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedTone === option.value
                    ? styles.optionCardSelected
                    : styles.optionCardDefault,
                ]}
                onPress={() => setSelectedTone(option.value)}
              >
                <View style={styles.optionHeader}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedTone === option.value
                        ? styles.optionLabelSelected
                        : styles.optionLabelDefault,
                    ]}
                  >
                    {t(`onboarding.toneCalibration.${option.labelKey}`)}
                  </Text>
                  {selectedTone === option.value && (
                    <Icon name="check" size="sm" color={colors.accent.primary} weight="bold" />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionDescription,
                    selectedTone === option.value
                      ? styles.optionDescriptionSelected
                      : styles.optionDescriptionDefault,
                  ]}
                >
                  {t(`onboarding.toneCalibration.${option.descriptionKey}`)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.spacer} />

        {saveError && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              {t('onboarding.toneCalibration.saveErrorTitle')}
            </Text>
            <Text style={styles.errorBody}>
              {t('onboarding.toneCalibration.saveErrorBody')}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.buttonContainer}>
          <Button
            title={isSaving ? t('common.saving') : t('common.continue')}
            onPress={handleContinue}
            disabled={!selectedTone || isSaving}
          />
          <TouchableOpacity
            style={styles.skipLink}
            onPress={handleSkip}
            disabled={isSaving}
          >
            <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  optionsContainer: {
    marginTop: spacing.xl,
  },
  optionCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.smd,
  },
  optionCardSelected: {
    backgroundColor: colors.surface.warmTint,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  optionCardDefault: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    ...typography.body,
  },
  optionLabelSelected: {
    color: colors.accent.primary,
  },
  optionLabelDefault: {
    color: colors.text.primary,
  },
  optionDescription: {
    ...typography.bodySm,
    marginTop: spacing.xs,
  },
  optionDescriptionSelected: {
    color: colors.accent.primary,
  },
  optionDescriptionDefault: {
    color: colors.text.secondary,
  },
  spacer: {
    flex: 1,
  },
  errorCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  errorBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
  skipLink: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
