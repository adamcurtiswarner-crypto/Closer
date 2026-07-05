import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@hooks/useAuth';

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#D4522A" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!user?.isOnboarded) {
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
    backgroundColor: '#F5F2EE',
  },
});
