import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, ToneShapes } from '@components';
import { colors, radius, spacing, typography } from '@config/theme';

const logo = require('@/assets/logo.png');

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Wordmark */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Hero — full-bleed coral card with tone-on-tone shapes */}
        <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.hero}>
          <ToneShapes variant="coral" />
          <View style={styles.heroContent}>
            <Text style={styles.heroHeadline} maxFontSizeMultiplier={1.4}>{t('auth.welcome.tagline')}</Text>
            <Text style={styles.heroBody}>{t('auth.welcome.description')}</Text>
          </View>
        </Animated.View>

        {/* CTAs */}
        <View style={styles.bottomSection}>
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <Link href="/(auth)/sign-up" asChild>
              <Button title={t('auth.welcome.getStarted')} />
            </Link>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(500)}>
            <Link href="/(auth)/sign-in" asChild>
              <Button title={t('auth.welcome.haveAccount')} variant="ghost" />
            </Link>

            <Link
              href={{ pathname: '/(auth)/sign-up', params: { invite: 'true' } }}
              asChild
            >
              <TouchableOpacity style={styles.inviteLink} accessibilityRole="link">
                <Text style={styles.inviteLinkText}>{t('auth.welcome.haveInvite')}</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 160,
    height: 60,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.hero,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: spacing.cardPad,
    paddingBottom: spacing.lg,
  },
  heroHeadline: {
    ...typography.hero,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  heroBody: {
    ...typography.bodySm,
    color: colors.onDark.body,
  },
  bottomSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.itemGap,
  },
  inviteLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLinkText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
