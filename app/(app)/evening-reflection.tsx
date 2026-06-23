import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { EveningReflection } from '@components';
import { useReflection } from '@hooks/useEngines';
import { colors } from '@config/theme';

export default function EveningReflectionScreen() {
  const { submit, isSubmitting } = useReflection();

  const handleDone = async (score: number, helped: ReadonlySet<string>) => {
    try {
      await submit({ score, helped: Array.from(helped) });
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not save your reflection. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <EveningReflection onDone={handleDone} isSubmitting={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
});
