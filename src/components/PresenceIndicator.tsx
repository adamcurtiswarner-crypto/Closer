import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PresenceIndicatorProps {
  isOnline: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function PresenceIndicator({ isOnline, size = 'medium' }: PresenceIndicatorProps) {
  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <View
      style={[
        styles.indicator,
        sizeStyles[size],
        isOnline ? styles.online : styles.offline,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 100,
  },
  small: {
    width: 8,
    height: 8,
  },
  medium: {
    width: 10,
    height: 10,
  },
  large: {
    width: 12,
    height: 12,
  },
  online: {
    backgroundColor: '#22c55e', // green-500
  },
  offline: {
    backgroundColor: '#d6d3d1', // warm-300
  },
});
