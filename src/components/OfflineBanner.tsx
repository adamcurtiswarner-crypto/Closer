import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slideDistance = -(60 + insets.top);
  const translateY = useSharedValue(slideDistance);
  const iconOpacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(isConnected ? slideDistance : 0, {
      duration: 300,
    });

    if (!isConnected) {
      iconOpacity.value = withRepeat(
        withTiming(0.4, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(iconOpacity);
      iconOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isConnected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top + 8 }, animatedStyle]}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Icon name="warning" size="sm" color="#f59e0b" weight="fill" />
      </Animated.View>
      <Text style={styles.text}>{t('offline.banner')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#57534e',
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
