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
import { Button } from '@/components';

const TONE_OPTIONS = [
  {
    value: 'solid',
    label: "We're solid",
    description: 'Just want to stay that way',
  },
  {
    value: 'distant',
    label: "We're okay",
    description: 'But feel a bit distant lately',
  },
  {
    value: 'struggling',
    label: "We're struggling to connect",
    description: 'Want to be more intentional',
  },
];

export default function ToneCalibrationScreen() {
  const { user, refreshUser } = useAuth();
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!user?.id || !selectedTone) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tone_calibration: selectedTone,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/first-prompt');
    } catch (error) {
      logger.error('Error saving tone calibration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 pt-12">
        <Text className="text-2xl font-bold text-warm-900">
          How are you two doing?
        </Text>
        <Text className="text-warm-600 mt-2">
          This helps us start in the right place.
        </Text>

        <View className="mt-8">
          {TONE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              className={`
                p-4 rounded-xl mb-3
                ${selectedTone === option.value ? 'bg-primary-50 border-2 border-primary-300' : 'bg-white border border-warm-200'}
              `}
              onPress={() => setSelectedTone(option.value)}
            >
              <Text
                className={`
                  text-base font-medium
                  ${selectedTone === option.value ? 'text-primary-700' : 'text-warm-800'}
                `}
              >
                {option.label}
              </Text>
              <Text
                className={`
                  text-sm mt-1
                  ${selectedTone === option.value ? 'text-primary-600' : 'text-warm-500'}
                `}
              >
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-1" />

        <View className="mb-8">
          <Button
            title={isSaving ? "Saving..." : "Continue"}
            onPress={handleContinue}
            disabled={!selectedTone || isSaving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
