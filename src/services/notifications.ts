import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.info('Push notification permission not granted');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save token to Firestore user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      push_tokens: arrayUnion(token),
      updated_at: serverTimestamp(),
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
      router.push('/(app)/memories');
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
