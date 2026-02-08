import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e7e5e4',
          opacity,
        },
        style,
      ]}
    />
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
