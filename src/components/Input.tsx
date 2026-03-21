import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { hapticImpact } from '@utils/haptics';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, onFocus: userOnFocus, onBlur: userOnBlur, ...props }, ref) => {
    const hasError = !!error;
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      hapticImpact();
      userOnFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
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
          placeholderTextColor="#a8a29e"
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
    fontFamily: 'Inter-Medium',
    color: '#57534e',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Inter-Regular',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef7f4',
    color: '#1c1917',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  inputFocused: {
    borderColor: '#c97454',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fefbfb',
  },
  hint: {
    color: '#78716c',
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
  },
});
