import { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPushPermissionStatus,
  registerForPushNotifications,
} from '@/services/notifications';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import {
  shouldShowPrePrompt,
  parseExposureCount,
  PUSH_SYSTEM_PROMPTED_KEY,
  PUSH_PREPROMPT_EXPOSURES_KEY,
  type PrePromptTrigger,
} from '@/utils/pushPrePrompt';

interface NotificationPrePromptState {
  /** Whether the branded pre-prompt card should be on screen. */
  visible: boolean;
  /** Ask to show the card from a seam ('first_submit' | 'reveal'). Gated internally. */
  offer: (trigger: PrePromptTrigger) => void;
  /** User accepted the card — show the real system dialog and register. */
  accept: () => Promise<void>;
  /** User chose "Not now" — hide and stay quiet for the rest of the session. */
  dismiss: () => void;
}

/**
 * Owns when the branded push pre-prompt may appear (see utils/pushPrePrompt
 * for the rules) and what accepting it does: mark the system dialog as spent
 * (push_prompted), then run the real permission request + token registration.
 */
export function useNotificationPrePrompt(userId: string | undefined): NotificationPrePromptState {
  const [visible, setVisible] = useState(false);
  // At most one exposure per session, even across triggers
  const offeredThisSessionRef = useRef(false);

  const offer = useCallback(
    (trigger: PrePromptTrigger) => {
      if (!userId || offeredThisSessionRef.current) return;
      (async () => {
        try {
          const [permission, promptedRaw, exposuresRaw] = await Promise.all([
            getPushPermissionStatus(),
            AsyncStorage.getItem(PUSH_SYSTEM_PROMPTED_KEY),
            AsyncStorage.getItem(PUSH_PREPROMPT_EXPOSURES_KEY),
          ]);
          const exposures = parseExposureCount(exposuresRaw);
          const show = shouldShowPrePrompt({
            permission,
            systemPrompted: promptedRaw === 'true',
            exposures,
            offeredThisSession: offeredThisSessionRef.current,
            trigger,
          });
          if (!show) return;
          offeredThisSessionRef.current = true;
          await AsyncStorage.setItem(PUSH_PREPROMPT_EXPOSURES_KEY, String(exposures + 1));
          setVisible(true);
          logEvent('push_preprompt_shown', { trigger, exposure: exposures + 1 });
        } catch (error) {
          // Storage/permission read failed — the pre-prompt is optional; stay quiet
          logger.warn('Push pre-prompt gating failed:', error);
        }
      })();
    },
    [userId]
  );

  const accept = useCallback(async () => {
    setVisible(false);
    if (!userId) return;
    try {
      // The system dialog is about to show — one-shot, whatever the outcome
      await AsyncStorage.setItem(PUSH_SYSTEM_PROMPTED_KEY, 'true');
      const token = await registerForPushNotifications(userId);
      logEvent('push_preprompt_accepted', { granted: token != null });
    } catch (error) {
      logger.warn('Push registration after pre-prompt failed:', error);
    }
  }, [userId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Session quiet period — offeredThisSessionRef is already true from offer()
    logEvent('push_preprompt_dismissed');
  }, []);

  return { visible, offer, accept, dismiss };
}
