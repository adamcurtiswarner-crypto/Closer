import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = 'Something went wrong.',
  onRetry,
}: QueryErrorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  buttonText: {
    fontSize: 14,
    color: '#57534e',
    fontWeight: '500',
  },
});
