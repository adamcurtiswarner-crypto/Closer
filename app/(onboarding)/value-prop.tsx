import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Icon } from '@/components';
import type { IconName } from '@/components/Icon';
import { colors, radius, spacing, typography } from '@/config/theme';

export default function ValuePropScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.iconRow}>
          <Icon name="flame" size="xl" color={colors.accent.primary} weight="fill" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text style={styles.title}>Stay connected in{'\n'}just 5 minutes a day</Text>
          <Text style={styles.subtitle}>
            One thoughtful question, answered together.{'\n'}
            That's all it takes to keep the spark alive.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.features}>
          <FeatureRow icon="check" text="Daily prompts designed for couples" />
          <FeatureRow icon="lock" text="Private and encrypted" />
          <FeatureRow icon="heart" text="Built on relationship science" />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(600)}>
        <TouchableOpacity
          style={styles.cta}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.push('/(onboarding)/preferences')}
        >
          <Text style={styles.ctaText}>Continue</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
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
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  featureText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text.secondary,
  },
  // Full-width pill CTA
  cta: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  ctaText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
