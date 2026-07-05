import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { ToneShapes } from './ToneShapes';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

// v1 scope: benefits describe only visible features (see src/config/features.ts)
const PREMIUM_FEATURES = [
  { icon: 'flame' as const, text: 'A new question for the two of you, every day' },
  { icon: 'lightbulb' as const, text: 'Follow-ups that go deeper when it matters' },
  { icon: 'target' as const, text: 'Twelve areas of your relationship, covered' },
  { icon: 'heart' as const, text: 'Private between you two, always' },
];

export function Paywall({ visible, onClose }: PaywallProps) {
  const { offering, purchase, restore, isLoading } = useSubscription();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const annualPackage = offering?.annual ?? null;
  const monthlyPackage = offering?.monthly ?? null;
  const activePackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Hero title block — full-bleed coral with tone-on-tone shapes */}
          <View style={styles.headerArea}>
            <ToneShapes variant="coral" />
            <Animated.Text
              entering={FadeIn.duration(400)}
              style={styles.title}
            >
              {t('paywall.title')}
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.duration(400)}
              style={styles.subtitle}
            >
              {t('paywall.subtitle')}
            </Animated.Text>
          </View>

          <View style={styles.featureList}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.text}
                entering={FadeInUp.duration(400).delay(200 + index * 80)}
                style={styles.featureRow}
              >
                <Icon name={feature.icon} size="sm" color={colors.accent.primary} weight="bold" />
                <Text style={styles.featureText}>{feature.text}</Text>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInUp.duration(400).delay(520)}>
            <View style={styles.planRow}>
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                onPress={() => setSelectedPlan('annual')}
              >
                <Text style={styles.planBadge}>Best Value</Text>
                <Text style={styles.planPrice}>$49.99/year</Text>
                <Text style={styles.planSubprice}>$4.17/month</Text>
                <Text style={styles.planTrial}>7-day free trial</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={styles.planPrice}>$9.99/month</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sharedNote}>{t('paywall.sharedNote')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(600)}>
            <TouchableOpacity
              style={[styles.ctaButton, (!activePackage || isLoading) && styles.disabled]}
              onPress={() => activePackage && purchase(activePackage)}
              disabled={!activePackage || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.ctaText}>{t('paywall.startPremium', { price: selectedPlan === 'annual' ? '$49.99/year' : '$9.99/month' })}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.restoreButton} onPress={restore}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t('paywall.notNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  // Hero title block — full-bleed coral card
  headerArea: {
    backgroundColor: colors.accent.primary,
    paddingTop: 28,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  title: {
    ...typography.display,
    fontSize: 24,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  featureList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.cardPad,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  featureText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  planCardSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primaryLight,
  },
  planBadge: {
    ...typography.eyebrow,
    color: colors.accent.primary,
    marginBottom: spacing.sm,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Nunito-ExtraBold',
    color: colors.text.primary,
  },
  planSubprice: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  planTrial: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: colors.accent.primary,
    marginTop: spacing.xs,
  },
  sharedNote: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // CTA — full-width pill
  ctaButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...shadow.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  ctaText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  restoreButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: colors.text.secondary,
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    ...typography.eyebrow,
    color: colors.text.muted,
  },
});
