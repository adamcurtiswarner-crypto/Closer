import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Share,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { logger } from '@/utils/logger';
import { router } from 'expo-router';
import { Button } from '@/components';
import { useCreateInvite, usePendingInvite } from '@/hooks/useCouple';
import { useTranslation } from 'react-i18next';

export default function InvitePartnerScreen() {
  const { data: pendingInvite } = usePendingInvite();
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState<string | null>(
    pendingInvite?.code || null
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync();
      setInviteCode(result.code);
      setShareUrl(result.shareUrl);
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
    if (!shareUrl) return;

    try {
      await Share.share({
        message: `I'm trying Stoke — an app for us to stay connected. Join me: ${shareUrl}`,
      });
    } catch (error) {
      logger.error('Share failed:', error);
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
    backgroundColor: '#fafaf9',
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: 32,
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
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    marginBottom: 16,
  },
  codeText: {
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#c97454',
    letterSpacing: 4,
  },
  tapToCopy: {
    color: '#a8a29e',
    fontSize: 14,
    marginTop: 8,
  },
  validDays: {
    color: '#a8a29e',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  spacerSmall: {
    height: 16,
  },
  haveCodeLink: {
    marginTop: 24,
  },
  linkText: {
    color: '#c97454',
    textAlign: 'center',
  },
  skipLink: {
    marginTop: 24,
  },
  skipText: {
    color: '#78716c',
    textAlign: 'center',
    fontSize: 14,
  },
});
