import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components';

export default function FirstPromptScreen() {
  const [showResponse, setShowResponse] = useState(false);

  const handleContinue = () => {
    router.push('/(onboarding)/ready');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 pt-12">
        <Text className="text-2xl font-bold text-warm-900">
          Here's how it works
        </Text>

        <View className="mt-8">
          {/* Sample prompt card */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100">
            <Text className="text-warm-900 text-xl font-medium text-center leading-relaxed">
              What's one thing your partner did this week that made your day better?
            </Text>
          </View>

          <Text className="text-warm-600 text-center mt-4 mb-6">
            Each day, you both answer privately. Then you see each other's response.
          </Text>

          {!showResponse ? (
            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-3 px-6"
              onPress={() => setShowResponse(true)}
            >
              <Text className="text-white text-center font-semibold">
                Show Me
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-primary-50 rounded-xl p-4">
              <Text className="text-primary-600 text-xs font-medium mb-2">
                Their response
              </Text>
              <Text className="text-warm-800 text-base italic">
                "When you made coffee before I asked. I noticed, even if I didn't say anything."
              </Text>
            </View>
          )}
        </View>

        {showResponse && (
          <View className="mt-8">
            <Text className="text-warm-600 text-center">
              That's it. Small moments, shared.
            </Text>
          </View>
        )}

        <View className="flex-1" />

        <View className="mb-8">
          <Button
            title={showResponse ? "I get it" : "Show me an example"}
            onPress={showResponse ? handleContinue : () => setShowResponse(true)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
