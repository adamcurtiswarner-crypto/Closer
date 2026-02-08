import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components';

const TIME_OPTIONS = [
  { label: 'Morning (8 AM)', value: '08:00' },
  { label: 'Afternoon (2 PM)', value: '14:00' },
  { label: 'Evening (7 PM)', value: '19:00' },
  { label: 'Night (9 PM)', value: '21:00' },
];

export default function PreferencesScreen() {
  const { user, refreshUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        partner_name: partnerName || null,
        notification_time: selectedTime,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/tone-calibration');
    } catch (error) {
      logger.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 pt-12">
        <Text className="text-2xl font-bold text-warm-900">
          A few quick things
        </Text>

        <View className="mt-8">
          <Input
            label="What should we call your partner?"
            placeholder="Their name or nickname"
            value={partnerName}
            onChangeText={setPartnerName}
          />
        </View>

        <View className="mt-8">
          <Text className="text-warm-700 text-sm font-medium mb-3">
            When should your daily prompt arrive?
          </Text>

          {TIME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              className={`
                flex-row items-center p-4 rounded-xl mb-2
                ${selectedTime === option.value ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-warm-200'}
              `}
              onPress={() => setSelectedTime(option.value)}
            >
              <View
                className={`
                  w-5 h-5 rounded-full border-2 mr-3 items-center justify-center
                  ${selectedTime === option.value ? 'border-primary-500' : 'border-warm-300'}
                `}
              >
                {selectedTime === option.value && (
                  <View className="w-3 h-3 rounded-full bg-primary-500" />
                )}
              </View>
              <Text
                className={`
                  text-base
                  ${selectedTime === option.value ? 'text-primary-700' : 'text-warm-700'}
                `}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-1" />

        <View className="mb-8">
          <Button title={isSaving ? "Saving..." : "Continue"} onPress={handleContinue} disabled={isSaving} />
        </View>
      </View>
    </SafeAreaView>
  );
}
