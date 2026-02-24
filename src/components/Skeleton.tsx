import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 150 }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e7e5e4',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: 80,
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

export function PromptCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width={80} height={14} style={{ alignSelf: 'center', marginBottom: 16 }} />
      <Skeleton height={24} style={{ marginBottom: 12 }} />
      <Skeleton height={24} width="80%" style={{ alignSelf: 'center', marginBottom: 12 }} />
      <Skeleton height={24} width="60%" style={{ alignSelf: 'center', marginBottom: 24 }} />
      <Skeleton height={16} width={120} style={{ alignSelf: 'center', marginBottom: 24 }} />
      <Skeleton height={48} borderRadius={12} />
    </View>
  );
}

export function MemoryCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton height={20} width="70%" style={{ alignSelf: 'center', marginBottom: 16 }} />
      <View style={skeletonStyles.responseBlock}>
        <Skeleton width={40} height={12} style={{ marginBottom: 8 }} />
        <Skeleton height={16} style={{ marginBottom: 4 }} />
        <Skeleton height={16} width="60%" />
      </View>
      <View style={skeletonStyles.responseBlock}>
        <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
        <Skeleton height={16} style={{ marginBottom: 4 }} />
        <Skeleton height={16} width="75%" />
      </View>
      <Skeleton height={12} width={100} style={{ alignSelf: 'center', marginTop: 8 }} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f5f5f4',
    marginBottom: 16,
  },
  responseBlock: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});
