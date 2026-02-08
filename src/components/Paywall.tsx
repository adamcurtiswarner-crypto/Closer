import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSubscription } from '@/hooks/useSubscription';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  'Unlimited saved memories',
  'Streak badges & insights',
  'Tone calibration insights',
  'Priority support',
];

export function Paywall({ visible, onClose }: PaywallProps) {
  const { offering, purchase, restore, isLoading } = useSubscription();

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
          <Text style={styles.title}>Closer Premium</Text>
          <Text style={styles.subtitle}>
            Deepen your connection with premium features.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.checkmark}>+</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.ctaButton, (!mainPackage || isLoading) && styles.disabled]}
            onPress={() => mainPackage && purchase(mainPackage)}
            disabled={!mainPackage || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.ctaText}>Start Premium — {priceString}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.restoreButton} onPress={restore}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Not now</Text>
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
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  featureList: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  checkmark: {
    fontSize: 16,
    color: '#c97454',
    fontWeight: '600',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#292524',
  },
  ctaButton: {
    backgroundColor: '#c97454',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
