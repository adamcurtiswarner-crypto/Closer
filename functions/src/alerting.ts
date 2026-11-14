import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, sendPushNotification, runScheduled } from './shared';

/**
 * Cursor doc for the `/events` client_error scan below.
 *
 * A cursor rather than an `alerted` flag, because those docs are written by
 * the CLIENT and carry no such field — and a Firestore equality filter on a
 * missing field matches nothing, so `where('alerted','==',false)` would have
 * silently matched zero docs forever.
 */
const CLIENT_ERROR_CURSOR = 'admin_state/client_error_alerts';

/** How many client errors one alert summarises. */
const CLIENT_ERROR_SCAN_LIMIT = 50;

interface AdminRecipients {
  ids: string[];
  empty: boolean;
}

async function adminRecipients(): Promise<AdminRecipients> {
  const snap = await db.collection('admins').get();
  return { ids: snap.docs.map((d) => d.id), empty: snap.empty };
}

/**
 * Scans `/events` for `client_error` docs newer than the stored cursor and
 * alerts on them.
 *
 * Why this exists (2026-11-14): `logger.reportQueryDenied` has written
 * `client_error` events since 2026-07 and NOTHING has ever read them. The
 * `documentId() in` outage sat in that collection for 20 days — Open Days
 * never worked once, Your Words showed answers with no questions — and was
 * found only when Adam exported a CSV by hand. Populating `/admins` would
 * not have surfaced it, because this scan did not exist.
 *
 * Returns the number of client errors alerted on.
 */
async function alertOnClientErrors(recipients: AdminRecipients): Promise<number> {
  const cursorRef = db.doc(CLIENT_ERROR_CURSOR);
  const cursorSnap = await cursorRef.get();
  const cursor = cursorSnap.exists
    ? (cursorSnap.data()?.scanned_through as admin.firestore.Timestamp | undefined)
    : undefined;

  // First run: start the cursor at now rather than alerting on the whole
  // historical backlog (there are months of already-diagnosed denials in
  // there). The outage this guards against is the NEXT one.
  //
  // Explicitly `undefined`, not falsy: a cursor that merely compares false
  // must not be mistaken for a missing one, or the scan would silently
  // re-initialize and skip whatever arrived in between.
  if (cursor === undefined) {
    await cursorRef.set(
      {
        scanned_through: admin.firestore.FieldValue.serverTimestamp(),
        initialized_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log('checkErrorAlerts: client_error cursor initialized; scanning from now on');
    return 0;
  }

  const snap = await db
    .collection('events')
    .where('event_name', '==', 'client_error')
    .where('timestamp', '>', cursor)
    .orderBy('timestamp', 'desc')
    .limit(CLIENT_ERROR_SCAN_LIMIT)
    .get();

  if (snap.empty) return 0;

  // Group by the query context the client reported, so the alert names the
  // failing call site instead of just a count.
  const contexts = new Map<string, number>();
  for (const doc of snap.docs) {
    const props = (doc.data().properties ?? {}) as { context?: string };
    const context = typeof props.context === 'string' ? props.context : 'unknown';
    contexts.set(context, (contexts.get(context) ?? 0) + 1);
  }

  const summary = Array.from(contexts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([context, count]) => `${context} (${count})`)
    .join(', ');

  if (recipients.empty) {
    // Same discipline as the error_logs branch: do NOT advance the cursor,
    // so these resurface once an admin exists. Stamping them as handled with
    // nobody listening is how the 2026-08-03 outage stayed hidden.
    console.error(
      `checkErrorAlerts: ${snap.size} client error(s) [${summary}] and NO admin ` +
        'recipients configured — create /admins/{uid}. Cursor NOT advanced.'
    );
    return 0;
  }

  const title = `${snap.size} client error${snap.size > 1 ? 's' : ''} (permission denied)`;
  for (const adminId of recipients.ids) {
    await sendPushNotification(
      adminId,
      { title, body: `Queries denied: ${summary}` },
      { type: 'admin_error_alert' }
    );
  }

  // docs[0] is the newest (ordered desc), so it becomes the new high-water
  // mark. Anything older than it has either been alerted now or predates
  // the cursor.
  const newest = snap.docs[0].data().timestamp as admin.firestore.Timestamp;
  await cursorRef.set({ scanned_through: newest }, { merge: true });

  console.log(
    `Client error alert: notified ${recipients.ids.length} admin(s) about ${snap.size} denial(s) [${summary}]`
  );
  return snap.size;
}

// ============================================
// SCHEDULED: Check for Function Errors (Every 5 min)
// ============================================

/**
 * Scans `error_logs` for un-alerted entries and sends a push notification
 * to all admin users. Runs every 5 minutes so Adam knows about failures
 * within minutes, not when a user complains.
 */
// timeoutSeconds stays under the 5-minute schedule interval so runs never
// overlap; the query is bounded (limit 50) and needs no extra memory.
export const checkErrorAlerts = functions
  .runWith({ timeoutSeconds: 240 })
  .pubsub.schedule('every 5 minutes')
  .onRun(async () =>
    runScheduled('checkErrorAlerts', async () => {
      const recipients = await adminRecipients();

      // Client-side rules denials live in /events, not error_logs. Scanned
      // first and independently: a failure to alert on server errors must not
      // cost us the client signal, and vice versa.
      await alertOnClientErrors(recipients);

      // Find error logs that haven't been alerted yet
      const unalertedSnap = await db
        .collection('error_logs')
        .where('alerted', '==', false)
        .orderBy('created_at', 'asc')
        .limit(50)
        .get();

      if (unalertedSnap.empty) return null;

      // Build a concise summary
      const errorCount = unalertedSnap.size;
      const functionNames = new Set<string>();
      for (const doc of unalertedSnap.docs) {
        functionNames.add(doc.data().function_name);
      }

      const affectedFunctions = Array.from(functionNames).join(', ');
      const title = `${errorCount} error${errorCount > 1 ? 's' : ''} in Cloud Functions`;
      const body = `Affected: ${affectedFunctions}`;

      // With no admin docs the notify loop below is a no-op, yet every error was
      // still stamped alerted:true — so failures were permanently suppressed
      // with nobody ever told. A 31-day BigQuery outage hid behind exactly this
      // (CEO cycle 2026-08-03). Leave them unalerted so they resurface.
      if (recipients.empty) {
        console.error(
          `checkErrorAlerts: ${errorCount} unalerted error(s) in ${affectedFunctions} ` +
            'and NO admin recipients configured — create /admins/{uid} to receive ' +
            'alerts. Leaving these errors unalerted so they resurface.'
        );
        return null;
      }

      for (const adminId of recipients.ids) {
        await sendPushNotification(adminId, {
          title,
          body,
        }, { type: 'admin_error_alert' });
      }

      // Mark all as alerted in a batched write
      const batch = db.batch();
      for (const doc of unalertedSnap.docs) {
        batch.update(doc.ref, {
          alerted: true,
          alerted_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      console.log(`Error alert: notified ${recipients.ids.length} admin(s) about ${errorCount} error(s) in [${affectedFunctions}]`);
      return null;
    })
  );

// ============================================
// SCHEDULED: Cleanup Old Error Logs (Daily 3:30 AM PT)
// ============================================

/**
 * Deletes error_logs older than 30 days to prevent unbounded growth.
 */
export const cleanupErrorLogs = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every day 03:30')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cutoff = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

    const oldLogsSnap = await db
      .collection('error_logs')
      .where('created_at', '<', cutoff)
      .limit(500)
      .get();

    if (oldLogsSnap.empty) return null;

    const batch = db.batch();
    for (const doc of oldLogsSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    console.log(`Cleaned up ${oldLogsSnap.size} old error logs`);
    return null;
  });
