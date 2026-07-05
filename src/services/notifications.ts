import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { FEATURES } from '@/config/features';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register the push token
 * with the user's Firestore document.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    // Check existing permissions
    const existingPermissions = await Notifications.getPermissionsAsync();
    let isGranted = existingPermissions.granted;

    // Request permissions if not already granted
    if (!isGranted) {
      const newPermissions = await Notifications.requestPermissionsAsync();
      isGranted = newPermissions.granted;
    }

    if (!isGranted) {
      logger.info('Push notification permission not granted');
      return null;
    }

    // Get the native device push token (FCM for Android, APNs for iOS)
    // This is what Firebase Cloud Messaging expects
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    // Save token to Firestore user document, replacing any previous token
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      push_tokens: arrayUnion(token),
      updated_at: serverTimestamp(),
    });

    // Listen for token changes (rotation) and update Firestore
    Notifications.addPushTokenListener(async ({ data: newToken }) => {
      if (newToken && newToken !== token) {
        try {
          await updateDoc(userRef, {
            push_tokens: arrayUnion(newToken),
            updated_at: serverTimestamp(),
          });
          // Remove the old token
          await updateDoc(userRef, {
            push_tokens: arrayRemove(token),
          });
        } catch {
          // Token refresh is best-effort
        }
      }
    });

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (error) {
    logger.warn('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Set up handlers for incoming notifications and notification taps.
 * Returns a cleanup function to remove listeners.
 */
export function setupNotificationHandlers(): () => void {
  // Handle notification received while app is in foreground
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    logger.info('Notification received in foreground:', data);
  });

  // Handle notification tap (user interacted with notification)
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const type = data?.type as string | undefined;

    logEvent('notification_opened', { notification_type: type || 'unknown' });

    // Route to appropriate screen based on notification type
    if (type === 'prompt' || type === 'partner_responded') {
      router.push('/(app)/today');
    } else if (type === 'recap' || type === 'weekly_recap') {
      // Memories is feature-flagged off for v1 — fall back to today
      router.push(FEATURES.memories ? '/(app)/memories' : '/(app)/today');
    } else if (type === 'date_night' || type === 'date_night_reminder') {
      // Date nights is feature-flagged off for v1 — fall back to today
      router.push(FEATURES.dateNights ? '/(app)/date-nights' : '/(app)/today');
    } else if (type === 'check_in' || type === 'coaching_insight') {
      router.push('/(app)/today');
    } else {
      // Default: go to today screen
      router.push('/(app)/today');
    }
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}
