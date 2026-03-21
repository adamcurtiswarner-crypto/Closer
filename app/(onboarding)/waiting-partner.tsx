import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Icon } from '@/components';
import { useCouple } from '@/hooks/useCouple';
import { useTranslation } from 'react-i18next';

export default function WaitingPartnerScreen() {
  const { data: couple, refetch } = useCouple();
  const { t } = useTranslation();

  // If partner joined, redirect
  React.useEffect(() => {
    if (couple?.status === 'active') {
      router.replace('/(onboarding)/value-prop');
    }
  }, [couple]);

  // Poll for updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Icon name="hourglass" size="xl" color="#c97454" weight="light" />
          <Text style={styles.title}>
            {t('onboarding.waitingPartner.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.waitingPartner.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Button
            title={t('onboarding.waitingPartner.resendInvite')}
            variant="secondary"
            onPress={() => router.push('/(onboarding)/invite-partner')}
          />
        </Animated.View>

        <View style={styles.spacerSmall} />

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            title={t('common.cancel')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    textAlign: 'center',
    marginTop: 8,
  },
  spacerSmall: {
    height: 12,
  },
});
