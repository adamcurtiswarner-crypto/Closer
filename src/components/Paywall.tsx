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
          <View style={styles.accentBar} />

          <View style={styles.headerArea}>
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
                <Icon name={feature.icon} size="sm" color="#D4522A" weight="bold" />
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
                <ActivityIndicator color="#ffffff" />
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  accentBar: {
    height: 3,
    backgroundColor: '#D4522A',
  },
  headerArea: {
    backgroundColor: '#FDF1ED',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 8,
  },
  featureList: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  featureText: {
    fontSize: 15,
    color: '#292524',
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
    flex: 1,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2DED8',
  },
  planCardSelected: {
    borderColor: '#D4522A',
    backgroundColor: '#FDF1ED',
  },
  planBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4522A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E2E',
  },
  planSubprice: {
    fontSize: 12,
    color: '#6B6B7A',
    marginTop: 2,
  },
  planTrial: {
    fontSize: 11,
    color: '#D4522A',
    fontWeight: '600',
    marginTop: 4,
  },
  sharedNote: {
    fontSize: 13,
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaButton: {
    backgroundColor: '#D4522A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#D4522A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
  },
  restoreButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: '#6B6B7A',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 15,
    color: '#B8B8C4',
  },
});
