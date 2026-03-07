import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  {
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = true,
    disabled,
    style,
    onPressIn: userOnPressIn,
    onPressOut: userOnPressOut,
    ...props
  },
  ref
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(0.97, { duration: 100 });
    userOnPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    userOnPressOut?.(e);
  };

  const isDisabled = disabled || loading;

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[`${variant}Button`],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    isDisabled && variant === 'primary' && styles.primaryDisabled,
    isDisabled && variant !== 'primary' && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
  ];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        ref={ref as any}
        style={[buttonStyles, style]}
        disabled={isDisabled}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#ffffff' : '#ef5323'}
            size="small"
          />
        ) : (
          <Text style={textStyles}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  primaryDisabled: {
    backgroundColor: '#f9a07a',
  },
  // Variants
  primaryButton: {
    backgroundColor: '#ef5323',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f4',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  // Sizes
  smSize: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mdSize: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  lgSize: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  // Text
  text: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#292524',
  },
  ghostText: {
    color: '#ef5323',
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
});
