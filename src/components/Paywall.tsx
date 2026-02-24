import React from 'react';
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

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  { title: 'Unlimited saved memories', subtitle: 'Keep every meaningful moment' },
  { title: 'Streak badges & insights', subtitle: 'Track your connection over time' },
  { title: 'Tone calibration insights', subtitle: 'Prompts tailored to your relationship' },
  { title: 'Priority support', subtitle: 'Help when you need it' },
];

export function Paywall({ visible, onClose }: PaywallProps) {
  const { offering, purchase, restore, isLoading } = useSubscription();
  const { t } = useTranslation();

  const mainPackage = offering?.availablePackages?.[0] ?? null;
  const priceString = mainPackage?.product?.priceString || '$4.99/mo';

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
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInUp.duration(400).delay(200 + index * 80)}
                style={styles.featureRow}
              >
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>{'\u2713'}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInUp.duration(400).delay(600)}>
            <TouchableOpacity
              style={[styles.ctaButton, (!mainPackage || isLoading) && styles.disabled]}
              onPress={() => mainPackage && purchase(mainPackage)}
              disabled={!mainPackage || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.ctaText}>{t('paywall.startPremium', { price: priceString })}</Text>
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
    backgroundColor: '#fef7f4',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  featureList: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: '#292524',
    fontWeight: '500',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#a8a29e',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#c97454',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
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
