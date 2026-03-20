import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays, startOfWeek, getDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  db,
  APP_NAME,
  TONE_WEIGHTS,
  PULSE_WEIGHTS,
  getEffectiveTone,
  initializeDepthProgress,
  sendPushNotification,
} from './shared';

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

  const recentPromptIds = recentAssignments.docs.map(
    (doc) => doc.data().prompt_id
  );

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

  // Filter and weight prompts
  const eligiblePrompts = promptsSnapshot.docs
    .filter((doc) => {
      const data = doc.data();
      // Exclude recently used
      if (recentPromptIds.includes(doc.id)) return false;
      // Apply week restriction
      if (data.week_restriction && weekNumber < data.week_restriction) return false;
      // Apply day preference
      if (data.day_preference && !data.day_preference.includes(currentDayOfWeek)) return false;
      // Apply max per week
      if (data.max_per_week != null && (weeklyTypeCounts[data.type] || 0) >= data.max_per_week) return false;
      // Apply depth progression
      const depthProgress = coupleData.depth_progress || initializeDepthProgress();
      const typeProgress = depthProgress[data.type];
      if (typeProgress) {
        const depthOrder = ['surface', 'medium', 'deep'];
        const currentIdx = depthOrder.indexOf(typeProgress.level);
        const promptIdx = depthOrder.indexOf(data.emotional_depth || 'surface');
        if (promptIdx > currentIdx) return false;
      }
      return true;
    })
    .map((doc) => ({ id: doc.id, ...doc.data() }));

  if (eligiblePrompts.length === 0) {
    // Fallback: use any active prompt
    const fallback = promptsSnapshot.docs[0];
    return fallback ? { id: fallback.id, ...fallback.data() } : null;
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
// PRIVATE: Get Couple Timezone
// ============================================

async function getCoupleTimezone(coupleId: string): Promise<string> {
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) return 'America/Los_Angeles';
  const memberIds = coupleDoc.data()!.member_ids || [];
  if (memberIds.length === 0) return 'America/Los_Angeles';
  const userDoc = await db.collection('users').doc(memberIds[0]).get();
  return userDoc.data()?.timezone || 'America/Los_Angeles';
}

// ============================================
// PRIVATE: Deliver Prompt to Couple
// ============================================

async function deliverPromptToCouple(coupleId: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Check if already delivered today
  const existingAssignment = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '==', today)
    .limit(1)
    .get();

  if (!existingAssignment.empty) return;

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

  // Get couple timezone for selection + assignment
  const timezone = await getCoupleTimezone(coupleId);

  // Select a prompt
  const prompt = await selectPromptForCouple(coupleId, timezone);
  if (!prompt) return;

  // Create assignment
  await db.collection('prompt_assignments').add({
    couple_id: coupleId,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_hint: prompt.hint,
    prompt_type: prompt.type,
    requires_conversation: prompt.requires_conversation,
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
    });
  }
}

// ============================================
// SCHEDULED: Daily Prompt Delivery
// ============================================

export const deliverDailyPrompts = functions.pubsub
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
          await deliverPromptToCouple(userData.couple_id);
          deliveredCouples.add(userData.couple_id);
        } catch (err) {
          console.error(`Failed to deliver prompt to couple ${userData.couple_id}:`, err);
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
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  if (!userData.couple_id) {
    throw new functions.https.HttpsError('failed-precondition', 'Not linked to a partner');
  }

  await deliverPromptToCouple(userData.couple_id);

  return { success: true, coupleId: userData.couple_id };
});

// ============================================
// SCHEDULED: Expire Stale Prompts
// ============================================

export const expireStalePrompts = functions.pubsub
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

    const staleDocs = [...staleDelivered.docs, ...stalePartial.docs];

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

export const checkStreakBreaks = functions.pubsub
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
          });
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

export const graduatePrompts = functions.pubsub
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
