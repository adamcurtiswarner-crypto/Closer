import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface PulsingDotsProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

function Dot({ delay, color, size }: { delay: number; color: string; size: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.8 + opacity.value * 0.2 }],
  }));

  return (
    <Animated.View
      style={[
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
}

export function PulsingDots({ color = '#ef5323', size = 5, style }: PulsingDotsProps) {
  return (
    <Animated.View style={[styles.container, style]}>
      <Dot delay={0} color={color} size={size} />
      <Dot delay={200} color={color} size={size} />
      <Dot delay={400} color={color} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
