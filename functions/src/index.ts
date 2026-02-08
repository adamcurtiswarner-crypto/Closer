import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

admin.initializeApp();

const db = admin.firestore();

// ============================================
// SCHEDULED: Daily Prompt Delivery
// ============================================

export const deliverDailyPrompts = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find users whose notification time is within this 15-minute window
    const usersSnapshot = await db
      .collection('users')
      .where('is_onboarded', '==', true)
      .where('is_deleted', '==', false)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.couple_id) continue;

      // Parse notification time
      const [notifHour, notifMinute] = (userData.notification_time || '19:00')
        .split(':')
        .map(Number);

      // Check if within window (simple check, doesn't handle timezone perfectly)
      if (
        currentHour === notifHour &&
        currentMinute >= notifMinute &&
        currentMinute < notifMinute + 15
      ) {
        await deliverPromptToCouple(userData.couple_id);
      }
    }

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

  // Select a prompt
  const prompt = await selectPromptForCouple(coupleId);
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
    delivery_timezone: 'America/Los_Angeles', // TODO: Get from user
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

async function selectPromptForCouple(coupleId: string): Promise<any> {
  // Get recent prompts (last 30 days)
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const recentAssignments = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', thirtyDaysAgo)
    .get();

  const recentPromptIds = recentAssignments.docs.map(
    (doc) => doc.data().prompt_id
  );

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
      return true;
    })
    .map((doc) => ({ id: doc.id, ...doc.data() }));

  if (eligiblePrompts.length === 0) {
    // Fallback: use any active prompt
    const fallback = promptsSnapshot.docs[0];
    return fallback ? { id: fallback.id, ...fallback.data() } : null;
  }

  // Simple random selection (could be weighted in future)
  const randomIndex = Math.floor(Math.random() * eligiblePrompts.length);
  return eligiblePrompts[randomIndex];
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
  .onRun(async (context) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekString = format(now, "yyyy-'W'ww");

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

      await db.collection('prompt_completions').doc(response.assignment_id).set({
        assignment_id: response.assignment_id,
        couple_id: response.couple_id,
        prompt_id: response.prompt_id,
        responses,
        time_to_complete_seconds: 0, // TODO: Calculate
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

      // Update couple stats
      await db.collection('couples').doc(response.couple_id).update({
        total_completions: admin.firestore.FieldValue.increment(1),
        current_week_completions: admin.firestore.FieldValue.increment(1),
        last_completion_at: admin.firestore.FieldValue.serverTimestamp(),
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
        await sendPushNotification(partnerId, {
          title: 'Closer',
          body: 'Your partner answered.',
        });

        await logEvent('partner_notified', response.user_id, response.couple_id, {
          notified_user_id: partnerId,
        });
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
