import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@components';

const logo = require('@/assets/logo.png');
const illustration = require('@/assets/welcome-illustration.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Illustration */}
        <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.illustrationContainer}>
          <Image source={illustration} style={styles.illustration} resizeMode="contain" />
        </Animated.View>

        {/* Tagline */}
        <Animated.View entering={FadeIn.duration(500).delay(400)} style={styles.textContainer}>
          <Text style={styles.tagline}>Tend to the moments,{'\n'}keep the Flame.</Text>
          <Text style={styles.subtitle}>Stoke curiosity. Keep the spark alive.</Text>
        </Animated.View>

        {/* CTA */}
        <View style={styles.bottomSection}>
          <Animated.View entering={FadeInUp.duration(500).delay(600)}>
            <Link href="/(auth)/sign-up" asChild>
              <Button title="Sign up" />
            </Link>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Text style={styles.loginLink}>Log in</Text>
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
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  logo: {
    width: 160,
    height: 60,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tagline: {
    fontSize: 28,
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    color: '#1E1E2E',
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 12,
  },
  bottomSection: {
    paddingBottom: 16,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 8,
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    fontWeight: '600',
    color: '#D4522A',
  },
});
