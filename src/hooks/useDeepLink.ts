import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from './useAuth';

const PENDING_INVITE_KEY = '@closer/pending_invite_code';

// Extract invite code from URL
function extractInviteCode(url: string): string | null {
  // Handle closer://join/CODE
  const customSchemeMatch = url.match(/closer:\/\/join\/([A-Z0-9]{6})/i);
  if (customSchemeMatch) {
    return customSchemeMatch[1].toUpperCase();
  }

  // Handle https://closer.app/join/CODE
  const universalLinkMatch = url.match(/closer\.app\/join\/([A-Z0-9]{6})/i);
  if (universalLinkMatch) {
    return universalLinkMatch[1].toUpperCase();
  }

  return null;
}

export function useDeepLink() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleUrl = useCallback(
    async (url: string) => {
      const code = extractInviteCode(url);
      if (!code) return;

      // Wait for auth loading to complete
      if (isLoading) return;

      if (!isAuthenticated) {
        // Store code for after authentication
        await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
        router.push('/(auth)/sign-up');
        return;
      }

      if (user?.coupleId) {
        // Already in a couple
        Alert.alert(
          'Already Connected',
          'You are already connected to a partner. Disconnect first to join someone new.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to accept-invite with code
      router.push({
        pathname: '/(onboarding)/accept-invite',
        params: { code },
      });
    },
    [isAuthenticated, isLoading, user?.coupleId]
  );

  // Handle initial URL (app opened via deep link)
  useEffect(() => {
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleUrl(initialUrl);
      }
    };

    if (!isLoading) {
      getInitialUrl();
    }
  }, [isLoading, handleUrl]);

  // Handle URL changes while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);
}

// Helper to check and retrieve pending invite code after auth
export async function getPendingInviteCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}

// Helper to clear pending invite code
export async function clearPendingInviteCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Ignore errors
  }
}
