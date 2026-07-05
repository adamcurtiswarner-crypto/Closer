import React, { useState, useEffect, useRef } from 'react';
import {
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
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components';
import { useAcceptInvite } from '@/hooks/useCouple';
import { clearPendingInviteCode } from '@/hooks/useDeepLink';
import { matchClipboardInvite } from '@/utils/inviteCode';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/config/theme';
export default function AcceptInviteScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [clipboardFilled, setClipboardFilled] = useState(false);
  const acceptInvite = useAcceptInvite();
  const hasAutoSubmitted = useRef(false);
  const hasCheckedClipboard = useRef(false);
  const { t } = useTranslation();

  // Handle code from deep link params
  useEffect(() => {
    if (codeParam && codeParam.length === 6) {
      setCode(codeParam.toUpperCase());
    }
  }, [codeParam]);

  // Quiet clipboard auto-fill: if there's no deep-link code and the field
  // is empty, prefill from a copied invite code or join link. Fill only —
  // auto-submit stays reserved for the join URL param below.
  useEffect(() => {
    if (codeParam || hasCheckedClipboard.current) return;
    hasCheckedClipboard.current = true;

    const checkClipboard = async () => {
      try {
        const hasString = await Clipboard.hasStringAsync();
        if (!hasString) return;

        const text = await Clipboard.getStringAsync();
        const match = matchClipboardInvite(text);
        if (match) {
          setCode((current) => {
            if (current.length > 0) return current;
            setClipboardFilled(true);
            return match.code;
          });
        }
      } catch (error) {
        // Clipboard access is best-effort; typing still works
        logger.warn('Could not read clipboard for invite code:', error);
      }
    };

    checkClipboard();
  }, [codeParam]);

  // Auto-submit if code came from a deep link
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
      router.replace('/(onboarding)/tone-calibration');
    } catch (error: any) {
      hasAutoSubmitted.current = false; // Allow retry
      const message = error?.message || '';

      // Show specific error messages for known cases
      if (message.includes('Already in a couple')) {
        Alert.alert(
          t('onboarding.acceptInvite.errors.alreadyPairedTitle'),
          t('onboarding.acceptInvite.errors.alreadyPairedBody')
        );
      } else if (message.includes('expired')) {
        Alert.alert(
          t('onboarding.acceptInvite.errors.expiredTitle'),
          t('onboarding.acceptInvite.errors.expiredBody')
        );
      } else if (message.includes('already been used')) {
        Alert.alert(
          t('onboarding.acceptInvite.errors.usedTitle'),
          t('onboarding.acceptInvite.errors.usedBody')
        );
      } else if (message.includes('your own invite')) {
        Alert.alert(
          t('onboarding.acceptInvite.errors.ownCodeTitle'),
          t('onboarding.acceptInvite.errors.ownCodeBody')
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
            onChangeText={(text) => {
              setClipboardFilled(false);
              setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          {clipboardFilled && (
            <Animated.Text entering={FadeIn.duration(300)} style={styles.clipboardHint}>
              {t('onboarding.acceptInvite.clipboardFilled')}
            </Animated.Text>
          )}
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
  clipboardHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  joinButtonContainer: {
    marginTop: spacing.xl,
  },
});
