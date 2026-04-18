import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import { format, subDays } from 'date-fns';
import { db, APP_NAME, sendPushNotification, logEvent } from './shared';

// ============================================
// BigQuery Constants (private)
// ============================================

const BQ_DATASET = 'stoke_analytics';
const BQ_TABLE = 'events';
const EXPORT_BATCH_SIZE = 500;
const EXPORT_MAX_EVENTS = 10000;

// ============================================
// PRIVATE: Export Events Batch
// ============================================

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
            }, { type: 'prompt' });
          }
        }
      }
    }

    console.log(`Churn risk: flagged ${flaggedCount} couples`);
    return null;
  });
