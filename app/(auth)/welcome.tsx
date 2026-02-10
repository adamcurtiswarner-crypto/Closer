import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@components';

const logo = require('@/assets/logo.png');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Small moments. Real closeness.</Text>
        </View>

        <Text style={styles.description}>
          Stoke helps couples stay connected through simple daily prompts.
        </Text>

        {/* CTAs */}
        <View style={styles.buttons}>
          <Link href="/(auth)/sign-up" asChild>
            <Button title="Get Started" />
          </Link>

          <View style={styles.spacer} />

          <Link href="/(auth)/sign-in" asChild>
            <Button title="I have an account" variant="secondary" />
          </Link>
        </View>

        <Link href="/(onboarding)/accept-invite" asChild>
          <Text style={styles.inviteLink}>I have an invite</Text>
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
    marginBottom: 48,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#57534e',
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
