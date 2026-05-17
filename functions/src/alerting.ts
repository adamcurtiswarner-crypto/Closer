import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, sendPushNotification } from './shared';

// ============================================
// SCHEDULED: Check for Function Errors (Every 5 min)
// ============================================

/**
 * Scans `error_logs` for un-alerted entries and sends a push notification
 * to all admin users. Runs every 5 minutes so Adam knows about failures
 * within minutes, not when a user complains.
 */
export const checkErrorAlerts = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
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

    // Get all admin users
    const adminsSnap = await db.collection('admins').get();

    for (const adminDoc of adminsSnap.docs) {
      await sendPushNotification(adminDoc.id, {
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

    console.log(`Error alert: notified ${adminsSnap.size} admin(s) about ${errorCount} error(s) in [${affectedFunctions}]`);
    return null;
  });

// ============================================
// SCHEDULED: Cleanup Old Error Logs (Daily 3:30 AM PT)
// ============================================

/**
 * Deletes error_logs older than 30 days to prevent unbounded growth.
 */
export const cleanupErrorLogs = functions.pubsub
  .schedule('every day 03:30')
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
