import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logEvent } from '@/services/analytics';

export default function ReadyScreen() {
  const { user, refreshUser } = useAuth();

  const handleStartNow = async () => {
    await completeOnboarding();
    router.replace('/(app)/today');
  };

  const handleWait = async () => {
    await completeOnboarding();
    router.replace('/(app)/today');
  };

  const completeOnboarding = async () => {
    if (!user?.id) return;

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      is_onboarded: true,
      onboarding_completed_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    await refreshUser();
    logEvent('onboarding_completed');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-12">
          <Text className="text-4xl mb-4">✓</Text>
          <Text className="text-2xl font-bold text-warm-900 text-center">
            You're all set
          </Text>
          <Text className="text-warm-600 text-center mt-2">
            Your first prompt arrives at 7:00 PM.
          </Text>
        </View>

        <Button title="Start Now" onPress={handleStartNow} />

        <View className="h-3" />

        <Button
          title="I'll wait for the prompt"
          variant="secondary"
          onPress={handleWait}
        />
      </View>
    </SafeAreaView>
  );
}
