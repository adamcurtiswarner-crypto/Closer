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
// SCORED PROMPTS & FOLLOW-UPS
// ============================================

// Mirrors specs/types.ts (Firestore snake_case)
export type ResponseFormat = 'text' | 'scale';
export type FollowUpBranch = 'deepener' | 'repair' | 'divergence';
export type AssignmentKind = 'daily' | 'follow_up';

export interface ScaleConfig {
  min: number; // 1
  max: number; // 10
  low_threshold: number; // 4 — min score <= this triggers repair
  high_threshold: number; // 9 — both scores >= this triggers deepener
  divergence_gap: number; // 4 — |scoreA - scoreB| >= this triggers divergence
  min_label: string; // "Struggling"
  max_label: string; // "Thriving"
}

export interface FollowUpAssignmentInfo {
  branch: FollowUpBranch;
  step: 1 | 2; // repair has steps 1 and 2; deepener/divergence always 1
  parent_assignment_id: string; // the scored assignment that triggered this
  template_id: string;
}

// /follow_up_templates/{templateId} — category-level follow-up content
export interface FollowUpTemplate {
  id: string;
  category: string; // one of V1_PROMPT_CATEGORIES
  branch: FollowUpBranch;
  step: 1 | 2;
  text: string; // question shown to both partners
  closing_text?: string; // shown at reveal of the final step
  variant: number;
  active: boolean;
}

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  min: 1,
  max: 10,
  low_threshold: 4,
  high_threshold: 9,
  divergence_gap: 4,
  min_label: 'Struggling',
  max_label: 'Thriving',
};

export const VALID_FOLLOW_UP_BRANCHES = ['deepener', 'repair', 'divergence'];

// v1 category taxonomy (snake_case ids) — mirrors src/config/promptCategories.ts
export const V1_PROMPT_CATEGORIES = [
  'communication',
  'intimacy',
  'affection',
  'money',
  'family',
  'friends',
  'fun_play',
  'future_dreams',
  'everyday_life',
  'conflict_repair',
  'appreciation_trust',
  'growth_independence',
];

// ============================================
// SAFETY LEXICON (v1 safety off-ramp)
// ============================================

/**
 * Crisis language lexicon. When either partner's response text matches,
 * follow-up creation is suppressed entirely (see followUps.ts). Only a
 * neutral event is ever logged — NEVER the matched text.
 *
 * IMPORTANT: This list is mirrored in src/utils/safetyLexicon.ts (client).
 * The two copies MUST stay identical — update both together.
 *
 * Matching strategy (false-positive guards):
 * - Lowercased, word-boundary matching: "harm" alone never fires,
 *   "hurt myself" does; "harmless" and "no harm done" never fire.
 * - Bare ambiguous idioms are excluded ("hit me" as in "it hit me",
 *   "beat me" as in "beat me at chess"); pronoun-anchored forms are
 *   included instead ("he hit me", "hits me").
 * - Multi-word phrases tolerate any run of whitespace between words.
 * - Curly apostrophes are normalized so "don’t want to live" matches.
 */
export const CRISIS_TERMS: readonly string[] = [
  // Suicide & wanting to die
  'suicide',
  'suicidal',
  'kill myself',
  'killing myself',
  'end my life',
  'ending my life',
  'end it all',
  'take my own life',
  'want to die',
  'wanted to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  "don't want to be alive",
  "don't want to live",
  'no reason to live',

  // Self-harm
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',
  'cut myself',
  'cutting myself',
  'self harm',
  'self-harm',

  // Abuse & violence in the relationship
  'abuse',
  'abused',
  'abusive',
  'abuses me',
  'domestic violence',
  'hits me',
  'hitting me',
  'he hit me',
  'she hit me',
  'they hit me',
  'beats me up',
  'beat me up',
  'he beats me',
  'she beats me',
  'threatens me',
  'threatened me',
  'threatening me',
  'rape',
  'raped',
  'sexual assault',
  'molested',

  // Fear for safety
  'afraid of him',
  'afraid of her',
  'afraid of them',
  'scared of him',
  'scared of her',
  'scared of them',
  'afraid for my safety',
  'fear for my safety',
  'not safe at home',
  'unsafe at home',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Precompiled once at module load. Word boundaries prevent substring hits
// ("harmless" never matches "harm myself"); interior whitespace in phrases
// matches any whitespace run.
const CRISIS_PATTERNS: readonly RegExp[] = CRISIS_TERMS.map(
  (term) => new RegExp(`\\b${escapeRegExp(term).replace(/\s+/g, '\\s+')}\\b`)
);

/**
 * Returns true when the text contains crisis language (self-harm, suicide,
 * abuse, violence, acute crisis). Case-insensitive, word-boundary aware.
 */
export function containsCrisisLanguage(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/[‘’]/g, "'");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

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

/**
 * Rate limiter for callable functions.
 * Uses a Firestore doc to track last call time per user.
 * Throws HttpsError if called too frequently.
 */
export async function enforceRateLimit(
  userId: string,
  action: string,
  cooldownSeconds: number
): Promise<void> {
  const ref = db.collection('rate_limits').doc(`${userId}_${action}`);
  const doc = await ref.get();

  if (doc.exists) {
    const lastCall = doc.data()?.last_call?.toDate();
    if (lastCall) {
      const elapsed = (Date.now() - lastCall.getTime()) / 1000;
      if (elapsed < cooldownSeconds) {
        const wait = Math.ceil(cooldownSeconds - elapsed);
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Please wait ${wait} seconds before trying again.`
        );
      }
    }
  }

  await ref.set({
    last_call: admin.firestore.FieldValue.serverTimestamp(),
    user_id: userId,
    action,
  });
}

// Expo Push Service transport (tokens minted by getExpoPushTokenAsync on the
// client). Raw APNs/FCM device tokens still go through admin.messaging().
const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

export function isExpoPushToken(token: string): boolean {
  return EXPO_PUSH_TOKEN_REGEX.test(token);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function removeInvalidPushTokens(userId: string, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    await db.collection('users').doc(userId).update({
      push_tokens: admin.firestore.FieldValue.arrayRemove(...tokens),
    });
  } catch (error) {
    console.error('Failed to remove invalid push tokens:', error);
  }
}

/**
 * Send via the Expo Push Service in chunks of <= 100 messages.
 * Tickets that come back DeviceNotRegistered trigger token cleanup,
 * mirroring the FCM invalid-token handling.
 */
async function sendExpoPushNotifications(
  userId: string,
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const tokensToRemove: string[] = [];

  for (const batch of chunk(tokens, EXPO_PUSH_CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            title: notification.title,
            body: notification.body,
            sound: 'default',
            ...(data ? { data } : {}),
          }))
        ),
      });

      if (!response.ok) {
        console.error(`Expo push request failed with HTTP ${response.status}`);
        continue;
      }

      const result = (await response.json()) as { data?: ExpoPushTicket[] };
      (result.data ?? []).forEach((ticket, idx) => {
        if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered' &&
          batch[idx]
        ) {
          tokensToRemove.push(batch[idx]);
        }
      });
    } catch (error) {
      // Don't use reportError here to avoid circular failure if Firestore is down
      console.error('Expo push request failed:', error);
    }
  }

  await removeInvalidPushTokens(userId, tokensToRemove);
}

/**
 * Send via FCM (legacy raw device tokens — e.g. Android FCM registration
 * tokens stored before the Expo Push Service migration).
 */
async function sendFcmPushNotifications(
  userId: string,
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const messages = tokens.map((t) => ({
    token: t,
    notification,
    ...(data ? { data } : {}),
  }));

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
    await removeInvalidPushTokens(userId, tokensToRemove);
  } catch (error) {
    // Don't use reportError here to avoid circular failure if Firestore is down
    console.error('Push notification failed:', error);
  }
}

export async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const tokens: string[] = (userData.push_tokens || []).filter(
    (t: unknown): t is string => typeof t === 'string' && t.length > 0
  );

  if (tokens.length === 0) return;

  const expoTokens = tokens.filter((t) => isExpoPushToken(t));
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));

  if (expoTokens.length > 0) {
    await sendExpoPushNotifications(userId, expoTokens, notification, data);
  }
  if (fcmTokens.length > 0) {
    await sendFcmPushNotifications(userId, fcmTokens, notification, data);
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

// ============================================
// ERROR REPORTING
// ============================================

/**
 * Logs a Cloud Function error to the `error_logs` Firestore collection.
 * Called from catch blocks across all functions to enable centralized alerting.
 */
export async function reportError(
  functionName: string,
  error: unknown,
  context?: { userId?: string; coupleId?: string; extra?: Record<string, unknown> }
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack || null : null;

  try {
    await db.collection('error_logs').add({
      function_name: functionName,
      message,
      stack,
      user_id: context?.userId || null,
      couple_id: context?.coupleId || null,
      extra: context?.extra || null,
      alerted: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    // Last resort: at least get it into Cloud Logging
    console.error(`[reportError] Failed to write error_log for ${functionName}:`, logError);
  }

  // Always log to Cloud Logging as well
  console.error(`[${functionName}]`, message);
}

// Re-export commonly needed items from dependencies
export { admin, functions };
