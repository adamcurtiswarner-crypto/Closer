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

const PREMIUM_FEATURES = [
  { icon: 'lightbulb' as const, text: 'AI-powered relationship coaching' },
  { icon: 'target' as const, text: 'Personalized weekly insights' },
  { icon: 'flame' as const, text: 'Adaptive prompts that grow with you' },
  { icon: 'heart' as const, text: 'Private relationship check-ins' },
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
                <Icon name={feature.icon} size="sm" color="#c97454" weight="bold" />
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
    backgroundColor: '#c97454',
  },
  headerArea: {
    backgroundColor: '#fef5f0',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
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
    fontFamily: 'Inter-Medium',
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
    borderColor: '#e7e5e4',
  },
  planCardSelected: {
    borderColor: '#c97454',
    backgroundColor: '#fef5f0',
  },
  planBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c97454',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  planSubprice: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  planTrial: {
    fontSize: 11,
    color: '#c97454',
    fontWeight: '600',
    marginTop: 4,
  },
  sharedNote: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaButton: {
    backgroundColor: '#c97454',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#c97454',
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
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  restoreButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: '#78716c',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 15,
    color: '#a8a29e',
  },
});
