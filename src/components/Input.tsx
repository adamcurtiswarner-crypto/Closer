import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  StyleSheet,
  NativeSyntheticEvent,
  TargetedEvent,
} from 'react-native';
import { colors, radius, spacing, typography } from '@config/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, onFocus: userOnFocus, onBlur: userOnBlur, ...props }, ref) => {
    const hasError = !!error;
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(true);
      userOnFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(false);
      userOnBlur?.(e);
    };

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            isFocused && !hasError && styles.inputFocused,
            hasError && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.text.secondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {hint && !error && <Text style={styles.hint}>{hint}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.surface.background,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  inputFocused: {
    borderColor: colors.accent.primary,
  },
  inputError: {
    borderColor: colors.semantic.destructive,
    backgroundColor: colors.semantic.destructiveLight,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.semantic.destructive,
    marginTop: spacing.xs,
  },
});
