import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components';
import { useAcceptInvite } from '@/hooks/useCouple';
import { clearPendingInviteCode } from '@/hooks/useDeepLink';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/config/theme';
export default function AcceptInviteScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const acceptInvite = useAcceptInvite();
  const hasAutoSubmitted = useRef(false);
  const { t } = useTranslation();

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
      Alert.alert(t('common.error'), t('onboarding.acceptInvite.enterSixChar'));
      return;
    }

    try {
      await acceptInvite.mutateAsync(code.toUpperCase());
      await clearPendingInviteCode();
      router.replace('/(onboarding)/value-prop');
    } catch (error: any) {
      hasAutoSubmitted.current = false; // Allow retry
      const message = error?.message || '';

      // Show specific error messages for known cases
      if (message.includes('Already in a couple')) {
        Alert.alert(
          'Already Paired',
          'Your account is already linked to a partner. Sign out and try again, or contact support.'
        );
      } else if (message.includes('expired')) {
        Alert.alert(
          'Code Expired',
          'This invite code has expired. Ask your partner to generate a new one.'
        );
      } else if (message.includes('already been used')) {
        Alert.alert(
          'Code Already Used',
          'This invite code has already been accepted.'
        );
      } else if (message.includes('your own invite')) {
        Alert.alert(
          'Own Code',
          'You cannot accept your own invite code. Share it with your partner instead.'
        );
      } else {
        Alert.alert(
          t('onboarding.acceptInvite.invalidCode'),
          t('onboarding.acceptInvite.invalidCodeBody')
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentCentered}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Text style={styles.title}>
            {t('onboarding.acceptInvite.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.acceptInvite.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor={colors.border.default}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.joinButtonContainer}>
          <Button
            title={t('onboarding.acceptInvite.join')}
            onPress={handleAccept}
            loading={acceptInvite.isPending}
            disabled={code.length !== 6}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Button
            title={t('common.back')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  codeInput: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: spacing.lg,
    textAlign: 'center',
    ...typography.code,
    color: colors.accent.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  joinButtonContainer: {
    marginTop: spacing.xl,
  },
});
