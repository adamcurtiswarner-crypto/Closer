import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays, startOfWeek, getDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

admin.initializeApp();

const db = admin.firestore();

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
      title: 'Closer',
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
  notification: { title: string; body: string }
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const tokens = userData.push_tokens || [];

  if (tokens.length === 0) return;

  const messages = tokens.map((t: any) => ({
    token: t.token,
    notification,
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
            title: 'Closer',
            body: 'Your weekly recap is ready.',
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
        total_response_length: responses.reduce(
          (sum, r) => sum + (r.response_text?.length || 0),
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
    } else {
      // First response - notify partner
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
          await sendPushNotification(partnerId, {
            title: 'Closer',
            body: 'Your partner answered.',
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
      response_length: response.response_text?.length || 0,
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
    const today = format(new Date(), 'yyyy-MM-dd');

    // Find assignments that are still 'delivered' or 'partial' from before today
    const staleDelivered = await db
      .collection('prompt_assignments')
      .where('status', '==', 'delivered')
      .where('assigned_date', '<', today)
      .get();

    const stalePartial = await db
      .collection('prompt_assignments')
      .where('status', '==', 'partial')
      .where('assigned_date', '<', today)
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
            title: 'Closer',
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

    // Find today's assignments still awaiting responses
    const deliveredSnapshot = await db
      .collection('prompt_assignments')
      .where('status', '==', 'delivered')
      .where('assigned_date', '==', today)
      .get();

    const partialSnapshot = await db
      .collection('prompt_assignments')
      .where('status', '==', 'partial')
      .where('assigned_date', '==', today)
      .get();

    const pendingAssignments = [...deliveredSnapshot.docs, ...partialSnapshot.docs];
    let remindersSent = 0;

    for (const assignmentDoc of pendingAssignments) {
      const assignment = assignmentDoc.data();
      const deliveredAt = assignment.delivered_at?.toDate?.();
      if (!deliveredAt) continue;

      // Check if delivered_at was 3-4 hours ago (natural dedup window)
      const hoursSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDelivery < 3 || hoursSinceDelivery >= 4) continue;

      // Get couple members
      const coupleDoc = await db.collection('couples').doc(assignment.couple_id).get();
      if (!coupleDoc.exists) continue;
      const memberIds: string[] = coupleDoc.data()!.member_ids;

      // Find who has already responded
      const responsesSnapshot = await db
        .collection('prompt_responses')
        .where('assignment_id', '==', assignmentDoc.id)
        .get();

      const respondedUserIds = new Set(responsesSnapshot.docs.map((d) => d.data().user_id));

      // Send reminders to non-responding users who have the preference enabled
      for (const userId of memberIds) {
        if (respondedUserIds.has(userId)) continue;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) continue;
        const userData = userDoc.data()!;

        // Only send if remind_to_respond is not explicitly false (default true)
        if (userData.remind_to_respond === false) continue;

        await sendPushNotification(userId, {
          title: 'Closer',
          body: "Don't forget to respond to today's prompt.",
        });
        remindersSent++;
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
