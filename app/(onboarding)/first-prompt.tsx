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
import { Button } from '@/components';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalize } from '@/hooks/usePersonalize';
import { useTriggerPrompt } from '@/hooks/usePrompt';
import { useTranslation } from 'react-i18next';

import { colors, radius, shadow, spacing, typography } from '@/config/theme';
export default function FirstPromptScreen() {
  const { user } = useAuth();
  const triggerPrompt = useTriggerPrompt();
  const [showResponse, setShowResponse] = useState(false);
  const { t } = useTranslation();
  // The sample prompt carries a {partner} token — render it with the partner's
  // real first name now that the couple is linked (falls back to "your partner").
  const personalize = usePersonalize();

  const handleContinue = async () => {
    // Trigger the first real prompt for this couple
    if (user?.coupleId) {
      try {
        await triggerPrompt.mutateAsync();
      } catch (error) {
        // Non-blocking — the prompt can also be triggered from Today screen
        logger.warn('Could not deliver first prompt:', error);
      }
    }
    router.push('/(onboarding)/ready');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>{t('onboarding.firstPrompt.title')}</Animated.Text>

        <View style={styles.cardArea}>
          {/* Sample prompt card */}
          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.card}>
            <Text style={styles.promptText}>
              {personalize(t('onboarding.firstPrompt.samplePrompt'))}
            </Text>
          </Animated.View>

          <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.explanation}>
            {t('onboarding.firstPrompt.explanation')}
          </Animated.Text>

          {!showResponse ? (
            <TouchableOpacity
              style={styles.showButton}
              onPress={() => setShowResponse(true)}
            >
              <Text style={styles.showButtonText}>{t('onboarding.firstPrompt.showMe')}</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.responseCard}>
              <Text style={styles.responseLabel}>{t('onboarding.firstPrompt.theirResponse')}</Text>
              <Text style={styles.responseText}>
                {t('onboarding.firstPrompt.sampleResponse')}
              </Text>
            </Animated.View>
          )}
        </View>

        {showResponse && (
          <View style={styles.tagline}>
            <Text style={styles.taglineText}>{t('onboarding.firstPrompt.tagline')}</Text>
          </View>
        )}

        <View style={styles.spacer} />

        {showResponse && (
          <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.buttonContainer}>
            <Button
              title={t('onboarding.firstPrompt.iGetIt')}
              onPress={handleContinue}
            />
          </Animated.View>
        )}
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
  cardArea: {
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.cardSubtle,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  promptText: {
    color: colors.text.primary,
    ...typography.heading,
    textAlign: 'center',
  },
  explanation: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  showButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
  },
  showButtonText: {
    color: colors.text.inverse,
    textAlign: 'center',
    ...typography.body,
  },
  responseCard: {
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  responseLabel: {
    color: colors.accent.primary,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  responseText: {
    ...typography.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  tagline: {
    marginTop: spacing.xl,
  },
  taglineText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
});
