import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components';
import { useAcceptInvite } from '@/hooks/useCouple';
import { clearPendingInviteCode } from '@/hooks/useDeepLink';

export default function AcceptInviteScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const acceptInvite = useAcceptInvite();
  const hasAutoSubmitted = useRef(false);

  // Handle code from deep link params
  useEffect(() => {
    if (codeParam && codeParam.length === 6) {
      setCode(codeParam.toUpperCase());
    }
  }, [codeParam]);

  // Auto-submit if code came from deep link
  useEffect(() => {
    if (
      codeParam &&
      code.length === 6 &&
      !hasAutoSubmitted.current &&
      !acceptInvite.isPending
    ) {
      hasAutoSubmitted.current = true;
      handleAccept();
    }
  }, [code, codeParam, acceptInvite.isPending]);

  const handleAccept = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-character code.');
      return;
    }

    try {
      await acceptInvite.mutateAsync(code.toUpperCase());
      await clearPendingInviteCode();
      router.replace('/(onboarding)/preferences');
    } catch (error: any) {
      hasAutoSubmitted.current = false; // Allow retry
      Alert.alert(
        'Invalid Code',
        "This code isn't valid or has expired. Ask your partner for a new one."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-warm-900 text-center">
            Join your partner
          </Text>
          <Text className="text-warm-600 text-center mt-2">
            Enter the code they sent you.
          </Text>
        </View>

        <TextInput
          className="bg-white rounded-2xl p-6 text-center text-3xl font-mono font-bold text-primary-500 tracking-widest border border-warm-200"
          placeholder="ABC123"
          placeholderTextColor="#d6d3d1"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().slice(0, 6))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />

        <View className="mt-8">
          <Button
            title="Join"
            onPress={handleAccept}
            loading={acceptInvite.isPending}
            disabled={code.length !== 6}
          />
        </View>

        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
