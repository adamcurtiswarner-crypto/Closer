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
import { Icon, Paywall } from '@/components';
import { colors, radius, spacing, typography } from '@/config/theme';
import { FEATURES } from '@/config/features';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { completeOnboarding } from '@/utils/onboarding';
import { shouldShowPairingPaywall } from '@/utils/premiumGates';
import { hasSeenPairingPaywall, markPairingPaywallSeen } from '@/utils/paywallSeen';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

export default function ReadyScreen() {
  const { user, refreshUser } = useAuth();
  const { isPremium, isLoading: premiumLoading } = useSubscription();
  const [isSaving, setIsSaving] = useState(false);
  // The trial moment (SEV-0 #8): the paywall shows once, softly, after
  // pairing completes — never to an already-premium couple, and "Not now"
  // proceeds into the app without friction.
  const [showTrialPaywall, setShowTrialPaywall] = useState(false);
  const { t } = useTranslation();

  const handleStart = async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      await completeOnboarding(user.id);
      await refreshUser();

      const alreadySeen = await hasSeenPairingPaywall(user.id);
      if (
        shouldShowPairingPaywall({
          gatesEnabled: FEATURES.premiumGates,
          isPremium,
          isPremiumLoading: premiumLoading,
          alreadySeen,
        })
      ) {
        // Mark before showing so it can never show twice, then let the
        // sheet's close (Not now or after purchase) carry them into Today.
        void markPairingPaywallSeen(user.id);
        setShowTrialPaywall(true);
        return;
      }

      router.replace('/(app)/today');
    } catch (error) {
      logger.error('Could not complete onboarding:', error);
      Alert.alert('Could not complete setup', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrialPaywallClose = () => {
    setShowTrialPaywall(false);
    router.replace('/(app)/today');
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
            {t('onboarding.ready.subtitle')}
          </Text>
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

      <Paywall
        visible={showTrialPaywall}
        onClose={handleTrialPaywallClose}
        source="pairing_complete"
      />
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
