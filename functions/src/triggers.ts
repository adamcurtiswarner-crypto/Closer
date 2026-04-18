import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays } from 'date-fns';
import {
  db,
  DEPTH_THRESHOLD,
  DEEP_WEEK_FLOOR,
  initializeDepthProgress,
  sendPushNotification,
  logEvent,
} from './shared';

// ============================================
// FIRESTORE TRIGGER: On Response Submitted
// ============================================

export const onResponseSubmitted = functions.firestore
  .document('prompt_responses/{responseId}')
  .onCreate(async (snap, _context) => {
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

      // Advance depth progression
      const promptDoc = await db.collection('prompts').doc(response.prompt_id).get();
      if (promptDoc.exists) {
        const promptData = promptDoc.data()!;
        const promptType = promptData.type;
        const promptDepth = promptData.emotional_depth || 'surface';

        const depthProgress = streakCoupleData.depth_progress || initializeDepthProgress();
        const typeProgress = depthProgress[promptType] || {
          level: 'surface',
          surface_completions: 0,
          medium_completions: 0,
        };

        if (promptDepth === 'surface') {
          typeProgress.surface_completions += 1;
        } else if (promptDepth === 'medium') {
          typeProgress.medium_completions += 1;
        }

        // Calculate week number for deep floor check
        const linkedAt = streakCoupleData.linked_at?.toDate() || new Date();
        const coupleWeekNumber = Math.floor(
          (Date.now() - linkedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
        ) + 1;

        if (typeProgress.level === 'surface' && typeProgress.surface_completions >= DEPTH_THRESHOLD) {
          typeProgress.level = 'medium';
        } else if (typeProgress.level === 'medium' && typeProgress.medium_completions >= DEPTH_THRESHOLD && coupleWeekNumber >= DEEP_WEEK_FLOOR) {
          typeProgress.level = 'deep';
        }

        depthProgress[promptType] = typeProgress;
        await db.collection('couples').doc(response.couple_id).update({
          depth_progress: depthProgress,
        });
      }

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
        }, { type: 'prompt' });
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
          }, { type: 'partner_responded' });

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
// TRIGGER: Reaction Push Notification
// ============================================

export const onReactionAdded = functions.firestore
  .document('prompt_completions/{completionId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    const beforeReactions = before.reactions || {};
    const afterReactions = after.reactions || {};

    // Find the user who just reacted
    let reactorId: string | null = null;
    let reactionValue: string | null = null;
    for (const [userId, reaction] of Object.entries(afterReactions)) {
      if (beforeReactions[userId] !== reaction && reaction !== null) {
        reactorId = userId;
        reactionValue = reaction as string;
        break;
      }
    }

    if (!reactorId || !reactionValue) return null;

    const coupleId = after.couple_id;
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    const coupleData = coupleDoc.data()!;
    const partnerId = coupleData.member_ids.find(
      (id: string) => id !== reactorId
    );

    if (!partnerId) return null;

    // Don't notify if partner already reacted (avoid ping-pong)
    if (afterReactions[partnerId]) return null;

    const reactorDoc = await db.collection('users').doc(reactorId).get();
    const reactorName = reactorDoc.data()?.display_name || 'Your partner';

    const REACTION_EMOJIS: Record<string, string> = {
      heart: '\u2764\uFE0F',
      fire: '\uD83D\uDD25',
      laughing: '\uD83D\uDE02',
      teary: '\uD83E\uDD7A',
    };

    await sendPushNotification(partnerId, {
      title: reactorName,
      body: `${REACTION_EMOJIS[reactionValue] || ''} reacted to your response`,
    }, { type: 'prompt' });

    return null;
  });

// ============================================
// TRIGGER: On Check-In Submitted
// ============================================

export const onCheckInSubmitted = functions.firestore
  .document('couples/{coupleId}/check_ins/{checkInId}')
  .onCreate(async (snap, context) => {
    const { coupleId } = context.params;
    const checkInData = snap.data();
    const submitterId = checkInData.user_id;

    // Get couple to find partner
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) return;

    const coupleData = coupleDoc.data()!;
    const memberIds: string[] = coupleData.member_ids || [];
    const partnerId = memberIds.find((id: string) => id !== submitterId);

    if (!partnerId) return;

    // Get submitter's name
    const submitterDoc = await db.collection('users').doc(submitterId).get();
    const submitterName = submitterDoc.exists
      ? submitterDoc.data()?.display_name || 'Your partner'
      : 'Your partner';

    await sendPushNotification(
      partnerId,
      { title: 'Stoke', body: `${submitterName} checked in this week` },
      { type: 'check_in' }
    );
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

// ============================================
// SCHEDULED: Deliver Check-In (Sunday 10 AM PT)
// ============================================

export const deliverCheckIn = functions.pubsub
  .schedule('every sunday 10:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const oneWeekAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 7 * 24 * 60 * 60 * 1000
    );

    // Get all active couples
    const couplesSnap = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    let flaggedCount = 0;

    for (const coupleDoc of couplesSnap.docs) {
      const memberIds: string[] = coupleDoc.data().member_ids || [];

      for (const userId of memberIds) {
        // Check latest check-in for this user
        const checkInsSnap = await db
          .collection('couples')
          .doc(coupleDoc.id)
          .collection('check_ins')
          .where('user_id', '==', userId)
          .orderBy('created_at', 'desc')
          .limit(1)
          .get();

        const needsCheckIn =
          checkInsSnap.empty ||
          checkInsSnap.docs[0].data().created_at <= oneWeekAgo;

        if (needsCheckIn) {
          await db.collection('users').doc(userId).update({
            pending_check_in: true,
          });
          await sendPushNotification(
            userId,
            { title: 'Stoke', body: 'A quiet moment to reflect on your week together' },
            { type: 'check_in' }
          );
          flaggedCount++;
        }
      }
    }

    console.log(`deliverCheckIn: flagged ${flaggedCount} users for check-in`);
    return null;
  });
