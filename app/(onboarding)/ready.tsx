import React from 'react';
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
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';

const TIME_LABELS: Record<string, string> = {
  '08:00': '8:00 AM',
  '14:00': '2:00 PM',
  '19:00': '7:00 PM',
  '21:00': '9:00 PM',
};

export default function ReadyScreen() {
  const { user, refreshUser } = useAuth();
  const promptTime = TIME_LABELS[user?.notificationTime || '19:00'] || '7:00 PM';
  const { t } = useTranslation();

  const handleStart = async () => {
    if (!user?.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        is_onboarded: true,
        onboarding_completed_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('onboarding_completed');
      router.replace('/(app)/today');
    } catch {
      Alert.alert('Could not complete setup', 'Please check your connection and try again.');
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
            {t('onboarding.ready.subtitle', { time: promptTime })}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TouchableOpacity
            style={styles.cta}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleStart}
          >
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.4}>{t('onboarding.ready.startNow')}</Text>
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
    marginBottom: spacing.xxl,
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
  spacerSmall: {
    height: 12,
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
