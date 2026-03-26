import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format } from 'date-fns';

admin.initializeApp();

export const db = admin.firestore();
export const APP_NAME = 'Stoke';

// ============================================
// CONSTANTS
// ============================================

// Tone weight multipliers per prompt type (legacy fallback)
export const TONE_WEIGHTS: Record<string, Record<string, number>> = {
  solid: {}, // No weighting changes
  distant: {
    bid_for_connection: 2,
    appreciation_expression: 2,
    conflict_navigation: 0.5,
    repair_attempt: 0.5,
  },
  struggling: {
    repair_attempt: 2,
    conflict_navigation: 2,
    bid_for_connection: 1.5,
    dream_exploration: 0.5,
  },
};

// Pulse-based weight multipliers per prompt type
export const PULSE_WEIGHTS: Record<string, Record<string, number>> = {
  thriving: {
    dream_exploration: 1.5,
    growth_challenge: 1.5,
  },
  steady: {
    appreciation_expression: 1.5,
    bid_for_connection: 1.5,
  },
  cooling: {
    appreciation_expression: 2,
    bid_for_connection: 2,
    fun_playful: 2,
    nostalgic_reflection: 1.5,
    conflict_navigation: 0.3,
    repair_attempt: 0.5,
  },
  needs_attention: {
    appreciation_expression: 2.5,
    fun_playful: 2.5,
    bid_for_connection: 2,
    nostalgic_reflection: 2,
    conflict_navigation: 0.1,
    repair_attempt: 0.3,
    dream_exploration: 0.5,
    growth_challenge: 0.3,
  },
};

// Depth progression constants
export const PROMPT_TYPES = [
  'love_map_update',
  'bid_for_connection',
  'appreciation_expression',
  'dream_exploration',
  'conflict_navigation',
  'repair_attempt',
];

export const DEPTH_THRESHOLD = 3;
export const DEEP_WEEK_FLOOR = 4;

export const VALID_PROMPT_TYPES = [
  'love_map_update',
  'bid_for_connection',
  'appreciation_expression',
  'dream_exploration',
  'conflict_navigation',
  'repair_attempt',
];

export const VALID_PROMPT_DEPTHS = ['surface', 'medium', 'deep'];

// ============================================
// SHARED HELPERS
// ============================================

// Returns the "more cautious" tone: struggling > distant > solid
export function getEffectiveTone(tones: string[]): string {
  if (tones.includes('struggling')) return 'struggling';
  if (tones.includes('distant')) return 'distant';
  return 'solid';
}

export function initializeDepthProgress(): Record<string, { level: string; surface_completions: number; medium_completions: number }> {
  const progress: Record<string, { level: string; surface_completions: number; medium_completions: number }> = {};
  for (const type of PROMPT_TYPES) {
    progress[type] = { level: 'surface', surface_completions: 0, medium_completions: 0 };
  }
  return progress;
}

export function getWeekId(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const tokens = userData.push_tokens || [];

  if (tokens.length === 0) return;

  // Tokens are stored as plain strings (FCM/APNs device tokens)
  const messages = tokens
    .filter((t: unknown) => typeof t === 'string' && t.length > 0)
    .map((t: string) => ({
      token: t,
      notification,
      ...(data ? { data } : {}),
    }));

  if (messages.length === 0) return;

  try {
    const results = await admin.messaging().sendEach(messages);
    // Clean up invalid tokens
    const tokensToRemove: string[] = [];
    results.responses.forEach((resp, idx) => {
      if (resp.error?.code === 'messaging/registration-token-not-registered' ||
          resp.error?.code === 'messaging/invalid-registration-token') {
        tokensToRemove.push(messages[idx].token);
      }
    });
    if (tokensToRemove.length > 0) {
      await db.collection('users').doc(userId).update({
        push_tokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}

export async function logEvent(
  eventName: string,
  userId: string,
  coupleId: string | null,
  properties: Record<string, unknown>
): Promise<void> {
  const now = new Date();
  await db.collection('events').add({
    event_name: eventName,
    user_id: userId,
    couple_id: coupleId,
    properties,
    platform: 'server',
    app_version: null,
    session_id: null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    date: format(now, 'yyyy-MM-dd'),
    week: format(now, "yyyy-'W'ww"),
  });
}

// Re-export commonly needed items from dependencies
export { admin, functions };
