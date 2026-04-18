import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, VALID_PROMPT_TYPES, VALID_PROMPT_DEPTHS } from './shared';

// ============================================
// HELPER: Prompt Recommendation
// ============================================

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
        created_by: context.auth!.uid,
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

      const updateData: Record<string, unknown> = {};
      for (const key of Object.keys(fields)) {
        if (!allowedFields.includes(key)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Field '${key}' is not allowed for update`
          );
        }
        updateData[key] = fields[key];
      }

      if (updateData.type && !VALID_PROMPT_TYPES.includes(updateData.type as string)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid type. Must be one of: ${VALID_PROMPT_TYPES.join(', ')}`
        );
      }
      if (updateData.emotional_depth && !VALID_PROMPT_DEPTHS.includes(updateData.emotional_depth as string)) {
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

      const updateFields: Record<string, unknown> = {
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
      case 'PRODUCT_CHANGE': {
        const purchaseUserDoc = await db.collection('users').doc(appUserId).get();
        const purchaseCoupleId = purchaseUserDoc.data()?.couple_id || null;
        await subscriptionRef.set({
          user_id: appUserId,
          couple_id: purchaseCoupleId,
          status: 'active',
          plan: 'premium',
          platform: event.store || 'unknown',
          expires_at: event.expiration_at_ms
            ? admin.firestore.Timestamp.fromMillis(event.expiration_at_ms)
            : null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
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

    // Update couple-level premium fields
    const userDoc = await db.collection('users').doc(appUserId).get();
    const coupleId = userDoc.data()?.couple_id;

    if (coupleId) {
      const coupleRef = db.collection('couples').doc(coupleId);

      if (eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL' || eventType === 'PRODUCT_CHANGE') {
        const expiresAt = event.expiration_at_ms
          ? admin.firestore.Timestamp.fromMillis(event.expiration_at_ms)
          : null;

        await coupleRef.update({
          premium_until: expiresAt,
          premium_source: appUserId,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Premium activated for couple ${coupleId} until ${expiresAt?.toDate()}`);
      } else if (eventType === 'EXPIRATION') {
        // Don't clear premium_until — let it lapse naturally
        console.log(`Subscription expired for couple ${coupleId}`);
      }
    } else {
      console.warn('Subscription event for user without couple:', appUserId);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

