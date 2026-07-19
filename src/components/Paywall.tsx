import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { ToneShapes } from './ToneShapes';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

/** Where the sheet was opened from — carried on paywall analytics events. */
export type PaywallSource =
  | 'pairing_complete'
  | 'follow_up'
  | 'hearth_history'
  | 'explore_send'
  | 'settings'
  | 'us_view'
  | 'unspecified';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  source?: PaywallSource;
}

type PlanId = 'annual' | 'monthly';

// How long we wait for the RevenueCat offering before treating it as failed.
const OFFERING_TIMEOUT_MS = 8000;
// Disabled convention: whole control at 40% opacity.
const DISABLED_OPACITY = 0.4;
// Equal min heights keep the plan row balanced regardless of line count.
const PLAN_CARD_MIN_HEIGHT = 104;
// Matches the rendered CTA pill: text line + vertical padding.
const CTA_PILL_HEIGHT = 52;
// Minimum tappable area for quiet text buttons.
const MIN_TOUCH_TARGET = 44;

// v1 scope: benefits describe only visible features (see src/config/features.ts)
const PREMIUM_FEATURES = [
  { icon: 'flame' as const, key: 'paywall.features.daily' },
  { icon: 'lightbulb' as const, key: 'paywall.features.followUps' },
  { icon: 'users' as const, key: 'paywall.features.usView' },
  { icon: 'target' as const, key: 'paywall.features.categories' },
  { icon: 'heart' as const, key: 'paywall.features.privacy' },
];

export function Paywall({ visible, onClose, source = 'unspecified' }: PaywallProps) {
  const { offering, offeringError, refreshOffering, purchase, restore, isLoading } =
    useSubscription();
  const { t } = useTranslation();
  const router = useRouter();

  // 3.1.2: terms/privacy must be reachable from the paywall. The bundled
  // in-app screens work before hosting deploys; close the sheet first so
  // the pushed screen isn't hidden under the modal.
  const openLegal = (route: '/(app)/terms-of-service' | '/(app)/privacy-policy') => {
    onClose();
    router.push(route);
  };
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (visible) {
      logEvent('paywall_shown', { source });
    }
  }, [visible, source]);

  const handleDismiss = () => {
    logEvent('paywall_dismissed', { source });
    onClose();
  };

  const annualPackage = offering?.annual ?? null;
  const monthlyPackage = offering?.monthly ?? null;
  const activePackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

  // Three states: loading (no offering yet), loaded, failed (error or timeout).
  const plansFailed = offeringError || (!offering && timedOut);
  const plansLoading = !offering && !plansFailed;

  useEffect(() => {
    if (!visible || offering || offeringError || timedOut) return;
    const timer = setTimeout(() => setTimedOut(true), OFFERING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [visible, offering, offeringError, timedOut]);

  // Prefer real store prices from the RevenueCat package; fall back to the
  // localized constants so loaded copy never shows an empty price.
  const annualPrice = annualPackage?.product?.priceString
    ? `${annualPackage.product.priceString}/year`
    : t('paywall.plans.annual');
  const monthlyPrice = monthlyPackage?.product?.priceString
    ? `${monthlyPackage.product.priceString}/month`
    : t('paywall.plans.monthly');
  const activePrice = selectedPlan === 'annual' ? annualPrice : monthlyPrice;

  const handleRetry = () => {
    setTimedOut(false);
    void refreshOffering();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
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
                key={feature.key}
                entering={FadeInUp.duration(400).delay(200 + index * 80)}
                style={styles.featureRow}
              >
                <Icon name={feature.icon} size="sm" color={colors.accent.primary} weight="bold" />
                <Text style={styles.featureText}>{t(feature.key)}</Text>
              </Animated.View>
            ))}
          </View>

          {plansFailed ? (
            <View style={styles.plansErrorBox} testID="paywall-error">
              <Text style={styles.plansErrorText}>{t('paywall.plansError')}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>{t('paywall.tryAgain')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View entering={FadeInUp.duration(400).delay(520)}>
              {/* Differentiator, promoted above the plan cards */}
              <Text style={styles.sharedNote}>{t('paywall.sharedNote')}</Text>
              {plansLoading ? (
                <View style={styles.planRow} testID="paywall-plans-loading">
                  <View style={styles.planCard}>
                    <Skeleton width={64} height={10} style={styles.skeletonGap} />
                    <Skeleton width={96} height={18} style={styles.skeletonGap} />
                    <Skeleton width={72} height={12} />
                  </View>
                  <View style={styles.planCard}>
                    <Skeleton width={96} height={18} style={styles.skeletonGap} />
                    <Skeleton width={72} height={12} />
                  </View>
                </View>
              ) : (
                <View style={styles.planRow}>
                  <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                    onPress={() => setSelectedPlan('annual')}
                  >
                    <Text style={styles.planBadge}>{t('paywall.plans.bestValue')}</Text>
                    <Text style={styles.planPrice}>{annualPrice}</Text>
                    <Text style={styles.planSubprice}>{t('paywall.plans.annualMonthly')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
                    onPress={() => setSelectedPlan('monthly')}
                  >
                    <Text style={styles.planPrice}>{monthlyPrice}</Text>
                    <Text style={styles.planSubprice}>{t('paywall.plans.billedMonthly')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}

          {!plansFailed && (
            <Animated.View entering={FadeInUp.duration(400).delay(600)}>
              {plansLoading ? (
                <View style={styles.ctaSkeletonWrap} testID="paywall-cta-loading">
                  <Skeleton height={CTA_PILL_HEIGHT} borderRadius={radius.pill} />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      (!activePackage || isLoading) && styles.disabled,
                    ]}
                    onPress={() => activePackage && purchase(activePackage)}
                    disabled={!activePackage || isLoading}
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.text.inverse} />
                    ) : (
                      <Text style={styles.ctaText} maxFontSizeMultiplier={1.4}>{t('paywall.ctaTrial')}</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.ctaSubline}>
                    {t('paywall.ctaSubline', { price: activePrice })}
                  </Text>
                </>
              )}
            </Animated.View>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={restore}
            accessibilityRole="button"
          >
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>

          {/* 3.1.2: auto-renewal disclosure + tappable legal links */}
          <Text style={styles.renewalNote}>{t('paywall.renewalNote')}</Text>
          <View style={styles.legalRow}>
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => openLegal('/(app)/terms-of-service')}
              accessibilityRole="link"
              testID="paywall-terms"
            >
              <Text style={styles.legalText}>{t('paywall.termsLink')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => openLegal('/(app)/privacy-policy')}
              accessibilityRole="link"
              testID="paywall-privacy"
            >
              <Text style={styles.legalText}>{t('paywall.privacyLink')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            accessibilityRole="button"
          >
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
    paddingBottom: spacing.xl,
  },
  // Hero title block — full-bleed coral card
  headerArea: {
    backgroundColor: colors.accent.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  title: {
    ...typography.headingLg,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onDark.body,
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
    paddingVertical: spacing.smd,
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  sharedNote: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.smd,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  planCard: {
    flex: 1,
    minHeight: PLAN_CARD_MIN_HEIGHT,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.h3,
    color: colors.text.primary,
  },
  planSubprice: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  skeletonGap: {
    marginBottom: spacing.sm,
  },
  plansErrorBox: {
    marginVertical: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  plansErrorText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  retryText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  // CTA — full-width pill
  ctaButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...shadow.accent,
  },
  ctaSkeletonWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  ctaText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  ctaSubline: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  restoreButton: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  renewalNote: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legalButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  legalText: {
    ...typography.caption,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
  legalDot: {
    ...typography.caption,
    color: colors.text.muted,
  },
  closeButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
});
