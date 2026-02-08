import React, { useState } from 'react';
import { View, Text, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { Button } from '@/components';

export default function VerifyEmailScreen() {
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Sent', 'Verification email resent. Check your inbox.');
    } catch {
      Alert.alert('Error', 'Could not resend. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to {auth.currentUser?.email || 'your email'}.
          Tap the link to verify your account.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={() => router.push('/(onboarding)/invite-partner')}
          />

          <View style={styles.spacer} />

          <Button
            title={isSending ? 'Sending...' : 'Resend email'}
            variant="secondary"
            onPress={handleResend}
            disabled={isSending}
          />
        </View>

        <Text style={styles.note}>
          You can verify later, but some features require a verified email.
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
