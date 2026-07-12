import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@hooks/useAuth';
import { colors } from '@config/theme';

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!user?.isOnboarded) {
    // A name is load-bearing for the product — every un-named account
    // finishes the name step before anything else. Never re-shown once
    // display_name is set (and never for already-onboarded users).
    if (!user?.displayName?.trim()) {
      return <Redirect href="/(onboarding)/name" />;
    }
    if (!user?.coupleId) {
      return <Redirect href="/(onboarding)/invite-partner" />;
    }
    return <Redirect href="/(onboarding)/tone-calibration" />;
  }

  return <Redirect href="/(app)/today" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.background,
  },
});
