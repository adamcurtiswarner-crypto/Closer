import '@/i18n';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeepLink } from '@/hooks/useDeepLink';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { setAnalyticsContext, logEvent } from '@/services/analytics';
import { registerPushIfAlreadyGranted, setupNotificationHandlers } from '@/services/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BiometricGate } from '@/components/BiometricGate';
import { colors } from '@/config/theme';

// Initialize Sentry before any rendering
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  // Performance monitoring
  tracesSampleRate: 0.2, // 20% of transactions
  profilesSampleRate: 0.1, // 10% of profiled transactions
  enableAutoPerformanceTracing: true,
  beforeSend(event) {
    // Strip sensitive relationship data from error payloads
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data };
          delete sanitized.response_text;
          delete sanitized.partnerName;
          delete sanitized.displayName;
          breadcrumb.data = sanitized;
        }
        return breadcrumb;
      });
    }
    if (event.extra) {
      delete event.extra.response_text;
      delete event.extra.partnerName;
      delete event.extra.displayName;
    }
    return event;
  },
});

// Dev-only LogBox noise filter for RevenueCat SDK logging. The custom log
// handler in src/config/purchases.ts already downgrades SDK errors to quiet
// warns; this catches anything the SDK emits with the "[RevenueCat]" prefix
// through other console paths. Dev noise only — production users never see
// LogBox, and Sentry capture is untouched (logger.error still reports).
if (__DEV__) {
  LogBox.ignoreLogs([/\[RevenueCat\]/]);
}

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

  // Check for OTA updates on app start
  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Update check failed silently — non-critical
      }
    })();
  }, []);

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

  // Silent push token refresh at launch — ONLY for users who already granted
  // permission (existing installs). New users are never hit with the system
  // dialog at launch; the Today screen's branded pre-prompt owns that ask
  // after their first submitted answer (see useNotificationPrePrompt).
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerPushIfAlreadyGranted(user.id);
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
    'Pacifico': require('../src/assets/fonts/Pacifico-Regular.ttf'),
    'Nunito-Regular': require('../src/assets/fonts/Nunito-Regular.ttf'),
    'Nunito-SemiBold': require('../src/assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold': require('../src/assets/fonts/Nunito-Bold.ttf'),
    'Nunito-BoldItalic': require('../src/assets/fonts/Nunito-BoldItalic.ttf'),
    'Nunito-ExtraBold': require('../src/assets/fonts/Nunito-ExtraBold.ttf'),
    'Nunito-Black': require('../src/assets/fonts/Nunito-Black.ttf'),
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
            <BiometricGate />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface.background },
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
