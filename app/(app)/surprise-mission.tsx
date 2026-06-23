import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { SurpriseMission } from '@components';
import { functions } from '@config/firebase';
import { colors } from '@config/theme';

const submitMissionResponse = httpsCallable(functions, 'submitMissionResponse');

export default function SurpriseMissionScreen() {
  const handleAccept = async () => {
    try {
      await submitMissionResponse({ missionId: 'default', accepted: true });
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not accept the mission. Please try again.');
    }
  };

  const handleSkip = async () => {
    try {
      await submitMissionResponse({ missionId: 'default', accepted: false });
      router.back();
    } catch {
      Alert.alert('Something went wrong', 'Could not skip the mission. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <SurpriseMission
        onClose={() => router.back()}
        onAccept={handleAccept}
        onSkip={handleSkip}
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
