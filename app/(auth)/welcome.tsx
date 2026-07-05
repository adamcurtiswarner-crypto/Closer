import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@components';
import { colors, spacing, typography } from '@config/theme';

const logo = require('@/assets/logo.png');
const heroIllustration = require('@/assets/welcome-flame.png');

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Wordmark */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Hero illustration — two people tending the flame */}
        <Animated.View
          entering={FadeIn.duration(700).delay(150)}
          style={styles.illustrationWrap}
        >
          <Image source={heroIllustration} style={styles.illustration} resizeMode="contain" />
        </Animated.View>

        {/* Headline + subtitle */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.textBlock}>
          <Text style={styles.headline} maxFontSizeMultiplier={1.4}>
            {t('auth.welcome.tagline')}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
            {t('auth.welcome.description')}
          </Text>
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
    marginBottom: spacing.sm,
  },
  logo: {
    width: 160,
    height: 60,
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  headline: {
    ...typography.hero,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bottomSection: {
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
