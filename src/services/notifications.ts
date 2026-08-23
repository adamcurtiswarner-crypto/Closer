import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { FEATURES } from '@/config/features';
import type { PushPermissionStatus } from '@/utils/pushPrePrompt';

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
 * Read the current OS notification permission without prompting.
 * Falls back to 'undetermined' on read failure so callers stay conservative
 * (an undetermined status never triggers the system dialog by itself).
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.granted) return 'granted';
    if (permissions.status === Notifications.PermissionStatus.UNDETERMINED) {
      return 'undetermined';
    }
    return 'denied';
  } catch (error) {
    logger.warn('Failed to read push permission status:', error);
    return 'undetermined';
  }
}

/**
 * Where this device's Expo push token is remembered between launches.
 *
 * An Expo push token addresses a DEVICE, not an account. Registration is
 * additive (arrayUnion), and until 2026-08-23 sign-out removed nothing — so
 * every account ever signed in on a phone stayed addressable from it, and the
 * phone received one copy of every push for each of them. The founder was
 * getting three identical daily prompts back to back, and a July scrub of ten
 * stale tokens had regrown for the same reason.
 *
 * Cached here rather than re-fetched at sign-out on purpose: see
 * unregisterPushToken.
 */
export const PUSH_TOKEN_CACHE_KEY = 'stoke.push_token';

/** Set at registration so sign-out can hand the token back without a fetch. */
let cachedPushToken: string | null = null;

async function rememberPushToken(token: string): Promise<void> {
  cachedPushToken = token;
  try {
    await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, token);
  } catch {
    // The in-memory copy still covers this session.
  }
}

/**
 * Hand this device's push token back before signing out.
 *
 * Deliberately cache-only: getExpoPushTokenAsync is a round trip to Expo's
 * servers, and sign-out is the one flow that must always work — offline, on a
 * dying connection, in an airport. A token we cannot name is left in place
 * rather than stalling the user; it will be handed back at the next sign-out,
 * and the server already prunes tokens Expo reports as DeviceNotRegistered.
 *
 * Must run BEFORE firebaseSignOut — the security rules only allow a user to
 * write their own doc while they are still signed in.
 *
 * Never throws. A failure here must not strand someone in a session they
 * asked to leave.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  let token = cachedPushToken;
  if (!token) {
    try {
      token = await AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY);
    } catch {
      token = null;
    }
  }
  if (!token) return;

  try {
    await updateDoc(doc(db, 'users', userId), {
      push_tokens: arrayRemove(token),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    logger.warn('Failed to unregister push token:', error);
    return;
  }

  // Only forget it once the removal actually landed, so a failed attempt can
  // be retried at the next sign-out.
  cachedPushToken = null;
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_CACHE_KEY);
  } catch {
    // Nothing more to do — the token is already off the user doc.
  }
}

/**
 * Silent launch-time registration: refresh the push token ONLY for users who
 * already granted permission (existing installs). Never shows the system
 * dialog — undetermined and denied users are left alone; the branded
 * pre-prompt on the Today screen owns the ask for new users.
 */
export async function registerPushIfAlreadyGranted(userId: string): Promise<string | null> {
  const status = await getPushPermissionStatus();
  if (status !== 'granted') return null;
  // Permission already granted, so this never surfaces a dialog —
  // it only refreshes the device token in Firestore.
  return registerForPushNotifications(userId);
}

/**
 * Resolve the EAS project ID from the Expo config. Required by
 * getExpoPushTokenAsync so the token is attributed to the right project.
 */
function getEasProjectId(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  return fromExtra ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Fetch the Expo push token (ExponentPushToken[...]) for this device.
 * The Expo Push Service handles the APNs/FCM transport server-side, so this
 * one token format works for both platforms.
 */
async function getExpoPushToken(): Promise<string> {
  const projectId = getEasProjectId();
  if (!projectId) {
    logger.warn('EAS projectId missing from Expo config; relying on default resolution');
  }
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data;
}

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

    // Get the Expo push token (ExponentPushToken[...]). The server sends
    // through the Expo Push Service, which accepts only this format — raw
    // APNs/FCM device tokens are NOT valid here.
    const token = await getExpoPushToken();

    // Save token to Firestore user document (additive — the server removes
    // tokens that come back as invalid at send time)
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      push_tokens: arrayUnion(token),
      updated_at: serverTimestamp(),
    });
    // Remembered so sign-out can hand it back without a network round trip.
    await rememberPushToken(token);

    // Listen for device token rotation. The listener fires with the raw
    // device token, so re-mint the Expo token instead of storing that value.
    let currentToken = token;
    Notifications.addPushTokenListener(async () => {
      try {
        const refreshedToken = await getExpoPushToken();
        if (refreshedToken && refreshedToken !== currentToken) {
          await updateDoc(userRef, {
            push_tokens: arrayUnion(refreshedToken),
            updated_at: serverTimestamp(),
          });
          // Remove the token this device just replaced
          await updateDoc(userRef, {
            push_tokens: arrayRemove(currentToken),
          });
          currentToken = refreshedToken;
          await rememberPushToken(refreshedToken);
        }
      } catch {
        // Token refresh is best-effort
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
    if (
      type === 'prompt' ||
      type === 'partner_responded' ||
      type === 'reaction' ||
      type === 'clarify_question' ||
      type === 'clarify_answer'
    ) {
      // Reactions and clarify exchanges land on the revealed completion —
      // Today carries the reveal plus the clarify discovery card.
      router.push('/(app)/today');
    } else if (type === 'explore_question' || type === 'explore_complete') {
      // Explore prompts never appear on Today — land on the explore tab and
      // auto-open the target: respond flow for a question waiting on you,
      // the both-answers view once it is complete. Validate deep-link params
      // at the boundary; a bare explore tab is the safe fallback.
      const assignmentId =
        typeof data?.assignment_id === 'string' && data.assignment_id.length > 0
          ? data.assignment_id
          : undefined;
      const promptId =
        typeof data?.prompt_id === 'string' && data.prompt_id.length > 0
          ? data.prompt_id
          : undefined;
      if (assignmentId || promptId) {
        router.push({
          pathname: '/(app)/explore',
          params: {
            ...(assignmentId ? { assignmentId } : {}),
            ...(promptId ? { promptId } : {}),
          },
        });
      } else {
        router.push('/(app)/explore');
      }
    } else if (type === 'recap' || type === 'weekly_recap') {
      // The weekly recap lives on Hearth (memories tab stays hidden in v1).
      router.push(FEATURES.hearth ? '/(app)/hearth' : '/(app)/today');
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
