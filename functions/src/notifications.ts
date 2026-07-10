import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { db, APP_NAME, sendPushNotification, reportError } from './shared';

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

/**
 * True when this user set the assignment aside for today (follow-up skip,
 * written to skipped_by by the client). Set-aside users are never reminded.
 */
export function isUserSetAside(
  assignment: { skipped_by?: Record<string, unknown> },
  userId: string
): boolean {
  return Boolean(assignment.skipped_by && assignment.skipped_by[userId]);
}

// ============================================
// PURE: Reminder State Machine (unit tested directly)
// ============================================

const HOURS_UNTIL_FIRST_REMINDER = 4; // reminder 1 eligibility
const HOURS_UNTIL_NEXT_MORNING = 13; // a 7 PM delivery hits 13h at 8 AM next day
const MORNING_BAND_START_HOUR = 8; // inclusive — reminder-2 band
const MORNING_BAND_END_HOUR = 10; // exclusive

const REMINDER_1_BODY = 'Still time to respond today.';
const REMINDER_2_BODY_PROMPT = "Yesterday's prompt is still open.";
const REMINDER_2_BODY_FOLLOW_UP = "Yesterday's follow-up is still open.";

export interface ReminderEvaluationInput {
  /** Hours elapsed since the assignment was delivered. */
  hoursSinceDelivery: number;
  /** Current hour (0-23) in the recipient's local timezone. */
  localHour: number;
  /** Reminders already sent to this user for this assignment (0, 1, or 2). */
  remindersSent: number;
  /** Follow-up assignments get the neutral follow-up copy variant. */
  isFollowUp: boolean;
}

export interface ReminderEvaluation {
  send: boolean;
  /** Push body when send is true, null otherwise. */
  body: string | null;
  /**
   * New reminders_sent total to persist when send is true. A next-morning
   * nudge sent to a user with 0 prior reminders counts as BOTH reminders
   * (countsAs = 2) so the user never gets two back-to-back morning pushes.
   */
  countsAs: number;
}

/**
 * Reminder state machine — pure, no I/O.
 *
 * Semantics (max 2 reminders per assignment per user, never two on the same
 * run, never inside quiet hours — quiet hours DEFER, they never kill):
 *
 * - Reminder 1: >= 4h since delivery, 0 reminders sent, inside the 8 AM-9 PM
 *   window. No upper ceiling — a 7 PM delivery whose 4-6h window falls in
 *   quiet hours reminds at 8 AM the next morning instead of never.
 * - Morning consolidation: if reminder 1 is landing "next morning" — 13+
 *   hours after delivery, OR after a local midnight has passed since
 *   delivery (hoursSinceDelivery > localHour) — it is sent with the
 *   reminder-2 copy and counts as both reminders. Without the midnight test
 *   an 8 PM delivery would send reminder 1 at 8 AM (12h) and reminder 2 at
 *   9 AM (13h): exactly the double-morning stacking this exists to prevent.
 * - Reminder 2 proper: exactly 1 reminder sent, >= 13h since delivery,
 *   local hour in [8, 10). Combined with the count-0 consolidation branch,
 *   every count <= 1 state can reach the morning nudge.
 */
export function evaluateReminder(
  input: ReminderEvaluationInput
): ReminderEvaluation {
  const { hoursSinceDelivery, localHour, remindersSent, isFollowUp } = input;
  const noSend: ReminderEvaluation = {
    send: false,
    body: null,
    countsAs: remindersSent,
  };

  // Max 2 reminders per assignment per user.
  if (remindersSent >= 2) return noSend;

  // Quiet hours: defer, never send. Not counting a skipped reminder means
  // the hourly schedule retries in the next open window.
  if (!isWithinReminderWindow(localHour)) return noSend;

  const morningBody = isFollowUp
    ? REMINDER_2_BODY_FOLLOW_UP
    : REMINDER_2_BODY_PROMPT;

  // "Next morning": 13+ hours since delivery, or a local midnight has
  // passed (delivery yesterday evening, reminder deferred to this morning).
  const isNextMorning =
    hoursSinceDelivery >= HOURS_UNTIL_NEXT_MORNING ||
    hoursSinceDelivery > localHour;

  if (remindersSent === 0) {
    if (hoursSinceDelivery < HOURS_UNTIL_FIRST_REMINDER) return noSend;

    if (isNextMorning) {
      // First reminder is only landing the day after delivery (e.g. default
      // 7 PM delivery deferred past quiet hours). Send the morning copy once
      // and count it as BOTH reminders — at most one morning nudge, never
      // two back-to-back.
      return { send: true, body: morningBody, countsAs: 2 };
    }

    // Same-day reminder 1: >= 4h after delivery, no ceiling.
    return { send: true, body: REMINDER_1_BODY, countsAs: 1 };
  }

  // remindersSent === 1: proper reminder 2, next morning, 8-10 AM band only.
  if (
    hoursSinceDelivery >= HOURS_UNTIL_NEXT_MORNING &&
    localHour >= MORNING_BAND_START_HOUR &&
    localHour < MORNING_BAND_END_HOUR
  ) {
    return { send: true, body: morningBody, countsAs: 2 };
  }

  return noSend;
}

// ============================================
// SCHEDULED: Weekly Recap Notification
// ============================================

export const sendWeeklyRecaps = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every sunday 18:00')
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

export const sendResponseReminders = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every 1 hours')
  .onRun(async () => {
    try {
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
        // Per-assignment isolation: one malformed doc must not kill the
        // whole run (and with it every other couple's reminders).
        try {
          const assignment = assignmentDoc.data();
          if (!isReminderEligibleAssignment(assignment)) continue;
          const deliveredAt = assignment.delivered_at?.toDate?.();
          if (!deliveredAt) continue;

          const remindersSentMap: Record<string, number> =
            assignment.reminders_sent || {};

          // Get couple members
          const coupleDoc = await db
            .collection('couples')
            .doc(assignment.couple_id)
            .get();
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

            // Set aside for today (follow-up skip) — never remind. The prompt's
            // own copy promises "it'll keep"; nagging breaks that promise.
            if (isUserSetAside(assignment, userId)) continue;

            const userReminderCount = remindersSentMap[userId] || 0;

            // Max 2 reminders per user per assignment (cheap pre-check;
            // evaluateReminder enforces it too).
            if (userReminderCount >= 2) continue;

            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) continue;
            const userData = userDoc.data()!;

            // Respect remind_to_respond preference (default true)
            if (userData.remind_to_respond === false) continue;

            const userTimezone = userData.timezone || 'America/Los_Angeles';
            const localHour = parseInt(
              formatInTimeZone(now, userTimezone, 'HH'),
              10
            );

            // Pure state machine decides: quiet hours defer (never kill),
            // reminder 1 has no ceiling, next-morning sends consolidate to a
            // single nudge, max 2 per assignment per user.
            const evaluation = evaluateReminder({
              hoursSinceDelivery,
              localHour,
              remindersSent: userReminderCount,
              isFollowUp: assignment.assignment_kind === 'follow_up',
            });

            if (!evaluation.send || !evaluation.body) continue;

            await sendPushNotification(userId, {
              title: APP_NAME,
              body: evaluation.body,
            }, { type: 'prompt' });

            // Atomically track the reminder(s) sent for this user
            await assignmentDoc.ref.update({
              [`reminders_sent.${userId}`]: evaluation.countsAs,
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            remindersSent++;
          }
        } catch (assignmentError) {
          await reportError('sendResponseReminders', assignmentError, {
            extra: { assignmentId: assignmentDoc.id },
          });
          continue;
        }
      }

      console.log(`Sent ${remindersSent} response reminders`);
    } catch (error) {
      await reportError('sendResponseReminders', error);
    }
    return null;
  });

// ============================================
// SCHEDULED: Date Night Reminders
// ============================================

export const dateNightReminder = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every day 09:00')
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
