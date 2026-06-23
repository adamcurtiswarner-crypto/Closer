import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { TodaySpark } from '@components';
import { useSpark } from '@hooks/useEngines';
import { colors } from '@config/theme';

export default function TodaysSparkScreen() {
  const { sendSpark, isSending } = useSpark();

  const handleSend = async (word: string) => {
    try {
      await sendSpark({ word });
      Alert.alert('Sent', 'Your word has been sent to your partner.');
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not send your spark. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TodaySpark onSend={handleSend} isSending={isSending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
});
