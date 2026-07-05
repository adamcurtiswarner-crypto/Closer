import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from './Icon';

import { colors, spacing, typography } from '@/config/theme';
interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = 'Something went wrong.',
  onRetry,
}: QueryErrorProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.icon}>
        <Icon name="cloud" size="lg" color={colors.text.muted} />
      </View>
      <Text style={styles.title}>Couldn't load</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  icon: {
    marginBottom: spacing.smd,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.cardPad,
  },
  button: {
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  buttonText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
});
