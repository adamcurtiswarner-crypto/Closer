import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  StyleSheet,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, ...props }, ref) => {
    const hasError = !!error;

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            hasError && styles.inputError,
            style,
          ]}
          placeholderTextColor="#a8a29e"
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
    color: '#57534e',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fafaf9',
    color: '#1c1917',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  inputError: {
    borderColor: '#f87171',
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
