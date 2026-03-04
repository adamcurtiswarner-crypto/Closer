import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Icon } from './Icon';

interface AnimatedCheckboxProps {
  checked: boolean;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function AnimatedCheckbox({
  checked,
  size = 24,
  color = '#ef5323',
  style,
}: AnimatedCheckboxProps) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      scale.value = 0.8;
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      progress.value = withTiming(1, { duration: 200 });
    } else {
      progress.value = withTiming(0, { duration: 150 });
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  }, [checked]);

  const containerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', color],
    );
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#d6d3d1', color],
    );
    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: scale.value }],
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        containerStyle,
        style,
      ]}
    >
      <Animated.View style={checkmarkStyle}>
        <Icon name="check" size={Math.round(size * 0.55)} color="#ffffff" weight="bold" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
