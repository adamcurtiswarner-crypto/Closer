import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components';
import type { IconName } from '@/components/Icon';
import { colors, radius, spacing, typography } from '@/config/theme';

export default function ValuePropScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.iconRow}>
          <Icon name="flame" size="xl" color={colors.accent.primary} weight="fill" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text style={styles.title}>{t('onboarding.valueProp.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.valueProp.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.features}>
          <FeatureRow icon="check" text={t('onboarding.valueProp.featureDaily')} />
          <FeatureRow icon="lock" text={t('onboarding.valueProp.featurePrivate')} />
          <FeatureRow icon="heart" text={t('onboarding.valueProp.featureCouples')} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(600)}>
        <TouchableOpacity
          style={styles.cta}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.push('/(onboarding)/invite-partner')}
        >
          <Text style={styles.ctaText} maxFontSizeMultiplier={1.4}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Icon name={icon} size="sm" color={colors.accent.primary} weight="bold" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.smd,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
  },
  featureText: {
    ...typography.body,
    color: colors.text.secondary,
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
