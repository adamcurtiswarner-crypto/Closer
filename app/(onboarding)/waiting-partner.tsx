import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components';
import { useCouple } from '@/hooks/useCouple';
import { useTranslation } from 'react-i18next';

export default function WaitingPartnerScreen() {
  const { data: couple, refetch } = useCouple();
  const { t } = useTranslation();

  // If partner joined, redirect
  React.useEffect(() => {
    if (couple?.status === 'active') {
      router.replace('/(onboarding)/preferences');
    }
  }, [couple]);

  // Poll for updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-12">
          <Text className="text-4xl mb-4">⏳</Text>
          <Text className="text-2xl font-bold text-warm-900 text-center">
            {t('onboarding.waitingPartner.title')}
          </Text>
          <Text className="text-warm-600 text-center mt-2">
            {t('onboarding.waitingPartner.subtitle')}
          </Text>
        </View>

        <Button
          title={t('onboarding.waitingPartner.resendInvite')}
          variant="secondary"
          onPress={() => router.push('/(onboarding)/invite-partner')}
        />

        <View className="h-3" />

        <Button
          title={t('common.cancel')}
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
