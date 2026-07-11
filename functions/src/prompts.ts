import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays, addDays, startOfWeek, getDay, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  db,
  APP_NAME,
  TONE_WEIGHTS,
  PULSE_WEIGHTS,
  DEFAULT_SCALE_CONFIG,
  getEffectiveTone,
  initializeDepthProgress,
  sendPushNotification,
  enforceRateLimit,
  reportError,
} from './shared';
import { activateDueFollowUp } from './followUps';

// ============================================
// PURE: Prompt Eligibility & Fallback (unit tested directly)
// ============================================

export interface PromptEligibilityContext {
  /** prompt_ids assigned to this couple in the last 30 days */
  recentPromptIds: readonly string[];
  /** couple's week number since linking (1-based) */
  weekNumber: number;
  /** 0=Sunday … 6=Saturday, in the couple's timezone */
  currentDayOfWeek: number;
  /** this week's assignment count per prompt type */
  weeklyTypeCounts: Readonly<Record<string, number>>;
  /** couple's depth_progress map — consulted for legacy text prompts only */
  depthProgress: Record<string, { level: string }>;
}

const DEPTH_ORDER = ['surface', 'medium', 'deep'];

export function isPromptEligible(
  promptId: string,
  data: admin.firestore.DocumentData,
  ctx: PromptEligibilityContext
): boolean {
  // Exclude recently used (30-day window)
  if (ctx.recentPromptIds.includes(promptId)) return false;
  // Apply week restriction
  if (data.week_restriction && ctx.weekNumber < data.week_restriction) return false;
  // Apply day preference
  if (data.day_preference && !data.day_preference.includes(ctx.currentDayOfWeek)) return false;
  // Apply max per week
  if (data.max_per_week != null && (ctx.weeklyTypeCounts[data.type] || 0) >= data.max_per_week) return false;
  // Depth progression applies to LEGACY TEXT PROMPTS ONLY. The v1 scored pool
  // is 100% scale-format with ZERO 'surface'-depth prompts, so gating scale
  // prompts on the couple's depth level — which starts at 'surface' and, with
  // no surface prompts available to complete, can never advance — permanently
  // locked every category the couple answered and exhausted the pool (the
  // content death spiral). Scale prompts are therefore exempt; text prompts,
  // if they ever return, keep the original surface → medium → deep gate.
  if (data.response_format !== 'scale') {
    const typeProgress = ctx.depthProgress[data.type];
    if (typeProgress) {
      const currentIdx = DEPTH_ORDER.indexOf(typeProgress.level);
      const promptIdx = DEPTH_ORDER.indexOf(data.emotional_depth || 'surface');
      if (promptIdx > currentIdx) return false;
    }
  }
  return true;
}

// Recency windows (days) tried in order by the empty-pool fallback. The final
// 1-day window is the hard floor: a prompt assigned yesterday or today is
// never re-served while any alternative exists.
const FALLBACK_RECENCY_WINDOWS_DAYS: readonly number[] = [30, 14, 7, 1];

/**
 * Empty-pool fallback: pick the least-recently-used prompt instead of a
 * deterministic first document (which re-served the SAME prompt every day
 * once the pool was exhausted). Tries a shrinking recency window — prompts
 * unused for 30 days, then 14, then 7, then 1 — and picks randomly within
 * the first window that has candidates. If every prompt was used within the
 * last day, it excludes the most recently assigned and picks randomly among
 * the least recently assigned, so the same prompt is never served two days
 * in a row while more than one prompt exists.
 *
 * `lastAssignedByPromptId` maps prompt_id → most recent assigned_date
 * (yyyy-MM-dd); prompts absent from the map are treated as never assigned.
 */
export function selectFallbackPrompt<T extends { id: string }>(
  pool: readonly T[],
  lastAssignedByPromptId: ReadonlyMap<string, string>,
  todayLocal: string,
  random: () => number = Math.random
): T | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const lastAssigned = (p: T): string => lastAssignedByPromptId.get(p.id) || '';
  const pick = (candidates: readonly T[]): T =>
    candidates[Math.min(Math.floor(random() * candidates.length), candidates.length - 1)];

  const today = parseISO(todayLocal);
  for (const days of FALLBACK_RECENCY_WINDOWS_DAYS) {
    const cutoff = format(subDays(today, days), 'yyyy-MM-dd');
    const candidates = pool.filter((p) => {
      const last = lastAssigned(p);
      return !last || last < cutoff;
    });
    if (candidates.length > 0) return pick(candidates);
  }

  // Every prompt was assigned within the last day. Drop the most recently
  // assigned prompt(s) and pick randomly among the least recently assigned.
  const newestDate = pool.reduce(
    (max, p) => (lastAssigned(p) > max ? lastAssigned(p) : max),
    ''
  );
  const notNewest = pool.filter((p) => lastAssigned(p) < newestDate);
  const finalPool = notNewest.length > 0 ? notNewest : pool;
  const oldestDate = finalPool.reduce(
    (min, p) => (lastAssigned(p) < min ? lastAssigned(p) : min),
    lastAssigned(finalPool[0])
  );
  return pick(finalPool.filter((p) => lastAssigned(p) === oldestDate));
}

// ============================================
// PRIVATE: Select Prompt for Couple
// ============================================

async function selectPromptForCouple(coupleId: string, timezone?: string): Promise<admin.firestore.DocumentData | null> {
  // Compute current day of week in the couple's timezone (0=Sunday, 6=Saturday)
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone || 'America/Los_Angeles');
  const currentDayOfWeek = getDay(zonedNow);

  // Get recent prompts (last 30 days)
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd');
  const recentAssignments = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', thirtyDaysAgo)
    .get();

  const recentPromptIds: string[] = [];
  // prompt_id → most recent assigned_date, for the least-recently-used fallback
  const lastAssignedByPromptId = new Map<string, string>();
  for (const doc of recentAssignments.docs) {
    const { prompt_id: promptId, assigned_date: assignedDate } = doc.data();
    recentPromptIds.push(promptId);
    const prev = lastAssignedByPromptId.get(promptId);
    if (!prev || assignedDate > prev) {
      lastAssignedByPromptId.set(promptId, assignedDate);
    }
  }

  // Get this week's assignments for max_per_week filtering
  const weekStartDate = format(startOfWeek(zonedNow, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const thisWeekAssignments = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', weekStartDate)
    .get();

  const weeklyTypeCounts: Record<string, number> = {};
  for (const doc of thisWeekAssignments.docs) {
    const type = doc.data().prompt_type;
    weeklyTypeCounts[type] = (weeklyTypeCounts[type] || 0) + 1;
  }

  // Get couple's week number
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  const coupleData = coupleDoc.data()!;
  const linkedAt = coupleData.linked_at?.toDate() || new Date();
  const weekNumber = Math.floor(
    (Date.now() - linkedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1;

  // Get active prompts
  const promptsQuery = db
    .collection('prompts')
    .where('status', '==', 'active');

  const promptsSnapshot = await promptsQuery.get();

  // v1: scored prompts only — when any scale-format prompts exist in the
  // active pool, restrict selection to them (text prompts are legacy content).
  const scaleDocs = promptsSnapshot.docs.filter(
    (doc) => doc.data().response_format === 'scale'
  );
  const poolDocs = scaleDocs.length > 0 ? scaleDocs : promptsSnapshot.docs;

  // Filter prompts (recency, week restriction, day preference, weekly caps,
  // and — for legacy text prompts only — depth progression)
  const eligibilityCtx: PromptEligibilityContext = {
    recentPromptIds,
    weekNumber,
    currentDayOfWeek,
    weeklyTypeCounts,
    depthProgress: coupleData.depth_progress || initializeDepthProgress(),
  };

  const eligiblePrompts = poolDocs
    .filter((doc) => isPromptEligible(doc.id, doc.data(), eligibilityCtx))
    .map((doc) => ({ id: doc.id, ...doc.data() }));

  if (eligiblePrompts.length === 0) {
    // Pool exhausted (every prompt used within 30 days, or blocked by
    // day/week caps). Serve the least-recently-used prompt with a shrinking
    // recency window — never the old deterministic poolDocs[0], which served
    // the SAME prompt every single day. Week restriction is still honored
    // when possible (new-couple gating matters more than variety), but never
    // at the cost of serving nothing.
    const pool = poolDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const weekEligible = pool.filter(
      (p: admin.firestore.DocumentData & { id: string }) =>
        !p.week_restriction || weekNumber >= p.week_restriction
    );
    return selectFallbackPrompt(
      weekEligible.length > 0 ? weekEligible : pool,
      lastAssignedByPromptId,
      format(zonedNow, 'yyyy-MM-dd')
    );
  }

  // Prefer pulse-based weights if available, fall back to tone calibration
  const pulseTier = coupleData.current_pulse_tier;
  let promptWeights: Record<string, number>;

  if (pulseTier && PULSE_WEIGHTS[pulseTier]) {
    promptWeights = PULSE_WEIGHTS[pulseTier];
  } else {
    // Fallback: fetch tone calibration from both users
    const memberIds: string[] = coupleData.member_ids || [];
    const tones: string[] = [];
    for (const memberId of memberIds) {
      const memberDoc = await db.collection('users').doc(memberId).get();
      if (memberDoc.exists) {
        tones.push(memberDoc.data()!.tone_calibration || 'solid');
      }
    }
    const effectiveTone = getEffectiveTone(tones);
    promptWeights = TONE_WEIGHTS[effectiveTone] || {};
  }

  // Weighted random selection based on pulse tier or tone
  const weights = eligiblePrompts.map((p: admin.firestore.DocumentData) => promptWeights[p.type] || 1);
  const totalWeight = weights.reduce((sum: number, w: number) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < eligiblePrompts.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return eligiblePrompts[i];
    }
  }

  return eligiblePrompts[eligiblePrompts.length - 1];
}

// ============================================
// PURE: Timezone-Local Dedupe Window (unit tested directly)
// ============================================

export interface AssignmentDateWindow {
  yesterday: string;
  today: string;
  tomorrow: string;
}

/**
 * Computes "today" and the ±1-day dedupe window (yyyy-MM-dd) in the given
 * timezone. Assignments are dated in the USER'S local day — never server UTC —
 * so a couple opening the app at 8 PM ET (midnight UTC) does not get
 * tomorrow's prompt early.
 */
export function assignmentDateWindow(
  timezone: string,
  now: Date = new Date()
): AssignmentDateWindow {
  const zonedNow = toZonedTime(now, timezone || 'UTC');
  return {
    yesterday: format(subDays(zonedNow, 1), 'yyyy-MM-dd'),
    today: format(zonedNow, 'yyyy-MM-dd'),
    tomorrow: format(addDays(zonedNow, 1), 'yyyy-MM-dd'),
  };
}

/** Shape of a window-query assignment doc as consumed by shouldDeliverDaily. */
export interface DailyDeliveryAssignment {
  status?: string;
  source?: string;
  assigned_date?: string;
  /** Firestore Timestamp | Date | epoch ms | missing — normalized defensively */
  created_at?: unknown;
}

/**
 * Minimum gap between two daily deliveries to the same couple. This is the
 * cross-timezone / midnight-rollover belt-and-braces the old ±1-day "any live
 * assignment blocks" window provided: partners' local dates can straddle
 * midnight, so date comparison alone could deliver twice within a few hours.
 */
export const DAILY_REDELIVERY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/** Normalize created_at (Firestore Timestamp | Date | epoch ms) to epoch ms; 0 = unknown/old. */
function createdAtMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (value as { toMillis: () => unknown }).toMillis();
    if (typeof ms === 'number' && Number.isFinite(ms)) return ms;
  }
  return 0;
}

/**
 * "The day always arrives" delivery guard (founder decision 2026-07-10).
 *
 * The OLD rule skipped daily delivery whenever ANY live (non-expired,
 * non-explore) assignment sat in the ±1-day window — so yesterday's 'partial'
 * (one partner hadn't answered) held TODAY'S prompt hostage to the slow
 * partner. The NEW rule: a fresh question arrives every day regardless;
 * sealed days coexist (max 2 open — expireStalePrompts sweeps
 * assigned_date < yesterday).
 *
 * Deliver = true UNLESS:
 *  1. Any non-explore assignment that is not 'expired' has
 *     assigned_date >= today — today's (or a timezone-shifted tomorrow's)
 *     day is already handled. A 'scheduled' follow-up dated today counts:
 *     activateDueFollowUp runs first and activates it.
 *  2. The NEWEST non-explore assignment (any status, by created_at) was
 *     created within the last DAILY_REDELIVERY_COOLDOWN_MS — a couple must
 *     never receive two daily prompts within ~20h even when partners' local
 *     dates straddle midnight. Missing created_at is treated as old.
 *
 * Yesterday's stale partial/delivered (created >= 20h ago, dated < today)
 * does NOT block — that is the whole point. Explore assignments are a
 * parallel track (partner-sent questions) and never block the daily prompt.
 */
export function shouldDeliverDaily(
  assignments: ReadonlyArray<DailyDeliveryAssignment>,
  todayISO: string,
  nowMs: number
): boolean {
  const daily = assignments.filter((a) => a.source !== 'explore');

  // Rule 1: today (or a tz-shifted tomorrow) already has a non-expired day.
  const currentDayHandled = daily.some(
    (a) => a.status !== 'expired' && (a.assigned_date || '') >= todayISO
  );
  if (currentDayHandled) return false;

  // Rule 2: ~20h cooldown since the newest daily-track assignment was created.
  const newestCreatedMs = daily.reduce(
    (max, a) => Math.max(max, createdAtMs(a.created_at)),
    0
  );
  if (newestCreatedMs > 0 && nowMs - newestCreatedMs < DAILY_REDELIVERY_COOLDOWN_MS) {
    return false;
  }

  return true;
}

// ============================================
// PRIVATE: Deliver Prompt to Couple
// ============================================

async function deliverPromptToCouple(coupleId: string, timezone: string): Promise<void> {
  // Compute the couple's local calendar day — the recipient's timezone is
  // authoritative, never server UTC (midnight UTC is 8 PM US/Eastern).
  const { yesterday, today, tomorrow } = assignmentDateWindow(timezone);

  // v1 follow-ups: a scheduled follow-up due today replaces the daily prompt
  // (one prompt per day rhythm). Must run before the delivery guard.
  const activatedFollowUp = await activateDueFollowUp(coupleId, today);
  if (activatedFollowUp) return;

  // "The day always arrives" (founder decision 2026-07-10): query the tz-local
  // [today-1, today+1] window — the same window the client queries — and let
  // shouldDeliverDaily decide. It folds the old exact-match same-date skip
  // (any non-expired assignment dated >= today blocks) with a ~20h creation
  // cooldown for cross-timezone rollover, while yesterday's stale partial no
  // longer holds today's prompt hostage. Explore assignments share
  // assigned_date but are a parallel track and never block the daily prompt.
  const windowAssignments = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', yesterday)
    .where('assigned_date', '<=', tomorrow)
    .get();

  const deliver = shouldDeliverDaily(
    windowAssignments.docs.map((doc) => doc.data()),
    today,
    Date.now()
  );
  if (!deliver) return;

  // Get couple info
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) return;
  // Initialize depth progress if not set
  const coupleInfo = coupleDoc.data()!;
  if (!coupleInfo.depth_progress) {
    await db.collection('couples').doc(coupleId).update({
      depth_progress: initializeDepthProgress(),
    });
  }

  // Select a prompt
  const prompt = await selectPromptForCouple(coupleId, timezone);
  if (!prompt) return;

  // Create assignment
  // v1: response_format/scale_config/category are denormalized here because
  // the client renders from the assignment doc, never the prompt doc.
  const responseFormat = prompt.response_format || 'text';
  await db.collection('prompt_assignments').add({
    couple_id: coupleId,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_hint: prompt.hint,
    prompt_type: prompt.type,
    requires_conversation: prompt.requires_conversation,
    category: prompt.category || null,
    response_format: responseFormat,
    scale_config:
      responseFormat === 'scale'
        ? prompt.scale_config || DEFAULT_SCALE_CONFIG
        : null,
    assignment_kind: 'daily',
    assigned_date: today,
    source: 'daily',
    delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    delivery_timezone: timezone,
    status: 'delivered',
    completed_at: null,
    response_count: 0,
    first_response_at: null,
    second_response_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send push notifications to both partners
  const coupleData = coupleDoc.data()!;
  for (const userId of coupleData.member_ids) {
    await sendPushNotification(userId, {
      title: APP_NAME,
      body: "Today's prompt is ready.",
    }, { type: 'prompt' });
  }
}

// ============================================
// SCHEDULED: Daily Prompt Delivery
// ============================================

export const deliverDailyPrompts = functions.runWith({ timeoutSeconds: 540, memory: '512MB' }).pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const now = new Date();

    // Find onboarded, active users with a couple
    const usersSnapshot = await db
      .collection('users')
      .where('is_onboarded', '==', true)
      .where('is_deleted', '==', false)
      .get();

    // Track delivered couples to avoid duplicate delivery
    const deliveredCouples = new Set<string>();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.couple_id) continue;
      if (deliveredCouples.has(userData.couple_id)) continue;

      // Parse notification time
      const [notifHour, notifMinute] = (userData.notification_time || '19:00')
        .split(':')
        .map(Number);

      // Convert current time to user's timezone
      const userTimezone = userData.timezone || 'America/Los_Angeles';
      const userLocalTime = formatInTimeZone(now, userTimezone, 'HH:mm');
      const [localHour, localMinute] = userLocalTime.split(':').map(Number);

      // Check if within 15-minute window
      if (
        localHour === notifHour &&
        localMinute >= notifMinute &&
        localMinute < notifMinute + 15
      ) {
        // Check prompt_frequency before delivering
        const coupleDoc = await db.collection('couples').doc(userData.couple_id).get();
        if (!coupleDoc.exists) continue;
        const coupleData = coupleDoc.data()!;
        const frequency = coupleData.prompt_frequency || 'daily';

        const zonedNow = toZonedTime(now, userTimezone);
        const currentDayOfWeek = getDay(zonedNow);

        if (frequency === 'weekdays' && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) {
          continue; // Skip weekends
        }
        if (frequency === 'weekends' && currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
          continue; // Skip weekdays
        }

        try {
          // Deliver dated in this user's timezone — their notification_time
          // window is what fired, so their local calendar day is "today".
          await deliverPromptToCouple(userData.couple_id, userTimezone);
          deliveredCouples.add(userData.couple_id);
        } catch (err) {
          await reportError('deliverDailyPrompts', err, { coupleId: userData.couple_id });
        }
      }
    }

    console.log(`Delivered prompts to ${deliveredCouples.size} couples`);
    return null;
  });

// ============================================
// CALLABLE: Trigger Prompt Delivery On-Demand
// ============================================

export const triggerPromptDelivery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  await enforceRateLimit(userId, 'triggerPrompt', 30); // 30s cooldown
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  if (!userData.couple_id) {
    throw new functions.https.HttpsError('failed-precondition', 'Not linked to a partner');
  }

  // "Today" is the CALLER's local calendar day. Fall back to UTC when the
  // user doc has no timezone rather than guessing a US timezone.
  const timezone: string = userData.timezone || 'UTC';
  await deliverPromptToCouple(userData.couple_id, timezone);

  return { success: true, coupleId: userData.couple_id };
});

// ============================================
// SCHEDULED: Expire Stale Prompts
// ============================================

export const expireStalePrompts = functions.runWith({ timeoutSeconds: 540, memory: '512MB' }).pubsub
  .schedule('every day 04:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    // Use yesterday (not today) so morning reminders have time to fire
    // for users in all timezones before assignments are expired
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Find assignments that are still 'delivered' or 'partial' from before yesterday
    const staleDelivered = await db
      .collection('prompt_assignments')
      .where('status', '==', 'delivered')
      .where('assigned_date', '<', yesterday)
      .get();

    const stalePartial = await db
      .collection('prompt_assignments')
      .where('status', '==', 'partial')
      .where('assigned_date', '<', yesterday)
      .get();

    // A partial explore assignment is a question one partner sent and the
    // other hasn't answered yet — it stays open indefinitely (the Today
    // "from your partner" card keeps it discoverable). Only unanswered
    // ('delivered') explore assignments — abandoned respond flows — expire
    // on the normal schedule.
    const staleDocs = [
      ...staleDelivered.docs,
      ...stalePartial.docs.filter((d) => d.data().source !== 'explore'),
    ];

    if (staleDocs.length === 0) {
      console.log('No stale assignments to expire');
      return null;
    }

    // Batch update in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < staleDocs.length; i += 500) {
      const batch = db.batch();
      const chunk = staleDocs.slice(i, i + 500);
      for (const doc of chunk) {
        batch.update(doc.ref, {
          status: 'expired',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    console.log(`Expired ${staleDocs.length} stale assignments`);
    return null;
  });

// ============================================
// SCHEDULED: Check Streak Breaks
// ============================================

export const checkStreakBreaks = functions.runWith({ timeoutSeconds: 540, memory: '512MB' }).pubsub
  .schedule('every day 04:30')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Find couples with active streaks that didn't complete yesterday
    const couplesSnapshot = await db
      .collection('couples')
      .where('status', '==', 'active')
      .where('current_streak', '>', 0)
      .get();

    let brokenStreaks = 0;

    for (const coupleDoc of couplesSnapshot.docs) {
      const coupleData = coupleDoc.data();
      const lastStreakDate = coupleData.last_streak_date;

      // If last streak date is before yesterday, streak is broken
      if (lastStreakDate && lastStreakDate < yesterday) {
        const endedAt = coupleData.current_streak;
        await coupleDoc.ref.update({
          current_streak: 0,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify both users
        for (const userId of coupleData.member_ids) {
          await sendPushNotification(userId, {
            title: APP_NAME,
            body: `Your ${endedAt}-day streak ended. Start a new one today!`,
          }, { type: 'prompt' });
        }
        brokenStreaks++;
      }
    }

    console.log(`Reset ${brokenStreaks} broken streaks`);
    return null;
  });

// ============================================
// SCHEDULED: Graduate Prompts (Daily 3:30 AM PT)
// ============================================

export const graduatePrompts = functions.runWith({ timeoutSeconds: 540, memory: '512MB' }).pubsub
  .schedule('every day 03:30')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const testingPromptsSnap = await db
      .collection('prompts')
      .where('status', '==', 'testing')
      .get();

    let graduated = 0;
    let retired = 0;

    for (const promptDoc of testingPromptsSnap.docs) {
      const data = promptDoc.data();
      const totalAssigned = data.times_assigned || 0;

      // Need at least 10 assignments before making decisions
      if (totalAssigned < 10) continue;

      const completionRate = data.completion_rate || 0;
      const positiveRate = data.positive_response_rate || 0;

      // Auto-promote: completion >= 75% AND positive >= 60%
      if (completionRate >= 0.75 && positiveRate >= 0.6) {
        await promptDoc.ref.update({
          status: 'active',
          status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        graduated++;
        continue;
      }

      // Auto-retire: completion < 30%
      if (completionRate < 0.3) {
        await promptDoc.ref.update({
          status: 'retired',
          status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        retired++;
        continue;
      }
    }

    console.log(`Prompt graduation: ${graduated} graduated, ${retired} retired`);
    return null;
  });
