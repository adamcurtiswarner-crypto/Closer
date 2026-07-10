import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button, PairingMoment } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptInvite } from '@/hooks/useCouple';
import { usePartner } from '@/hooks/usePartner';
import { clearPendingInviteCode } from '@/hooks/useDeepLink';
import { matchClipboardInvite } from '@/utils/inviteCode';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/config/theme';

interface InviteError {
  title: string;
  body: string;
}

export default function AcceptInviteScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [clipboardFilled, setClipboardFilled] = useState(false);
  const [inviteError, setInviteError] = useState<InviteError | null>(null);
  const [justPaired, setJustPaired] = useState(false);
  const { user } = useAuth();
  const acceptInvite = useAcceptInvite();
  // Resolves once the couple flips active — feeds the pairing moment's names.
  const { data: partner } = usePartner();
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

  // Map the acceptInvite callable's error messages to designed inline copy.
  // The HttpsError strings are kept in lockstep with these substring checks
  // (see functions/src/invites.ts) — match on message, present inline.
  const errorForMessage = (message: string): InviteError => {
    if (message.includes('Already in a couple')) {
      return {
        title: t('onboarding.acceptInvite.errors.alreadyPairedTitle'),
        body: t('onboarding.acceptInvite.errors.alreadyPairedBody'),
      };
    }
    if (message.includes('expired')) {
      return {
        title: t('onboarding.acceptInvite.errors.expiredTitle'),
        body: t('onboarding.acceptInvite.errors.expiredBody'),
      };
    }
    if (message.includes('already been used')) {
      return {
        title: t('onboarding.acceptInvite.errors.usedTitle'),
        body: t('onboarding.acceptInvite.errors.usedBody'),
      };
    }
    if (message.includes('your own invite')) {
      return {
        title: t('onboarding.acceptInvite.errors.ownCodeTitle'),
        body: t('onboarding.acceptInvite.errors.ownCodeBody'),
      };
    }
    return {
      title: t('onboarding.acceptInvite.invalidCode'),
      body: t('onboarding.acceptInvite.invalidCodeBody'),
    };
  };

  const handleAccept = async () => {
    if (code.length !== 6) {
      setInviteError({
        title: t('onboarding.acceptInvite.invalidCode'),
        body: t('onboarding.acceptInvite.enterSixChar'),
      });
      return;
    }

    setInviteError(null);
    try {
      await acceptInvite.mutateAsync(code.toUpperCase());
      await clearPendingInviteCode();
      setJustPaired(true);
    } catch (error: unknown) {
      hasAutoSubmitted.current = false; // Allow retry
      const message = error instanceof Error ? error.message : '';
      setInviteError(errorForMessage(message));
    }
  };

  // The pairing moment — both names, the flame, one quiet beat — then on.
  if (justPaired) {
    return (
      <PairingMoment
        myName={user?.displayName}
        partnerName={partner?.displayName}
        onDone={() => router.replace('/(onboarding)/tone-calibration')}
      />
    );
  }

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

        {inviteError && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorCard}>
            <Text style={styles.errorTitle}>{inviteError.title}</Text>
            <Text style={styles.errorBody}>{inviteError.body}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor={colors.border.default}
            value={code}
            onChangeText={(text) => {
              setClipboardFilled(false);
              setInviteError(null);
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
  errorCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  errorBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  codeInput: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
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
