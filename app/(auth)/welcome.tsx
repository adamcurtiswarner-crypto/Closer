import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@components';

const logo = require('@/assets/logo.png');

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(500).delay(200)}>
          <Text style={styles.tagline}>{t('auth.welcome.tagline')}</Text>
          <Text style={styles.description}>
            {t('auth.welcome.description')}
          </Text>
        </Animated.View>

        {/* CTAs */}
        <View style={styles.buttons}>
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <Link href="/(auth)/sign-up" asChild>
              <Button title={t('auth.welcome.getStarted')} />
            </Link>
          </Animated.View>

          <View style={styles.spacer} />

          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <Link href="/(auth)/sign-in" asChild>
              <Button title={t('auth.welcome.haveAccount')} variant="secondary" />
            </Link>
          </Animated.View>
        </View>

        <Link href="/(onboarding)/accept-invite" asChild>
          <Text style={styles.inviteLink}>{t('auth.welcome.haveInvite')}</Text>
        </Link>
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
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#57534e',
    textAlign: 'center',
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    color: '#57534e',
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  buttons: {},
  spacer: {
    height: 12,
  },
  inviteLink: {
    color: '#c97454',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
});
