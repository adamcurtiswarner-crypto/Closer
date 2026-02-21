import React, { useState } from 'react';
import { View, Text, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { Button } from '@/components';
import { useTranslation } from 'react-i18next';

export default function VerifyEmailScreen() {
  const [isSending, setIsSending] = useState(false);
  const { t } = useTranslation();

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert(t('common.sent'), t('onboarding.verifyEmail.sentAlert'));
    } catch {
      Alert.alert(t('common.error'), t('onboarding.verifyEmail.errorAlert'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('onboarding.verifyEmail.title')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.verifyEmail.subtitle', { email: auth.currentUser?.email || 'your email' })}
        </Text>

        <View style={styles.actions}>
          <Button
            title={t('common.continue')}
            onPress={() => router.push('/(onboarding)/invite-partner')}
          />

          <View style={styles.spacer} />

          <Button
            title={isSending ? t('onboarding.verifyEmail.resending') : t('onboarding.verifyEmail.resend')}
            variant="secondary"
            onPress={handleResend}
            disabled={isSending}
          />
        </View>

        <Text style={styles.note}>
          {t('onboarding.verifyEmail.note')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#57534e',
    lineHeight: 24,
    marginBottom: 32,
  },
  actions: {},
  spacer: {
    height: 12,
  },
  note: {
    color: '#a8a29e',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
});
