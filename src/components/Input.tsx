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
          placeholderTextColor="#B8B8C4"
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
    fontFamily: 'Nunito-SemiBold',
    color: '#6B6B7A',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Nunito-Regular',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F2EE',
    color: '#1E1E2E',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2DED8',
  },
  inputFocused: {
    borderColor: '#D4522A',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fefbfb',
  },
  hint: {
    color: '#6B6B7A',
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
  },
});
