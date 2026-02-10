import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

type AnalyticsEvent =
  | 'onboarding_completed'
  | 'couple_linked'
  | 'prompt_viewed'
  | 'prompt_started'
  | 'prompt_response_submitted'
  | 'prompt_completed'
  | 'emotional_response_submitted'
  | 'recap_viewed'
  | 'memory_saved'
  | 'session_started'
  | 'notification_opened'
  | 'goal_created'
  | 'goal_completed'
  | 'goal_archived'
  | 'weekly_challenge_activated'
  | 'weekly_challenge_completed'
  | 'profile_photo_uploaded'
  | 'profile_updated';

interface EventContext {
  user_id?: string;
  couple_id?: string | null;
}

let _context: EventContext = {};

export function setAnalyticsContext(context: EventContext) {
  _context = { ..._context, ...context };
}

export async function logEvent(
  name: AnalyticsEvent,
  properties?: Record<string, any>
) {
  try {
    const eventsRef = collection(db, 'events');
    await addDoc(eventsRef, {
      event_name: name,
      user_id: _context.user_id || null,
      couple_id: _context.couple_id || null,
      platform: Platform.OS,
      timestamp: serverTimestamp(),
      properties: properties || {},
    });
  } catch (error) {
    // Don't let analytics errors disrupt the app
    logger.warn('Analytics event failed:', name, error);
  }
}
