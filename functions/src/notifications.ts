import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { db, APP_NAME, sendPushNotification } from './shared';

// ============================================
// PURE: Reminder Quiet Hours (unit tested directly)
// ============================================

const REMINDER_WINDOW_START_HOUR = 8; // inclusive — 8 AM local
const REMINDER_WINDOW_END_HOUR = 21; // exclusive — 9 PM local

/**
 * Reminders may only be sent between 8 AM and 9 PM in the recipient's local
 * time. Outside that window the reminder is skipped WITHOUT counting as sent —
 * the hourly schedule naturally retries in the next open window.
 */
export function isWithinReminderWindow(localHour: number): boolean {
  return (
    localHour >= REMINDER_WINDOW_START_HOUR &&
    localHour < REMINDER_WINDOW_END_HOUR
  );
}

/**
 * Only daily-rhythm assignments (daily prompts and follow-ups) get response
 * reminders. Explore assignments are partner-sent questions — browsing one
 * and not answering must never nag; their discovery surface is the Today
 * "from your partner" card and the one send-time push.
 */
export function isReminderEligibleAssignment(assignment: {
  source?: string;
}): boolean {
  return assignment.source !== 'explore';
}

// ============================================
// SCHEDULED: Weekly Recap Notification
// ============================================

export const sendWeeklyRecaps = functions.pubsub
  .schedule('every sunday 18:00')
  .timeZone('America/Los_Angeles')
  .onRun(async (_context) => {
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
          }, { type: 'weekly_recap' });
        }
      }
    }

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
      if (!isReminderEligibleAssignment(assignment)) continue;
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

        // Quiet hours: never remind outside 8 AM - 9 PM in the recipient's
        // local time (a 7 PM delivery must not remind at 11 PM - 1 AM).
        // Skipping does NOT count as sent — the hourly run retries later.
        const userTimezone = userData.timezone || 'America/Los_Angeles';
        const localHour = parseInt(
          formatInTimeZone(now, userTimezone, 'HH'),
          10
        );
        if (!isWithinReminderWindow(localHour)) continue;

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
          if (localHour >= 8 && localHour < 10) {
            shouldSend = true;
            // Follow-up assignments get neutral follow-up copy
            body = assignment.assignment_kind === 'follow_up'
              ? "Yesterday's follow-up is still open."
              : "Yesterday's prompt is still open.";
          }
        }

        if (shouldSend) {
          await sendPushNotification(userId, {
            title: APP_NAME,
            body,
          }, { type: 'prompt' });

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
// SCHEDULED: Date Night Reminders
// ============================================

export const dateNightReminder = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const couplesSnapshot = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    let remindersSent = 0;

    for (const coupleDoc of couplesSnapshot.docs) {
      const coupleData = coupleDoc.data();

      // Query scheduled (non-archived) date nights for this couple
      const dateNightsSnapshot = await db
        .collection('couples')
        .doc(coupleDoc.id)
        .collection('date_nights')
        .where('status', '==', 'scheduled')
        .where('is_archived', '==', false)
        .get();

      if (dateNightsSnapshot.empty) continue;

      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');

      for (const nightDoc of dateNightsSnapshot.docs) {
        const nightData = nightDoc.data();
        if (!nightData.scheduled_date) continue;

        const scheduledDate = nightData.scheduled_date.toDate();
        const scheduledStr = format(scheduledDate, 'yyyy-MM-dd');
        const title = nightData.title || 'Date night';

        let body: string | null = null;

        if (scheduledStr === todayStr) {
          body = `Your date night is today — ${title}`;
        } else if (scheduledStr === tomorrowStr) {
          body = `Tomorrow's date night: ${title}`;
        }

        if (!body) continue;

        for (const memberId of coupleData.member_ids) {
          await sendPushNotification(
            memberId,
            { title: APP_NAME, body },
            { type: 'date_night_reminder' }
          );
        }
        remindersSent++;
      }
    }

    console.log(`Sent ${remindersSent} date night reminders`);
    return null;
  });
