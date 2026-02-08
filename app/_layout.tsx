import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useDeepLink } from '@/hooks/useDeepLink';
import { useAuth } from '@/hooks/useAuth';
import { setAnalyticsContext, logEvent } from '@/services/analytics';
import { registerForPushNotifications, setupNotificationHandlers } from '@/services/notifications';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function DeepLinkHandler() {
  useDeepLink();
  return null;
}

function AppBootstrap() {
  const { user, isAuthenticated } = useAuth();

  // Set analytics context when user changes
  useEffect(() => {
    if (user) {
      setAnalyticsContext({ user_id: user.id, couple_id: user.coupleId });
    }
  }, [user]);

  // Register for push notifications after auth
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerForPushNotifications(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Log session start once per app open when user is available
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      logEvent('session_started');
    }
  }, [isAuthenticated, user?.id]);

  // Set up notification handlers once on mount
  useEffect(() => {
    const cleanup = setupNotificationHandlers();
    return cleanup;
  }, []);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DeepLinkHandler />
      <AppBootstrap />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fafaf9' },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
