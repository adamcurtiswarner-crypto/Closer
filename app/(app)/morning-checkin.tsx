import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { MorningCheckin } from '@components';
import { useCheckIn } from '@hooks/useEngines';
import { colors } from '@config/theme';

const CHOICE_KEY_MAP: Record<string, string> = {
  'I need encouragement': 'encouragement',
  'I need space': 'space',
  'I need laughter': 'laughter',
  'I need stability': 'stability',
};

export default function MorningCheckinScreen() {
  const { submit, isSubmitting } = useCheckIn();

  const handleDone = async (choice: string) => {
    const key = CHOICE_KEY_MAP[choice] ?? choice;
    try {
      await submit({ choice: key });
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not save your check-in. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <MorningCheckin onDone={handleDone} isSubmitting={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
});
