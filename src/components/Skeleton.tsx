import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '@/config/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  ReduceMotion,
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
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
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
          backgroundColor: colors.skeleton.base,
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
      <Skeleton width={80} height={14} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
      <Skeleton height={24} style={{ marginBottom: spacing.smd }} />
      <Skeleton height={24} width="80%" style={{ alignSelf: 'center', marginBottom: spacing.smd }} />
      <Skeleton height={24} width="60%" style={{ alignSelf: 'center', marginBottom: spacing.lg }} />
      <Skeleton height={16} width={120} style={{ alignSelf: 'center', marginBottom: spacing.lg }} />
      <Skeleton height={48} borderRadius={12} />
    </View>
  );
}

export function MemoryCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton height={20} width="70%" style={{ alignSelf: 'center', marginBottom: spacing.md }} />
      <View style={skeletonStyles.responseBlock}>
        <Skeleton width={40} height={12} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={16} style={{ marginBottom: spacing.xs }} />
        <Skeleton height={16} width="60%" />
      </View>
      <View style={skeletonStyles.responseBlock}>
        <Skeleton width={60} height={12} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={16} style={{ marginBottom: spacing.xs }} />
        <Skeleton height={16} width="75%" />
      </View>
      <Skeleton height={12} width={100} style={{ alignSelf: 'center', marginTop: spacing.sm }} />
    </View>
  );
}

export function GoalTrackerSkeleton() {
  return (
    <View style={goalSkeletonStyles.card}>
      <View style={goalSkeletonStyles.header}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={120} height={14} style={{ marginLeft: spacing.sm }} />
      </View>
      <Skeleton height={12} width="90%" style={{ marginBottom: spacing.smd }} />
      <Skeleton height={12} width="75%" style={{ marginBottom: spacing.smd }} />
      <Skeleton height={12} width="60%" />
    </View>
  );
}

const goalSkeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});

export function WishlistCardSkeleton() {
  return (
    <View style={wishlistSkeletonStyles.card}>
      <View style={wishlistSkeletonStyles.header}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={80} height={14} style={{ marginLeft: spacing.sm }} />
      </View>
      <Skeleton height={12} width="85%" style={{ marginBottom: spacing.smd }} />
      <Skeleton height={12} width="65%" />
    </View>
  );
}

const wishlistSkeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.skeleton.base,
    marginBottom: spacing.md,
  },
  responseBlock: {
    backgroundColor: colors.surface.background,
    borderRadius: 12,
    padding: spacing.smd,
    marginBottom: spacing.sm,
  },
});
