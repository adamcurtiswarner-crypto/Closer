import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isConnected ? -60 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, translateY]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>
        {t('offline.banner')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#78716c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
