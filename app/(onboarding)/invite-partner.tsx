import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Share,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { sendEmailVerification } from 'firebase/auth';
import { logger } from '@/utils/logger';
import { router } from 'expo-router';
import { Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useCreateInvite, usePendingInvite } from '@/hooks/useCouple';
import { completeOnboarding } from '@/utils/onboarding';
import { getShareMessage } from '@/config/app';
import { copyInviteToClipboard } from '@/utils/inviteLink';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/config/theme';

// How long the quiet "Copied" confirmation lingers before fading back
const COPIED_VISIBLE_MS = 2000;

type ResendState = 'idle' | 'sending' | 'sent';

// Passive verification notice — the flow no longer stops on a
// dedicated verify-email screen; verification can happen any time.
function VerifyEmailNotice() {
  const { firebaseUser } = useAuth();
  const [resendState, setResendState] = useState<ResendState>('idle');
  const { t } = useTranslation();

  if (!firebaseUser || firebaseUser.emailVerified) return null;

  const handleResend = async () => {
    if (resendState !== 'idle') return;
    setResendState('sending');
    try {
      await sendEmailVerification(firebaseUser);
      setResendState('sent');
    } catch (error) {
      logger.warn('Could not resend verification email:', error);
      setResendState('idle');
      Alert.alert(
        t('onboarding.invitePartner.verifyResendErrorTitle'),
        t('onboarding.invitePartner.verifyResendErrorBody')
      );
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.verifyNotice}>
      <Text style={styles.verifyNoticeText}>
        {t('onboarding.invitePartner.verifyNotice')}
      </Text>
      {resendState === 'sent' ? (
        <Text style={styles.verifyNoticeSent}>
          {t('onboarding.invitePartner.verifyResendSent')}
        </Text>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleResend}
          disabled={resendState === 'sending'}
          style={styles.verifyNoticeLinkButton}
        >
          <Text style={styles.verifyNoticeLink}>
            {resendState === 'sending'
              ? t('onboarding.invitePartner.verifyResending')
              : t('onboarding.invitePartner.verifyResend')}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function InvitePartnerScreen() {
  const { user, refreshUser } = useAuth();
  const { data: pendingInvite } = usePendingInvite();
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  // Clear any pending copied-state fade on unmount
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // Sync state when pending invite loads asynchronously
  useEffect(() => {
    if (pendingInvite?.code && !inviteCode) {
      setInviteCode(pendingInvite.code);
      setShareMessage(getShareMessage(pendingInvite.code, user?.displayName));
    }
  }, [pendingInvite?.code, user?.displayName]);

  const handleCreateInvite = async () => {
    setCreateError(null);
    try {
      const result = await createInvite.mutateAsync();
      setInviteCode(result.code);
      setShareMessage(result.shareMessage);
    } catch (error) {
      logger.error('Could not create invite:', error);
      setCreateError(t('onboarding.invitePartner.createErrorBody'));
    }
  };

  // Quiet inline confirmation — no system alert for a success this small.
  const handleCopyCode = async () => {
    const activeCode = inviteCode || pendingInvite?.code;
    if (!activeCode) return;
    try {
      await Clipboard.setStringAsync(activeCode);
      hapticImpact(ImpactFeedbackStyle.Light);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_VISIBLE_MS);
    } catch (error) {
      // Clipboard access is best-effort; the Share button still works
      logger.warn('Could not copy invite code:', error);
    }
  };

  const handleShare = async () => {
    if (!shareMessage) return;

    try {
      void copyInviteToClipboard(inviteCode ?? pendingInvite?.code);
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      logger.error('Share failed:', error);
      Alert.alert(
        t('onboarding.invitePartner.shareFailedTitle'),
        t('onboarding.invitePartner.shareFailedBody')
      );
    }
  };

  // Skipping the invite still completes onboarding, so Today can offer
  // pairing again later instead of bouncing back into this flow.
  const handleSkip = async () => {
    if (!user?.id || isSkipping) return;
    setIsSkipping(true);
    try {
      await completeOnboarding(user.id, { skippedInvite: true });
      await refreshUser();
      router.replace('/(app)/today');
    } catch (error) {
      logger.error('Could not complete onboarding on skip:', error);
      Alert.alert(
        t('onboarding.invitePartner.skipErrorTitle'),
        t('onboarding.invitePartner.skipErrorBody')
      );
    } finally {
      setIsSkipping(false);
    }
  };

  const skipLink = (
    <TouchableOpacity
      style={styles.skipLink}
      onPress={handleSkip}
      disabled={isSkipping}
    >
      <Text style={styles.skipText}>
        {isSkipping ? t('common.loading') : t('common.skipForNow')}
      </Text>
    </TouchableOpacity>
  );

  // If already have invite, show it
  if (inviteCode || pendingInvite?.code) {
    const code = inviteCode || pendingInvite?.code;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentCentered}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
            <Text style={styles.title}>
              {t('onboarding.invitePartner.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('onboarding.invitePartner.subtitle')}
            </Text>
          </Animated.View>

          {/* Invite code display */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <TouchableOpacity
              onPress={handleCopyCode}
              style={styles.codeCard}
            >
              <Text style={styles.codeText}>
                {code}
              </Text>
              {copied ? (
                <Animated.Text
                  key="copied"
                  entering={FadeIn.duration(200)}
                  style={styles.copiedText}
                >
                  {t('common.copied')}
                </Animated.Text>
              ) : (
                <Text style={styles.tapToCopy}>
                  {t('onboarding.invitePartner.tapToCopy')}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.Text entering={FadeIn.duration(400).delay(300)} style={styles.validDays}>
            {t('onboarding.invitePartner.validDays')}
          </Animated.Text>

          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Button title={t('onboarding.invitePartner.share')} onPress={handleShare} />
          </Animated.View>

          <View style={styles.spacerSmall} />

          <Animated.View entering={FadeInUp.duration(400).delay(500)}>
            <Button
              title={t('onboarding.invitePartner.waitForThem')}
              variant="secondary"
              onPress={() => router.push('/(onboarding)/waiting-partner')}
            />
          </Animated.View>

          {/* Already have an invite to accept */}
          <Animated.View entering={FadeInUp.duration(400).delay(600)}>
            <TouchableOpacity
              style={styles.haveCodeLink}
              onPress={() => router.push('/(onboarding)/accept-invite')}
            >
              <Text style={styles.linkText}>
                {t('onboarding.invitePartner.haveInviteCode')}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {skipLink}

          <VerifyEmailNotice />
        </View>
      </SafeAreaView>
    );
  }

  // No invite yet
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Text style={styles.title}>
            {t('onboarding.invitePartner.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.invitePartner.subtitleCreate')}
          </Text>
        </Animated.View>

        {createError && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              {t('onboarding.invitePartner.createErrorTitle')}
            </Text>
            <Text style={styles.errorBody}>{createError}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Button
            title={
              createError
                ? t('onboarding.invitePartner.tryAgain')
                : t('onboarding.invitePartner.createInvite')
            }
            onPress={handleCreateInvite}
            loading={createInvite.isPending}
          />
        </Animated.View>

        <View style={styles.spacerSmall} />

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            title={t('onboarding.invitePartner.haveInviteCode')}
            variant="secondary"
            onPress={() => router.push('/(onboarding)/accept-invite')}
          />
        </Animated.View>

        {skipLink}

        <VerifyEmailNotice />
      </View>
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
  codeCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  codeText: {
    ...typography.code,
    color: colors.accent.primary,
  },
  tapToCopy: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  copiedText: {
    ...typography.bodySm,
    color: colors.semantic.success,
    marginTop: spacing.sm,
  },
  validDays: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  spacerSmall: {
    height: 16,
  },
  haveCodeLink: {
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.body,
    color: colors.accent.primary,
    textAlign: 'center',
  },
  skipLink: {
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
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
  verifyNotice: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  verifyNoticeText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  verifyNoticeLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  verifyNoticeLink: {
    ...typography.caption,
    color: colors.accent.primary,
  },
  verifyNoticeSent: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
});
