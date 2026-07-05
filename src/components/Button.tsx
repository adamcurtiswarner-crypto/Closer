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
import { colors, radius, spacing, typography } from '@config/theme';

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
    isDisabled && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
  ];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        ref={ref as any}
        style={[buttonStyles, style]}
        disabled={isDisabled}
        activeOpacity={1}
        accessibilityRole="button"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? colors.text.inverse : colors.accent.primary}
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
    borderRadius: radius.pill,
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
  // Variants
  primaryButton: {
    backgroundColor: colors.accent.primary,
  },
  secondaryButton: {
    backgroundColor: colors.accent.primaryLight,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  // Sizes — 44pt minimum touch target
  smSize: {
    height: 44,
    paddingHorizontal: spacing.cardPad,
  },
  mdSize: {
    height: 52,
    paddingHorizontal: spacing.lg,
  },
  lgSize: {
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  // Text
  text: {
    ...typography.btn,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.text.inverse,
  },
  secondaryText: {
    color: colors.accent.primary,
  },
  ghostText: {
    color: colors.text.secondary,
  },
});
