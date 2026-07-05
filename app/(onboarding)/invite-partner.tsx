import React, { useState, useEffect } from 'react';
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
import { logger } from '@/utils/logger';
import { router } from 'expo-router';
import { Button } from '@/components';
import { useCreateInvite, usePendingInvite } from '@/hooks/useCouple';
import { getShareMessage } from '@/config/app';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/config/theme';
export default function InvitePartnerScreen() {
  const { data: pendingInvite } = usePendingInvite();
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  // Sync state when pending invite loads asynchronously
  useEffect(() => {
    if (pendingInvite?.code && !inviteCode) {
      setInviteCode(pendingInvite.code);
      setShareMessage(getShareMessage(pendingInvite.code));
    }
  }, [pendingInvite?.code]);

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync();
      setInviteCode(result.code);
      setShareMessage(result.shareMessage);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite.');
    }
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert(t('common.copied'), t('onboarding.invitePartner.inviteCopied'));
    }
  };

  const handleShare = async () => {
    if (!shareMessage) return;

    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      logger.error('Share failed:', error);
      Alert.alert('Share failed', 'Could not open the share dialog. You can copy the code instead.');
    }
  };

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
              <Text style={styles.tapToCopy}>
                {t('onboarding.invitePartner.tapToCopy')}
              </Text>
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

          <TouchableOpacity
            style={styles.skipLink}
            onPress={() => router.replace('/(app)/today')}
          >
            <Text style={styles.skipText}>
              {t('common.skipForNow')}
            </Text>
          </TouchableOpacity>
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

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Button
            title={t('onboarding.invitePartner.createInvite')}
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

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => router.replace('/(app)/today')}
        >
          <Text style={styles.skipText}>
            {t('common.skipForNow')}
          </Text>
        </TouchableOpacity>
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
    borderRadius: 16,
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
  },
  skipText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
