import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import { format, subDays, startOfWeek, getDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

admin.initializeApp();

const db = admin.firestore();
const APP_NAME = 'Stoke';

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

async function getCoupleTimezone(coupleId: string): Promise<string> {
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) return 'America/Los_Angeles';
  const memberIds = coupleDoc.data()!.member_ids || [];
  if (memberIds.length === 0) return 'America/Los_Angeles';
  const userDoc = await db.collection('users').doc(memberIds[0]).get();
  return userDoc.data()?.timezone || 'America/Los_Angeles';
}

// Tone weight multipliers per prompt type
const TONE_WEIGHTS: Record<string, Record<string, number>> = {
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

// Returns the "more cautious" tone: struggling > distant > solid
function getEffectiveTone(tones: string[]): string {
  if (tones.includes('struggling')) return 'struggling';
  if (tones.includes('distant')) return 'distant';
  return 'solid';
}

async function selectPromptForCouple(coupleId: string, timezone?: string): Promise<any> {
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
  let promptsQuery = db
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
      return true;
    })
    .map((doc) => ({ id: doc.id, ...doc.data() }));

  if (eligiblePrompts.length === 0) {
    // Fallback: use any active prompt
    const fallback = promptsSnapshot.docs[0];
    return fallback ? { id: fallback.id, ...fallback.data() } : null;
  }

  // Fetch tone calibration from both users
  const memberIds: string[] = coupleData.member_ids || [];
  const tones: string[] = [];
  for (const memberId of memberIds) {
    const memberDoc = await db.collection('users').doc(memberId).get();
    if (memberDoc.exists) {
      tones.push(memberDoc.data()!.tone_calibration || 'solid');
    }
  }
  const effectiveTone = getEffectiveTone(tones);
  const toneWeights = TONE_WEIGHTS[effectiveTone] || {};

  // Weighted random selection based on tone
  const weights = eligiblePrompts.map((p: any) => toneWeights[p.type] || 1);
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

async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const tokens = userData.push_tokens || [];

  if (tokens.length === 0) return;

  const messages = tokens.map((t: any) => ({
    token: t.token,
    notification,
    ...(data ? { data } : {}),
  }));

  try {
    await admin.messaging().sendEach(messages);
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}

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
// SCHEDULED: Weekly Metrics Aggregation
// ============================================

export const aggregateWeeklyMetrics = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    // Update prompt metrics
    const promptsSnapshot = await db
      .collection('prompts')
      .where('status', 'in', ['active', 'testing'])
      .get();

    for (const promptDoc of promptsSnapshot.docs) {
      const assignmentsSnapshot = await db
        .collection('prompt_assignments')
        .where('prompt_id', '==', promptDoc.id)
        .where('delivered_at', '>=', subDays(new Date(), 28))
        .get();

      const total = assignmentsSnapshot.size;
      const completed = assignmentsSnapshot.docs.filter(
        (d) => d.data().status === 'completed'
      ).length;

      const completionRate = total > 0 ? completed / total : 0;

      // Get positive response rate
      const responsesSnapshot = await db
        .collection('prompt_responses')
        .where('prompt_id', '==', promptDoc.id)
        .where('emotional_response', '!=', null)
        .get();

      const totalResponses = responsesSnapshot.size;
      const positiveResponses = responsesSnapshot.docs.filter(
        (d) => d.data().emotional_response === 'positive'
      ).length;

      const positiveRate = totalResponses > 0 ? positiveResponses / totalResponses : 0;

      await promptDoc.ref.update({
        times_assigned: total,
        times_completed: completed,
        completion_rate: completionRate,
        positive_response_rate: positiveRate,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Store WMEER weekly snapshot
    const currentWeek = format(new Date(), "yyyy-'W'ww");
    const activeCouplesSnap = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    const activeCouplesCount = activeCouplesSnap.size;
    let meetingCriteria = 0;
    let weeklyCompletions = 0;

    for (const coupleDoc of activeCouplesSnap.docs) {
      const completionsSnap = await db
        .collection('prompt_completions')
        .where('couple_id', '==', coupleDoc.id)
        .where('week', '==', currentWeek)
        .get();

      weeklyCompletions += completionsSnap.size;
      if (completionsSnap.size >= 3) meetingCriteria++;
    }

    const weeklyWmeer = activeCouplesCount > 0 ? meetingCriteria / activeCouplesCount : 0;

    await db.collection('metrics').doc(`wmeer_${currentWeek}`).set({
      type: 'wmeer_weekly',
      week: currentWeek,
      wmeer: weeklyWmeer,
      active_couples: activeCouplesCount,
      couples_meeting_criteria: meetingCriteria,
      total_completions: weeklyCompletions,
      computed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Weekly metrics aggregation complete');
    return null;
  });

// ============================================
// SCHEDULED: Weekly Recap Notification
// ============================================

export const sendWeeklyRecaps = functions.pubsub
  .schedule('every sunday 18:00')
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    const weekString = format(new Date(), "yyyy-'W'ww");

    const couplesSnapshot = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    for (const coupleDoc of couplesSnapshot.docs) {
      // Check if they have completions this week
      const completionsSnapshot = await db
        .collection('prompt_completions')
        .where('couple_id', '==', coupleDoc.id)
        .where('week', '==', weekString)
        .limit(1)
        .get();

      if (!completionsSnapshot.empty) {
        const coupleData = coupleDoc.data();
        for (const userId of coupleData.member_ids) {
          await sendPushNotification(userId, {
            title: APP_NAME,
            body: 'Your week together is ready.',
          });
        }
      }
    }

    return null;
  });

// ============================================
// FIRESTORE TRIGGER: On Response Submitted
// ============================================

export const onResponseSubmitted = functions.firestore
  .document('prompt_responses/{responseId}')
  .onCreate(async (snap, context) => {
    const response = snap.data();
    if (response.status !== 'submitted') return;

    const assignmentRef = db.collection('prompt_assignments').doc(response.assignment_id);
    const assignmentDoc = await assignmentRef.get();
    const assignment = assignmentDoc.data()!;

    // Check if this completes the prompt
    if (assignment.response_count === 1) {
      // This is the second response - create completion
      const responsesSnapshot = await db
        .collection('prompt_responses')
        .where('assignment_id', '==', response.assignment_id)
        .get();

      const responses = responsesSnapshot.docs.map((doc) => ({
        user_id: doc.data().user_id,
        response_text: doc.data().response_text,
        response_text_encrypted: doc.data().response_text_encrypted || null,
        image_url: doc.data().image_url || null,
        submitted_at: doc.data().submitted_at,
      }));

      // Calculate time between first response and completion
      const timestamps = responses
        .map((r) => r.submitted_at?.toDate?.() || r.submitted_at)
        .filter((t): t is Date => t instanceof Date)
        .sort((a, b) => a.getTime() - b.getTime());

      const timeToCompleteSeconds =
        timestamps.length >= 2
          ? Math.round((timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime()) / 1000)
          : 0;

      await db.collection('prompt_completions').doc(response.assignment_id).set({
        assignment_id: response.assignment_id,
        couple_id: response.couple_id,
        prompt_id: response.prompt_id,
        responses,
        time_to_complete_seconds: timeToCompleteSeconds,
        total_response_length: responsesSnapshot.docs.reduce(
          (sum, d) => sum + (d.data().response_length || 0),
          0
        ),
        emotional_responses: [],
        talked_about_it: false,
        week: format(new Date(), "yyyy-'W'ww"),
        is_memory_saved: false,
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update couple stats + streaks
      const streakCoupleDoc = await db.collection('couples').doc(response.couple_id).get();
      const streakCoupleData = streakCoupleDoc.data() || {};
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const lastStreakDate = streakCoupleData.last_streak_date || null;
      let currentStreak = streakCoupleData.current_streak || 0;
      let longestStreak = streakCoupleData.longest_streak || 0;

      if (lastStreakDate === today) {
        // Already counted today, no change
      } else if (lastStreakDate === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(currentStreak, longestStreak);

      await db.collection('couples').doc(response.couple_id).update({
        total_completions: admin.firestore.FieldValue.increment(1),
        current_week_completions: admin.firestore.FieldValue.increment(1),
        last_completion_at: admin.firestore.FieldValue.serverTimestamp(),
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_streak_date: today,
      });

      // Log event
      await logEvent('prompt_completed', response.user_id, response.couple_id, {
        assignment_id: response.assignment_id,
        prompt_id: response.prompt_id,
      });

      // Notify first responder that both have answered
      const firstResponderId = assignment.first_responder_id;
      if (firstResponderId && firstResponderId !== response.user_id) {
        const secondResponderDoc = await db.collection('users').doc(response.user_id).get();
        const secondResponderName = secondResponderDoc.data()?.display_name || 'Your partner';

        await sendPushNotification(firstResponderId, {
          title: secondResponderName,
          body: 'answered too. Tap to reveal both responses.',
        });
      }
    } else {
      // First response - track first responder and notify partner
      await assignmentRef.update({
        first_responder_id: response.user_id,
      });

      const coupleDoc = await db.collection('couples').doc(response.couple_id).get();
      const coupleData = coupleDoc.data()!;
      const partnerId = coupleData.member_ids.find(
        (id: string) => id !== response.user_id
      );

      if (partnerId) {
        // Check partner's notification preference (default true)
        const partnerDoc = await db.collection('users').doc(partnerId).get();
        const partnerData = partnerDoc.data();
        if (partnerData?.notify_partner_response !== false) {
          const responderDoc = await db.collection('users').doc(response.user_id).get();
          const responderName = responderDoc.data()?.display_name || 'Your partner';

          await sendPushNotification(partnerId, {
            title: responderName,
            body: "answered today's prompt. Your turn \u2014 takes 2 minutes.",
          });

          await logEvent('partner_notified', response.user_id, response.couple_id, {
            notified_user_id: partnerId,
          });
        }
      }
    }

    // Log response event
    await logEvent('prompt_response_submitted', response.user_id, response.couple_id, {
      assignment_id: response.assignment_id,
      prompt_id: response.prompt_id,
      response_length: response.response_length || 0,
    });

    return null;
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
// SCHEDULED: Send Response Reminders
// ============================================

export const sendResponseReminders = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');

    // Query pending assignments from today AND yesterday (for morning reminders)
    const [todayDelivered, todayPartial, yesterdayDelivered, yesterdayPartial] =
      await Promise.all([
        db.collection('prompt_assignments')
          .where('status', '==', 'delivered')
          .where('assigned_date', '==', today)
          .get(),
        db.collection('prompt_assignments')
          .where('status', '==', 'partial')
          .where('assigned_date', '==', today)
          .get(),
        db.collection('prompt_assignments')
          .where('status', '==', 'delivered')
          .where('assigned_date', '==', yesterday)
          .get(),
        db.collection('prompt_assignments')
          .where('status', '==', 'partial')
          .where('assigned_date', '==', yesterday)
          .get(),
      ]);

    const pendingAssignments = [
      ...todayDelivered.docs,
      ...todayPartial.docs,
      ...yesterdayDelivered.docs,
      ...yesterdayPartial.docs,
    ];

    let remindersSent = 0;

    for (const assignmentDoc of pendingAssignments) {
      const assignment = assignmentDoc.data();
      const deliveredAt = assignment.delivered_at?.toDate?.();
      if (!deliveredAt) continue;

      const remindersSentMap: Record<string, number> =
        assignment.reminders_sent || {};

      // Get couple members
      const coupleDoc = await db.collection('couples').doc(assignment.couple_id).get();
      if (!coupleDoc.exists) continue;
      const memberIds: string[] = coupleDoc.data()!.member_ids;

      // Find who has already responded
      const responsesSnapshot = await db
        .collection('prompt_responses')
        .where('assignment_id', '==', assignmentDoc.id)
        .get();
      const respondedUserIds = new Set(
        responsesSnapshot.docs.map((d) => d.data().user_id)
      );

      const hoursSinceDelivery =
        (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      for (const userId of memberIds) {
        if (respondedUserIds.has(userId)) continue;

        const userReminderCount = remindersSentMap[userId] || 0;

        // Max 2 reminders per user per assignment
        if (userReminderCount >= 2) continue;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) continue;
        const userData = userDoc.data()!;

        // Respect remind_to_respond preference (default true)
        if (userData.remind_to_respond === false) continue;

        let shouldSend = false;
        let body = '';

        // Reminder 1: 4-6 hours after delivery
        if (
          userReminderCount < 1 &&
          hoursSinceDelivery >= 4 &&
          hoursSinceDelivery < 6
        ) {
          shouldSend = true;
          body = 'Still time to respond today.';
        }

        // Reminder 2: Next morning, 8-10 AM in user's local timezone
        if (
          userReminderCount === 1 &&
          hoursSinceDelivery >= 8
        ) {
          const userTimezone = userData.timezone || 'America/Los_Angeles';
          const localHour = parseInt(
            formatInTimeZone(now, userTimezone, 'HH'),
            10
          );
          if (localHour >= 8 && localHour < 10) {
            shouldSend = true;
            body = "Yesterday's prompt is still open.";
          }
        }

        if (shouldSend) {
          await sendPushNotification(userId, {
            title: APP_NAME,
            body,
          });

          // Atomically track the reminder sent for this user
          await assignmentDoc.ref.update({
            [`reminders_sent.${userId}`]: userReminderCount + 1,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });

          remindersSent++;
        }
      }
    }

    console.log(`Sent ${remindersSent} response reminders`);
    return null;
  });

// ============================================
// CALLABLE: Dashboard Metrics (Admin)
// ============================================

export const getDashboardMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const now = new Date();
  const currentWeek = format(now, "yyyy-'W'ww");

  // --- WMEER Calculation ---
  const activeCouplesSnap = await db
    .collection('couples')
    .where('status', '==', 'active')
    .get();

  const activeCouples = activeCouplesSnap.size;
  let couplesMeetingCriteria = 0;
  let totalCompletionsThisWeek = 0;

  for (const coupleDoc of activeCouplesSnap.docs) {
    const completionsSnap = await db
      .collection('prompt_completions')
      .where('couple_id', '==', coupleDoc.id)
      .where('week', '==', currentWeek)
      .get();

    totalCompletionsThisWeek += completionsSnap.size;
    if (completionsSnap.size >= 3) {
      couplesMeetingCriteria++;
    }
  }

  const wmeer = activeCouples > 0 ? couplesMeetingCriteria / activeCouples : 0;

  // --- WMEER Trend (last 12 weeks) ---
  const trendSnap = await db
    .collection('metrics')
    .where('type', '==', 'wmeer_weekly')
    .orderBy('week', 'desc')
    .limit(12)
    .get();

  const wmeerTrend = trendSnap.docs
    .map((d) => ({ week: d.data().week, value: d.data().wmeer }))
    .reverse();

  // --- Retention ---
  // Simple d1/d7 calculation for the most recent cohort
  const latestCohort = activeCouplesSnap.docs
    .map((d) => d.data().cohort_week)
    .filter(Boolean)
    .sort()
    .pop() || currentWeek;

  const cohortCouples = activeCouplesSnap.docs.filter(
    (d) => d.data().cohort_week === latestCohort
  );
  const cohortSize = cohortCouples.length;

  let d1Active = 0;
  let d7Active = 0;

  for (const coupleDoc of cohortCouples) {
    const linkedAt = coupleDoc.data().linked_at?.toDate();
    if (!linkedAt) continue;

    const d1Snap = await db
      .collection('prompt_completions')
      .where('couple_id', '==', coupleDoc.id)
      .limit(1)
      .get();

    // Simplified: check if they have any completion
    if (!d1Snap.empty) d1Active++;

    const d7Date = new Date(linkedAt.getTime() + 7 * 86400000);
    if (d7Date <= now) {
      const d7CompletionSnap = await db
        .collection('prompt_completions')
        .where('couple_id', '==', coupleDoc.id)
        .limit(2)
        .get();
      if (d7CompletionSnap.size >= 2) d7Active++;
    }
  }

  // --- Prompt Performance ---
  const promptsSnap = await db
    .collection('prompts')
    .where('status', 'in', ['active', 'testing'])
    .get();

  const promptPerformance = promptsSnap.docs.map((doc) => {
    const d = doc.data();
    const completionRate = d.completion_rate || 0;
    const positiveRate = d.positive_response_rate || 0;

    let recommendation: string | null = null;
    if (d.times_assigned >= 5) {
      if (completionRate > 0.8 && positiveRate > 0.7) recommendation = 'graduate';
      else if (completionRate < 0.3) recommendation = 'retire';
      else if (positiveRate < 0.4) recommendation = 'rewrite';
      else recommendation = 'keep_testing';
    }

    return {
      prompt_id: doc.id,
      text: d.text,
      type: d.type,
      completion_rate: completionRate,
      positive_rate: positiveRate,
      recommendation,
    };
  });

  // --- Churn Risk Summary ---
  let churnLow = 0;
  let churnMedium = 0;
  let churnHigh = 0;
  for (const coupleDoc of activeCouplesSnap.docs) {
    const risk = coupleDoc.data().churn_risk_level;
    if (risk === 'low') churnLow++;
    else if (risk === 'medium') churnMedium++;
    else if (risk === 'high') churnHigh++;
  }

  return {
    wmeer: {
      week: currentWeek,
      wmeer,
      active_couples: activeCouples,
      couples_meeting_criteria: couplesMeetingCriteria,
      total_completions: totalCompletionsThisWeek,
      completion_rate: activeCouples > 0 ? totalCompletionsThisWeek / (activeCouples * 7) : 0,
    },
    wmeer_trend: wmeerTrend,
    retention: {
      cohort: latestCohort,
      d1: cohortSize > 0 ? d1Active / cohortSize : 0,
      d7: cohortSize > 0 ? d7Active / cohortSize : 0,
      w4: null,
      w12: null,
    },
    prompt_performance: promptPerformance,
    churn_risk: {
      low: churnLow,
      medium: churnMedium,
      high: churnHigh,
      total_at_risk: churnLow + churnMedium + churnHigh,
    },
  };
});

// ============================================
// CALLABLE: Assign Experiment Variant
// ============================================

export const assignExperimentVariant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { experimentId } = data;
  if (!experimentId) {
    throw new functions.https.HttpsError('invalid-argument', 'experimentId required');
  }

  const userId = context.auth.uid;

  // Check experiment exists and is running
  const experimentDoc = await db.collection('experiments').doc(experimentId).get();
  if (!experimentDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Experiment not found');
  }

  const experiment = experimentDoc.data()!;
  if (experiment.status !== 'running') {
    return { experimentId, variant: null, isInExperiment: false };
  }

  // Check existing assignment
  const existingAssignment = await db
    .collection('experiments')
    .doc(experimentId)
    .collection('assignments')
    .doc(userId)
    .get();

  if (existingAssignment.exists) {
    const assignmentData = existingAssignment.data()!;
    return {
      experimentId,
      variant: assignmentData.variant,
      isInExperiment: assignmentData.is_in_experiment,
    };
  }

  // Determine if user is in the experiment (based on target_percentage)
  const isInExperiment = Math.random() * 100 < (experiment.target_percentage || 100);

  let variant: string | null = null;
  if (isInExperiment) {
    // Weighted random variant selection
    const variants: { name: string; weight: number }[] = experiment.variants || [];
    const totalWeight = variants.reduce((sum: number, v: { weight: number }) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    for (const v of variants) {
      random -= v.weight;
      if (random <= 0) {
        variant = v.name;
        break;
      }
    }
    if (!variant && variants.length > 0) {
      variant = variants[variants.length - 1].name;
    }
  }

  // Store assignment
  await db
    .collection('experiments')
    .doc(experimentId)
    .collection('assignments')
    .doc(userId)
    .set({
      user_id: userId,
      variant,
      is_in_experiment: isInExperiment,
      assigned_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  return { experimentId, variant, isInExperiment };
});

// ============================================
// CALLABLE: Create Experiment (Admin only)
// ============================================

export const createExperiment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Check admin
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { name, description, type, variants, targetPercentage, primaryMetric, secondaryMetrics } = data;

  if (!name || !type || !variants || !primaryMetric) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const experimentRef = await db.collection('experiments').add({
    name,
    description: description || '',
    type,
    status: 'draft',
    variants,
    target_percentage: targetPercentage || 100,
    cohort_filter: null,
    primary_metric: primaryMetric,
    secondary_metrics: secondaryMetrics || [],
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    started_at: null,
    ended_at: null,
  });

  return { experimentId: experimentRef.id };
});

// ============================================
// HTTPS: RevenueCat Webhook
// ============================================

export const revenueCatWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Validate authorization header
  const authHeader = req.headers['authorization'];
  const expectedKey = functions.config().revenuecat?.webhook_key;
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    res.status(401).send('Unauthorized');
    return;
  }

  const event = req.body?.event;
  if (!event) {
    res.status(400).send('Missing event');
    return;
  }

  const appUserId = event.app_user_id;
  const eventType = event.type;

  if (!appUserId) {
    res.status(400).send('Missing app_user_id');
    return;
  }

  try {
    const subscriptionRef = db.collection('subscriptions').doc(appUserId);

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        await subscriptionRef.set({
          user_id: appUserId,
          status: 'active',
          plan: 'premium',
          platform: event.store || 'unknown',
          expires_at: event.expiration_at_ms
            ? admin.firestore.Timestamp.fromMillis(event.expiration_at_ms)
            : null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        break;

      case 'CANCELLATION':
        await subscriptionRef.set({
          user_id: appUserId,
          status: 'cancelled',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        break;

      case 'EXPIRATION':
        await subscriptionRef.set({
          user_id: appUserId,
          status: 'expired',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        break;

      default:
        // Ignore other event types
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ============================================
// HELPER: Log Analytics Event
// ============================================

async function logEvent(
  eventName: string,
  userId: string,
  coupleId: string | null,
  properties: Record<string, any>
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
// CALLABLE: Delete Account
// ============================================

export const deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  const now = new Date();
  const scheduledPurgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Mark user as deleted with 30-day purge window
  await userRef.update({
    is_deleted: true,
    deleted_at: admin.firestore.FieldValue.serverTimestamp(),
    scheduled_purge_at: admin.firestore.Timestamp.fromDate(scheduledPurgeAt),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Handle couple disconnection
  if (userData.couple_id) {
    const coupleRef = db.collection('couples').doc(userData.couple_id);
    const coupleDoc = await coupleRef.get();

    if (coupleDoc.exists) {
      const coupleData = coupleDoc.data()!;

      // Set couple status to deleted
      await coupleRef.update({
        status: 'deleted',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Null out couple_id for both users
      const memberIds: string[] = coupleData.member_ids || [];
      for (const memberId of memberIds) {
        await db.collection('users').doc(memberId).update({
          couple_id: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Notify partner
      const partnerId = memberIds.find((id: string) => id !== userId);
      if (partnerId) {
        await sendPushNotification(partnerId, {
          title: APP_NAME,
          body: 'Your partner has left Stoke.',
        });
      }
    }
  }

  // Delete Firebase Auth account
  try {
    await admin.auth().deleteUser(userId);
  } catch (error) {
    console.error('Failed to delete Firebase Auth user:', error);
  }

  await logEvent('account_deleted', userId, userData.couple_id || null, {});

  return {
    success: true,
    purge_date: scheduledPurgeAt.toISOString(),
  };
});

// ============================================
// SCHEDULED: Cleanup Deleted Accounts (Daily 3 AM PT)
// ============================================

export const cleanupDeletedAccounts = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    // Find users past their purge date
    const deletedUsers = await db
      .collection('users')
      .where('is_deleted', '==', true)
      .where('scheduled_purge_at', '<=', now)
      .get();

    let purgedCount = 0;

    for (const userDoc of deletedUsers.docs) {
      const userId = userDoc.id;

      try {
        // Delete prompt_responses and their attached images
        const responsesSnap = await db
          .collection('prompt_responses')
          .where('user_id', '==', userId)
          .get();
        for (const responseDoc of responsesSnap.docs) {
          const rData = responseDoc.data();
          if (rData.image_url && rData.couple_id && rData.assignment_id) {
            try {
              const bucket = admin.storage().bucket();
              await bucket.file(`responses/${rData.couple_id}/${rData.assignment_id}/${userId}.jpg`).delete();
            } catch (e) {
              // Image may not exist
            }
          }
          await responseDoc.ref.delete();
        }

        // Delete events
        const eventsSnap = await db
          .collection('events')
          .where('user_id', '==', userId)
          .get();
        for (const doc of eventsSnap.docs) {
          await doc.ref.delete();
        }

        // Delete chat messages and images
        const userData = userDoc.data();
        if (userData?.couple_id) {
          const chatSnap = await db
            .collection('couples')
            .doc(userData.couple_id)
            .collection('messages')
            .where('sender_id', '==', userId)
            .get();
          for (const chatDoc of chatSnap.docs) {
            const chatData = chatDoc.data();
            if (chatData.image_url) {
              try {
                const bucket = admin.storage().bucket();
                const urlPath = new URL(chatData.image_url).pathname;
                const filePath = decodeURIComponent(urlPath.split('/o/')[1]?.split('?')[0] || '');
                if (filePath) await bucket.file(filePath).delete();
              } catch (e) {
                // Image may not exist
              }
            }
            await chatDoc.ref.delete();
          }
        }

        // Delete profile photo from Storage
        try {
          const bucket = admin.storage().bucket();
          await bucket.file(`users/${userId}/profile.jpg`).delete();
        } catch (e) {
          // Photo may not exist
        }

        // Delete the user doc itself
        await userDoc.ref.delete();

        purgedCount++;
      } catch (error) {
        console.error(`Failed to purge user ${userId}:`, error);
      }
    }

    console.log(`Purged ${purgedCount} deleted accounts`);
    return null;
  });

// ============================================
// CALLABLE: Export User Data
// ============================================

export const exportUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;

  // Rate limit: 1 export per 24 hours
  if (userData.last_export_at) {
    const lastExport = userData.last_export_at.toDate();
    const hoursSince = (Date.now() - lastExport.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Data export is available once every 24 hours.'
      );
    }
  }

  // User profile (exclude push_tokens)
  const { push_tokens, ...profileData } = userData;

  // Prompt responses
  const responsesSnap = await db
    .collection('prompt_responses')
    .where('user_id', '==', userId)
    .get();
  const responses = responsesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Events
  const eventsSnap = await db
    .collection('events')
    .where('user_id', '==', userId)
    .get();
  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Memories (saved by this user's couple)
  let memories: any[] = [];
  if (userData.couple_id) {
    const memoriesSnap = await db
      .collection('memory_artifacts')
      .where('couple_id', '==', userData.couple_id)
      .get();
    memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Goals
  let goals: any[] = [];
  if (userData.couple_id) {
    const goalsSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('goals')
      .get();
    goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Wishlist items
  let wishlistItems: any[] = [];
  if (userData.couple_id) {
    const wishlistSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('wishlist_items')
      .get();
    wishlistItems = wishlistSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Chat messages
  let chatMessages: any[] = [];
  if (userData.couple_id) {
    const chatSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('messages')
      .where('sender_id', '==', userId)
      .get();
    chatMessages = chatSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Mark export time
  await userRef.update({
    last_export_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent('data_exported', userId, userData.couple_id || null, {});

  return {
    exported_at: new Date().toISOString(),
    profile: profileData,
    prompt_responses: responses,
    events,
    memories,
    goals,
    wishlist_items: wishlistItems,
    chat_messages: chatMessages,
  };
});

// ============================================
// CALLABLE: Anonymize My Responses
// ============================================

export const anonymizeMyResponses = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  let anonymizedCount = 0;

  // Anonymize prompt_responses
  const responsesSnap = await db
    .collection('prompt_responses')
    .where('user_id', '==', userId)
    .get();

  for (const responseDoc of responsesSnap.docs) {
    const responseData = responseDoc.data();

    // Delete attached image from Storage
    if (responseData.image_url && responseData.couple_id && responseData.assignment_id) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(`responses/${responseData.couple_id}/${responseData.assignment_id}/${userId}.jpg`).delete();
      } catch (e) {
        // Image may not exist
      }
    }

    await responseDoc.ref.update({
      response_text: '[removed]',
      response_text_encrypted: '[removed]',
      image_url: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    anonymizedCount++;

    // Update corresponding prompt_completions
    if (responseData.assignment_id) {
      const completionRef = db
        .collection('prompt_completions')
        .doc(responseData.assignment_id);
      const completionDoc = await completionRef.get();

      if (completionDoc.exists) {
        const completionData = completionDoc.data()!;
        const updatedResponses = (completionData.responses || []).map(
          (r: any) => r.user_id === userId
            ? { ...r, response_text: '[removed]', response_text_encrypted: '[removed]', image_url: null }
            : r
        );
        await completionRef.update({
          responses: updatedResponses,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // Update memory_artifacts where user's response appears
  if (userData.couple_id) {
    const memoriesSnap = await db
      .collection('memory_artifacts')
      .where('couple_id', '==', userData.couple_id)
      .get();

    for (const memoryDoc of memoriesSnap.docs) {
      const memoryData = memoryDoc.data();
      const memoryResponses = memoryData.responses || [];
      const hasUserResponse = memoryResponses.some(
        (r: any) => r.user_id === userId
      );

      if (hasUserResponse) {
        const updatedResponses = memoryResponses.map((r: any) =>
          r.user_id === userId
            ? { ...r, response_text: '[removed]', response_text_encrypted: '[removed]', image_url: null }
            : r
        );
        await memoryDoc.ref.update({
          responses: updatedResponses,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // Anonymize chat messages
  if (userData.couple_id) {
    const chatSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('messages')
      .where('sender_id', '==', userId)
      .where('is_deleted', '==', false)
      .get();

    for (const chatDoc of chatSnap.docs) {
      const chatData = chatDoc.data();

      // Delete chat image from Storage
      if (chatData.image_url) {
        try {
          const bucket = admin.storage().bucket();
          // Extract path from URL
          const urlPath = new URL(chatData.image_url).pathname;
          const filePath = decodeURIComponent(urlPath.split('/o/')[1]?.split('?')[0] || '');
          if (filePath) await bucket.file(filePath).delete();
        } catch (e) {
          // Image may not exist
        }
      }

      await chatDoc.ref.update({
        text: '[removed]',
        text_encrypted: '',
        image_url: null,
        is_deleted: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      anonymizedCount++;
    }
  }

  await logEvent('responses_anonymized', userId, userData.couple_id || null, {
    count: anonymizedCount,
  });

  return { anonymized_count: anonymizedCount };
});

// ============================================
// HELPER: Prompt Recommendation
// ============================================

const VALID_PROMPT_TYPES = [
  'love_map_update',
  'bid_for_connection',
  'appreciation_expression',
  'dream_exploration',
  'conflict_navigation',
  'repair_attempt',
];

const VALID_PROMPT_DEPTHS = ['surface', 'medium', 'deep'];

export function getPromptRecommendation(
  total: number,
  completed: number,
  sentiments: { positive: number; neutral: number; negative: number }
): string {
  if (total < 10) return 'needs_more_data';

  const completionRate = total > 0 ? completed / total : 0;
  const totalSentiments = sentiments.positive + sentiments.neutral + sentiments.negative;
  const positiveRate = totalSentiments > 0 ? sentiments.positive / totalSentiments : 0;

  if (completionRate >= 0.75 && positiveRate >= 0.6) return 'graduate';
  if (completionRate < 0.3) return 'retire';
  if (positiveRate < 0.4 && totalSentiments >= 5) return 'rewrite';
  return 'keep_testing';
}

// ============================================
// CALLABLE: Manage Prompt (Admin CRUD)
// ============================================

export const managePrompt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { action, promptId, fields } = data;

  if (!action) {
    throw new functions.https.HttpsError('invalid-argument', 'action is required');
  }

  switch (action) {
    case 'create': {
      if (!fields?.text || !fields?.type || !fields?.emotional_depth) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'text, type, and emotional_depth are required'
        );
      }
      if (!VALID_PROMPT_TYPES.includes(fields.type)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid type. Must be one of: ${VALID_PROMPT_TYPES.join(', ')}`
        );
      }
      if (!VALID_PROMPT_DEPTHS.includes(fields.emotional_depth)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid depth. Must be one of: ${VALID_PROMPT_DEPTHS.join(', ')}`
        );
      }

      const promptRef = await db.collection('prompts').add({
        text: fields.text,
        hint: fields.hint || null,
        type: fields.type,
        research_basis: fields.research_basis || 'original',
        emotional_depth: fields.emotional_depth,
        requires_conversation: fields.requires_conversation || false,
        status: 'testing',
        status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
        testing_started_at: admin.firestore.FieldValue.serverTimestamp(),
        week_restriction: fields.week_restriction || null,
        max_per_week: fields.max_per_week || null,
        day_preference: fields.day_preference || null,
        times_assigned: 0,
        times_completed: 0,
        completion_rate: 0,
        avg_response_length: 0,
        positive_response_rate: 0,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        created_by: context.auth.uid,
      });

      return { promptId: promptRef.id, status: 'testing' };
    }

    case 'update': {
      if (!promptId) {
        throw new functions.https.HttpsError('invalid-argument', 'promptId is required for update');
      }
      if (!fields || Object.keys(fields).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'fields are required for update');
      }

      const allowedFields = [
        'text', 'hint', 'type', 'emotional_depth', 'research_basis',
        'requires_conversation', 'week_restriction', 'max_per_week', 'day_preference',
      ];

      const updateData: Record<string, any> = {};
      for (const key of Object.keys(fields)) {
        if (!allowedFields.includes(key)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Field '${key}' is not allowed for update`
          );
        }
        updateData[key] = fields[key];
      }

      if (updateData.type && !VALID_PROMPT_TYPES.includes(updateData.type)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid type. Must be one of: ${VALID_PROMPT_TYPES.join(', ')}`
        );
      }
      if (updateData.emotional_depth && !VALID_PROMPT_DEPTHS.includes(updateData.emotional_depth)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid depth. Must be one of: ${VALID_PROMPT_DEPTHS.join(', ')}`
        );
      }

      updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();

      const promptRef = db.collection('prompts').doc(promptId);
      const promptDoc = await promptRef.get();
      if (!promptDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Prompt not found');
      }

      await promptRef.update(updateData);
      return { promptId, updated: true };
    }

    case 'promote': {
      if (!promptId) {
        throw new functions.https.HttpsError('invalid-argument', 'promptId is required for promote');
      }

      const promptRef = db.collection('prompts').doc(promptId);
      const promptDoc = await promptRef.get();
      if (!promptDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Prompt not found');
      }

      const currentStatus = promptDoc.data()!.status;
      const validTransitions: Record<string, string> = {
        draft: 'testing',
        testing: 'active',
      };

      const nextStatus = validTransitions[currentStatus];
      if (!nextStatus) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot promote from '${currentStatus}'. Valid transitions: draft->testing, testing->active`
        );
      }

      const updateFields: Record<string, any> = {
        status: nextStatus,
        status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (nextStatus === 'testing') {
        updateFields.testing_started_at = admin.firestore.FieldValue.serverTimestamp();
      }

      await promptRef.update(updateFields);
      return { promptId, previousStatus: currentStatus, newStatus: nextStatus };
    }

    case 'retire': {
      if (!promptId) {
        throw new functions.https.HttpsError('invalid-argument', 'promptId is required for retire');
      }

      const promptRef = db.collection('prompts').doc(promptId);
      const promptDoc = await promptRef.get();
      if (!promptDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Prompt not found');
      }

      await promptRef.update({
        status: 'retired',
        status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { promptId, newStatus: 'retired' };
    }

    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid action '${action}'. Must be one of: create, update, promote, retire`
      );
  }
});

// ============================================
// CALLABLE: Get Prompt Performance (Admin)
// ============================================

export const getPromptPerformance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { promptId } = data || {};

  if (promptId) {
    // Full metrics for a single prompt
    const promptDoc = await db.collection('prompts').doc(promptId).get();
    if (!promptDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Prompt not found');
    }

    const promptData = promptDoc.data()!;

    const assignmentsSnap = await db
      .collection('prompt_assignments')
      .where('prompt_id', '==', promptId)
      .get();

    const total = assignmentsSnap.size;
    const completed = assignmentsSnap.docs.filter(
      (d) => d.data().status === 'completed'
    ).length;

    const responsesSnap = await db
      .collection('prompt_responses')
      .where('prompt_id', '==', promptId)
      .where('emotional_response', '!=', null)
      .get();

    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    for (const doc of responsesSnap.docs) {
      const response = doc.data().emotional_response;
      if (response === 'positive') sentiments.positive++;
      else if (response === 'neutral') sentiments.neutral++;
      else if (response === 'negative') sentiments.negative++;
    }

    const recommendation = getPromptRecommendation(total, completed, sentiments);

    return {
      prompt_id: promptId,
      text: promptData.text,
      type: promptData.type,
      status: promptData.status,
      total_assignments: total,
      total_completed: completed,
      completion_rate: total > 0 ? completed / total : 0,
      sentiments,
      recommendation,
    };
  }

  // Summary of all active/testing prompts
  const promptsSnap = await db
    .collection('prompts')
    .where('status', 'in', ['active', 'testing'])
    .get();

  const summaries = [];
  for (const promptDoc of promptsSnap.docs) {
    const d = promptDoc.data();
    summaries.push({
      prompt_id: promptDoc.id,
      text: d.text,
      type: d.type,
      status: d.status,
      completion_rate: d.completion_rate || 0,
      positive_rate: d.positive_response_rate || 0,
      times_assigned: d.times_assigned || 0,
    });
  }

  // Sort by completion rate descending
  summaries.sort((a, b) => b.completion_rate - a.completion_rate);

  return { prompts: summaries };
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

// ============================================
// SCHEDULED: Detect Churn Risk (Daily 5 AM PT)
// ============================================

export const detectChurnRisk = functions.pubsub
  .schedule('every day 05:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const activeCouplesSnap = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    let flaggedCount = 0;

    for (const coupleDoc of activeCouplesSnap.docs) {
      const coupleData = coupleDoc.data();
      const linkedAt = coupleData.linked_at?.toDate();

      // Skip couples linked less than 3 days ago
      if (!linkedAt || linkedAt > threeDaysAgo) continue;

      // Get recent assignments ordered by date (most recent first)
      const assignmentsSnap = await db
        .collection('prompt_assignments')
        .where('couple_id', '==', coupleDoc.id)
        .orderBy('assigned_date', 'desc')
        .limit(20)
        .get();

      // Count consecutive missed prompts from most recent
      let consecutiveMissed = 0;
      for (const assignmentDoc of assignmentsSnap.docs) {
        const status = assignmentDoc.data().status;
        if (status === 'completed') break;
        if (status === 'delivered' || status === 'partial' || status === 'expired') {
          consecutiveMissed++;
        }
      }

      // Determine risk level
      let riskLevel: string | null = null;
      if (consecutiveMissed >= 7) {
        riskLevel = 'high';
      } else if (consecutiveMissed >= 5) {
        riskLevel = 'medium';
      } else if (consecutiveMissed >= 3) {
        riskLevel = 'low';
      }

      // Update couple doc with churn risk info
      await coupleDoc.ref.update({
        churn_risk_level: riskLevel,
        consecutive_missed_prompts: consecutiveMissed,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (riskLevel) {
        flaggedCount++;

        // Log churn risk event
        const memberIds: string[] = coupleData.member_ids || [];
        if (memberIds.length > 0) {
          await logEvent('churn_risk_flagged', memberIds[0], coupleDoc.id, {
            risk_level: riskLevel,
            consecutive_missed: consecutiveMissed,
          });
        }

        // Send push notification only to high-risk couples
        if (riskLevel === 'high') {
          for (const userId of coupleData.member_ids) {
            await sendPushNotification(userId, {
              title: APP_NAME,
              body: "It's been a while. A new prompt is waiting for you.",
            });
          }
        }
      }
    }

    console.log(`Churn risk: flagged ${flaggedCount} couples`);
    return null;
  });

// ============================================
// CALLABLE: Migrate Encrypted Responses (Admin)
// ============================================

export const migrateEncryptedResponses = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  // Find responses that have response_text_encrypted but response_text is not '[encrypted]'
  const batchSize = 500;
  let migratedCount = 0;

  const responsesSnap = await db
    .collection('prompt_responses')
    .where('status', '==', 'submitted')
    .limit(batchSize)
    .get();

  const batch = db.batch();

  for (const responseDoc of responsesSnap.docs) {
    const responseData = responseDoc.data();
    // Only migrate if encrypted text exists and plaintext is not already sentinel
    if (
      responseData.response_text_encrypted &&
      responseData.response_text !== '[encrypted]' &&
      responseData.response_text !== '[removed]'
    ) {
      batch.update(responseDoc.ref, {
        response_text: '[encrypted]',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    await batch.commit();
  }

  return {
    migrated_count: migratedCount,
    total_scanned: responsesSnap.size,
  };
});

// ============================================
// BigQuery Analytics Export — Shared Helper
// ============================================

const BQ_DATASET = 'stoke_analytics';
const BQ_TABLE = 'events';
const EXPORT_BATCH_SIZE = 500;
const EXPORT_MAX_EVENTS = 10000;

async function exportEventsBatch(cutoffDate: Date): Promise<{ exported: number; deleted: number }> {
  const bigquery = new BigQuery();
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  let exported = 0;
  let deleted = 0;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  while (exported < EXPORT_MAX_EVENTS) {
    let eventsQuery = db
      .collection('events')
      .where('timestamp', '<', cutoffTimestamp)
      .orderBy('timestamp', 'asc')
      .limit(EXPORT_BATCH_SIZE);

    if (lastDoc) {
      eventsQuery = eventsQuery.startAfter(lastDoc);
    }

    const eventsSnap = await eventsQuery.get();
    if (eventsSnap.empty) break;

    // Transform events for BigQuery
    const rows = eventsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        event_name: data.event_name || null,
        user_id: data.user_id || null,
        couple_id: data.couple_id || null,
        properties: data.properties ? JSON.stringify(data.properties) : null,
        platform: data.platform || null,
        app_version: data.app_version || null,
        session_id: data.session_id || null,
        timestamp: data.timestamp?.toDate?.() || null,
        date: data.date || null,
        week: data.week || null,
        created_at: data.created_at?.toDate?.() || null,
      };
    });

    // Insert to BigQuery
    await bigquery.dataset(BQ_DATASET).table(BQ_TABLE).insert(rows);
    exported += rows.length;

    // Delete from Firestore in batches
    const deleteBatch = db.batch();
    for (const doc of eventsSnap.docs) {
      deleteBatch.delete(doc.ref);
    }
    await deleteBatch.commit();
    deleted += eventsSnap.size;

    lastDoc = eventsSnap.docs[eventsSnap.docs.length - 1];

    // If we got fewer than batch size, we're done
    if (eventsSnap.size < EXPORT_BATCH_SIZE) break;
  }

  return { exported, deleted };
}

// ============================================
// SCHEDULED: Export Events to BigQuery (Daily 4 AM PT)
// ============================================

export const exportEventsToBigQuery = functions.pubsub
  .schedule('every day 04:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const cutoffDate = subDays(new Date(), 90);

    try {
      const result = await exportEventsBatch(cutoffDate);
      console.log(`BigQuery export: ${result.exported} exported, ${result.deleted} deleted`);
    } catch (error) {
      console.error('BigQuery export failed:', error);
    }

    return null;
  });

// ============================================
// CALLABLE: Trigger BigQuery Export (Admin)
// ============================================

export const triggerBigQueryExport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const cutoffDate = subDays(new Date(), 90);
  const result = await exportEventsBatch(cutoffDate);

  return {
    success: true,
    exported: result.exported,
    deleted: result.deleted,
  };
});

// ============================================
// AI Prompt Generation — Shared Helper
// ============================================

const AI_MODEL = 'claude-sonnet-4-5-20250929';
const AI_MAX_PER_CALL = 10;
const AI_RATE_LIMIT_HOURS = 1;

async function generatePromptsBatch(
  count: number,
  targetType?: string,
  targetDepth?: string
): Promise<{ generated: number; promptIds: string[] }> {
  const apiKey = functions.config().anthropic?.api_key;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Anthropic API key not configured');
  }

  // Gather context: existing prompt texts to avoid duplication
  const existingPromptsSnap = await db
    .collection('prompts')
    .where('status', 'in', ['active', 'testing'])
    .get();

  const existingTexts = existingPromptsSnap.docs.map((d) => d.data().text);

  // Count prompts by type to find underrepresented categories
  const typeCounts: Record<string, number> = {};
  for (const doc of existingPromptsSnap.docs) {
    const type = doc.data().type;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  // Find top-performing patterns
  const topPrompts = existingPromptsSnap.docs
    .filter((d) => (d.data().times_assigned || 0) >= 5)
    .sort((a, b) => (b.data().positive_response_rate || 0) - (a.data().positive_response_rate || 0))
    .slice(0, 5)
    .map((d) => d.data().text);

  // Build system prompt
  const systemPrompt = `You are a prompt designer for Stoke, a relationship app for long-term couples. Generate conversation prompts that help couples connect meaningfully.

Brand voice: Warm, quiet, direct. Never cute, clinical, or urgent. No exclamation points.

Prompt types (choose from): ${VALID_PROMPT_TYPES.join(', ')}
Emotional depths: ${VALID_PROMPT_DEPTHS.join(', ')}

Rules:
- Each prompt should be a single open-ended question or gentle invitation
- Prompts should feel natural, like something a thoughtful friend would ask
- Avoid therapy jargon, relationship clichés, or overly personal topics
- Keep prompts between 10-80 words
- Include an optional "hint" (1 sentence, helps if someone feels stuck)
- Do NOT duplicate these existing prompts: ${existingTexts.slice(0, 30).join(' | ')}

${topPrompts.length > 0 ? `Top-performing prompts for reference: ${topPrompts.join(' | ')}` : ''}

Current type distribution: ${JSON.stringify(typeCounts)}
${targetType ? `Focus on type: ${targetType}` : 'Balance across underrepresented types.'}
${targetDepth ? `Target depth: ${targetDepth}` : 'Mix of depths.'}

Respond with a JSON array of objects, each with: text, hint, type, emotional_depth, requires_conversation (boolean).`;

  // Call Claude API via fetch
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate exactly ${count} new prompts. Return only the JSON array, no other text.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new functions.https.HttpsError('internal', `Claude API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || '';

  // Parse JSON from response — handle markdown code fences
  let prompts: any[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    prompts = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Failed to parse AI response as JSON');
  }

  // Validate and store prompts
  const promptIds: string[] = [];
  for (const prompt of prompts) {
    // Validate type and depth
    if (!VALID_PROMPT_TYPES.includes(prompt.type)) continue;
    if (!VALID_PROMPT_DEPTHS.includes(prompt.emotional_depth)) continue;
    if (!prompt.text || typeof prompt.text !== 'string') continue;

    const promptRef = await db.collection('prompts').add({
      text: prompt.text,
      hint: prompt.hint || null,
      type: prompt.type,
      research_basis: 'original',
      emotional_depth: prompt.emotional_depth,
      requires_conversation: prompt.requires_conversation || false,
      status: 'testing',
      status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
      testing_started_at: admin.firestore.FieldValue.serverTimestamp(),
      week_restriction: null,
      max_per_week: null,
      day_preference: null,
      times_assigned: 0,
      times_completed: 0,
      completion_rate: 0,
      avg_response_length: 0,
      positive_response_rate: 0,
      ai_generated: true,
      ai_model: AI_MODEL,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: 'ai',
    });

    promptIds.push(promptRef.id);
  }

  return { generated: promptIds.length, promptIds };
}

// ============================================
// CALLABLE: Generate AI Prompts (Admin)
// ============================================

export const generateAIPrompts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const count = Math.min(data?.count || 5, AI_MAX_PER_CALL);
  const targetType = data?.targetType;
  const targetDepth = data?.targetDepth;

  // Rate limit: 1 call per hour
  const stateRef = db.collection('admin_state').doc('ai_generation');
  const stateDoc = await stateRef.get();
  if (stateDoc.exists) {
    const lastRun = stateDoc.data()?.last_run_at?.toDate();
    if (lastRun) {
      const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      if (hoursSince < AI_RATE_LIMIT_HOURS) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `AI generation is rate-limited. Try again in ${Math.ceil((AI_RATE_LIMIT_HOURS - hoursSince) * 60)} minutes.`
        );
      }
    }
  }

  // Update rate limit timestamp
  await stateRef.set({
    last_run_at: admin.firestore.FieldValue.serverTimestamp(),
    triggered_by: context.auth.uid,
  }, { merge: true });

  const result = await generatePromptsBatch(count, targetType, targetDepth);

  return {
    success: true,
    generated: result.generated,
    prompt_ids: result.promptIds,
  };
});

// ============================================
// SCHEDULED: Auto-Generate Prompts (Monday 2 AM PT)
// ============================================

export const autoGeneratePrompts = functions.pubsub
  .schedule('every monday 02:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    try {
      // Check if active prompt pool is below threshold
      const activePromptsSnap = await db
        .collection('prompts')
        .where('status', 'in', ['active', 'testing'])
        .get();

      const activeCount = activePromptsSnap.size;
      const TARGET_POOL_SIZE = 40;

      if (activeCount >= TARGET_POOL_SIZE) {
        console.log(`Prompt pool at ${activeCount}, no generation needed`);
        return null;
      }

      const deficit = Math.min(TARGET_POOL_SIZE - activeCount, AI_MAX_PER_CALL);
      console.log(`Prompt pool at ${activeCount}, generating ${deficit} prompts`);

      const result = await generatePromptsBatch(deficit);
      console.log(`Auto-generated ${result.generated} prompts: ${result.promptIds.join(', ')}`);
    } catch (error) {
      console.error('Auto-generate prompts failed:', error);
    }

    return null;
  });

// ============================================
// FIRESTORE TRIGGER: Chat Message Created
// ============================================

export const onChatMessageCreated = functions.firestore
  .document('couples/{coupleId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { coupleId } = context.params;
    const messageData = snap.data();
    const senderId = messageData.sender_id;

    // Get couple to find partner
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) return;

    const coupleData = coupleDoc.data()!;
    const memberIds: string[] = coupleData.member_ids || [];
    const partnerId = memberIds.find((id: string) => id !== senderId);

    if (!partnerId) return;

    // Check partner's presence — only send push if offline
    const partnerPresenceRef = db.collection('presence').doc(coupleId)
      .collection('members').doc(partnerId);
    const partnerPresence = await partnerPresenceRef.get();
    const partnerStatus = partnerPresence.exists
      ? partnerPresence.data()?.status
      : 'offline';

    if (partnerStatus !== 'online') {
      // Get sender's name
      const senderDoc = await db.collection('users').doc(senderId).get();
      const senderName = senderDoc.exists
        ? senderDoc.data()?.display_name || 'Your partner'
        : 'Your partner';

      const body = messageData.type === 'image'
        ? 'Sent a photo'
        : 'Sent you a message';

      await sendPushNotification(
        partnerId,
        { title: senderName, body },
        { type: 'chat_message' }
      );
    }
  });
