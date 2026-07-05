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
    // Don't use reportError here to avoid circular failure if Firestore is down
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
