import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { PartnerGuess } from '@components';
import { useSpark } from '@hooks/useEngines';
import { colors } from '@config/theme';

export default function PartnerGuessScreen() {
  const { submitGuess, todaysSpark, isGuessing } = useSpark();

  const handleGuess = async (guess: string) => {
    if (!todaysSpark) return;
    try {
      await submitGuess({ sparkId: todaysSpark.id, guess });
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not submit your guess. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <PartnerGuess
        word={todaysSpark?.word}
        onGuess={handleGuess}
        isGuessing={isGuessing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
});
