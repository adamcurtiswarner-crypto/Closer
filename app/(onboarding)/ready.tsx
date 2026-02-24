import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button } from '@/components';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';

const TIME_LABELS: Record<string, string> = {
  '08:00': '8:00 AM',
  '14:00': '2:00 PM',
  '19:00': '7:00 PM',
  '21:00': '9:00 PM',
};

export default function ReadyScreen() {
  const { user, refreshUser } = useAuth();
  const promptTime = TIME_LABELS[user?.notificationTime || '19:00'] || '7:00 PM';
  const { t } = useTranslation();

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
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.title}>
            {t('onboarding.ready.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.ready.subtitle', { time: promptTime })}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Button title={t('onboarding.ready.startNow')} onPress={handleStartNow} />
        </Animated.View>

        <View style={styles.spacerSmall} />

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            title={t('onboarding.ready.waitForPrompt')}
            variant="secondary"
            onPress={handleWait}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
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
  checkmark: {
    fontSize: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    color: '#57534e',
    textAlign: 'center',
    marginTop: 8,
  },
  spacerSmall: {
    height: 12,
  },
});
