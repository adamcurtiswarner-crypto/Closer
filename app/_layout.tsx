import '@/i18n';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeepLink } from '@/hooks/useDeepLink';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { setAnalyticsContext, logEvent } from '@/services/analytics';
import { registerForPushNotifications, setupNotificationHandlers } from '@/services/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Initialize Sentry before any rendering
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  beforeSend(event) {
    // Strip sensitive relationship data from error payloads
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data };
          delete sanitized.response_text;
          delete sanitized.response_text_encrypted;
          delete sanitized.partnerName;
          delete sanitized.displayName;
          // Remove any value containing the encryption sentinel
          for (const key of Object.keys(sanitized)) {
            if (typeof sanitized[key] === 'string' && sanitized[key].includes('[encrypted]')) {
              delete sanitized[key];
            }
          }
          breadcrumb.data = sanitized;
        }
        return breadcrumb;
      });
    }
    // Strip sensitive fields from extra context
    if (event.extra) {
      delete event.extra.response_text;
      delete event.extra.response_text_encrypted;
      delete event.extra.partnerName;
      delete event.extra.displayName;
    }
    return event;
  },
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
  },
});

function DeepLinkHandler() {
  useDeepLink();
  return null;
}

function AppBootstrap() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Hide splash screen after auth state resolves
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Set analytics and Sentry context when user changes
  useEffect(() => {
    if (user) {
      setAnalyticsContext({ user_id: user.id, couple_id: user.coupleId });
      Sentry.setUser({ id: user.id });
    } else {
      Sentry.setUser(null);
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

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Alexandria-SemiBold': require('../src/assets/fonts/Alexandria-SemiBold.ttf'),
    'Alexandria-Bold': require('../src/assets/fonts/Alexandria-Bold.ttf'),
    'Inter-Regular': require('../src/assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../src/assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../src/assets/fonts/Inter-SemiBold.ttf'),
  });

  // Keep splash screen visible until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DeepLinkHandler />
            <AppBootstrap />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#fef7f4' },
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
