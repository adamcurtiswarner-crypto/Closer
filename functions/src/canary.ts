import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { format } from 'date-fns';
import { db, DEFAULT_SCALE_CONFIG, reportError } from './shared';

// ============================================
// SYNTHETIC-COUPLE CANARY
//
// Hourly end-to-end check of the response -> completion pipeline using a
// dedicated shadow couple. It exercises the REAL production path — writes a
// prompt_assignment + two prompt_responses exactly the way clients do, then
// waits for onResponseSubmitted (triggers.ts) to create the
// prompt_completions doc and repair the assignment status to 'completed'.
// Failure writes to error_logs via reportError, which the existing
// checkErrorAlerts scheduler picks up.
//
// Leak containment (why a canary run can never touch a human):
// - assignment.source = 'canary': onResponseSubmitted skips pushes, couple
//   stats/streaks, follow-up creation, and analytics events for it (see the
//   isCanary guard in triggers.ts).
// - The canary couple doc has status 'canary' — every couples query in the
//   codebase filters status == 'active', so schedulers never see it.
// - The canary member ids have NO /users docs: deliverDailyPrompts iterates
//   users (is_onboarded == true) so it can never deliver to this couple, and
//   sendResponseReminders skips users whose doc doesn't exist. The canary
//   also deletes its assignment within ~60s, before the hourly reminder run
//   could plausibly observe it.
// - All artifacts (assignment, responses, completion) are deleted at the end
//   of every run, and each run starts by sweeping leftovers from any prior
//   crashed run.
// ============================================

export const CANARY_SOURCE = 'canary';

export interface CanaryConfig {
  coupleId: string;
  userA: string;
  userB: string;
}

/** Env-configurable ids so staging/prod can point at different shadows. */
export function canaryConfig(
  env: Record<string, string | undefined> = process.env
): CanaryConfig {
  return {
    coupleId: env.CANARY_COUPLE_ID || 'canary-couple',
    userA: env.CANARY_USER_A || 'canary-user-a',
    userB: env.CANARY_USER_B || 'canary-user-b',
  };
}

/** One assignment per run, timestamped for traceability in error_logs. */
export function canaryAssignmentId(now: Date): string {
  return `canary_${format(now, "yyyyMMdd'T'HHmmss")}`;
}

export function buildCanaryAssignment(
  config: CanaryConfig,
  assignedDate: string
): Record<string, unknown> {
  return {
    couple_id: config.coupleId,
    prompt_id: 'canary-prompt',
    prompt_text: 'Canary pipeline check — not a real prompt.',
    prompt_hint: null,
    prompt_type: 'canary',
    category: null,
    requires_conversation: false,
    response_format: 'scale',
    scale_config: DEFAULT_SCALE_CONFIG,
    assignment_kind: 'daily',
    assigned_date: assignedDate,
    source: CANARY_SOURCE,
    status: 'delivered',
    completed_at: null,
    response_count: 0,
    first_response_at: null,
    second_response_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Mirrors the client's useSubmitResponse write shape (usePrompt.ts),
 * including the deterministic `${assignmentId}_${userId}` doc id convention
 * applied by the caller. Scores are 7/7 — 'steady', so the completion never
 * initializes the repair/divergence discussed map.
 */
export function buildCanaryResponse(
  assignmentId: string,
  config: CanaryConfig,
  userId: string
): Record<string, unknown> {
  return {
    assignment_id: assignmentId,
    couple_id: config.coupleId,
    user_id: userId,
    prompt_id: 'canary-prompt',
    response_text: 'canary',
    response_score: 7,
    image_url: null,
    status: 'submitted',
    submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    emotional_response: null,
    talked_about_it: null,
    response_length: 6,
    time_to_respond_seconds: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
}

const COMPLETION_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Delete every canary artifact for the couple (assignments, responses, completions). */
async function sweepCanaryArtifacts(coupleId: string): Promise<void> {
  for (const collectionName of [
    'prompt_assignments',
    'prompt_responses',
    'prompt_completions',
  ]) {
    const snap = await db
      .collection(collectionName)
      .where('couple_id', '==', coupleId)
      .get();
    for (const doc of snap.docs) {
      await doc.ref.delete();
    }
  }
}

export interface CanaryRunOptions {
  config?: CanaryConfig;
  timeoutMs?: number;
  pollIntervalMs?: number;
  now?: Date;
}

export interface CanaryRunResult {
  ok: boolean;
  assignmentId: string;
  elapsedMs: number;
  failure: string | null;
}

/**
 * One full canary pass. Never throws — failures are reported to error_logs
 * and returned. Exported for direct unit testing with injected timings.
 */
export async function runCanaryOnce(options: CanaryRunOptions = {}): Promise<CanaryRunResult> {
  const config = options.config ?? canaryConfig();
  const timeoutMs = options.timeoutMs ?? COMPLETION_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const now = options.now ?? new Date();
  const assignmentId = canaryAssignmentId(now);
  const started = Date.now();
  let failure: string | null = null;

  try {
    // Leftovers from a prior crashed run must not confuse this pass.
    await sweepCanaryArtifacts(config.coupleId);

    // The shadow couple. status 'canary' (never 'active') keeps it invisible
    // to every couples-by-status query; the member ids have no /users docs.
    await db.collection('couples').doc(config.coupleId).set(
      {
        member_ids: [config.userA, config.userB],
        status: 'canary',
        is_canary: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // The real pipeline: assignment, then both "partners" answer the way the
    // client does (deterministic response ids).
    await db
      .collection('prompt_assignments')
      .doc(assignmentId)
      .set(buildCanaryAssignment(config, format(now, 'yyyy-MM-dd')));

    for (const userId of [config.userA, config.userB]) {
      await db
        .collection('prompt_responses')
        .doc(`${assignmentId}_${userId}`)
        .set(buildCanaryResponse(assignmentId, config, userId));
    }

    // Wait for onResponseSubmitted to do its job: completion doc created AND
    // assignment status repaired to 'completed'.
    const deadline = Date.now() + timeoutMs;
    let completionExists = false;
    let assignmentCompleted = false;
    for (;;) {
      const [completionDoc, assignmentDoc] = await Promise.all([
        db.collection('prompt_completions').doc(assignmentId).get(),
        db.collection('prompt_assignments').doc(assignmentId).get(),
      ]);
      completionExists = completionDoc.exists;
      assignmentCompleted = assignmentDoc.data()?.status === 'completed';
      if (completionExists && assignmentCompleted) break;
      if (Date.now() >= deadline) break;
      await sleep(pollIntervalMs);
    }

    if (!completionExists || !assignmentCompleted) {
      failure =
        `Canary pipeline incomplete after ${timeoutMs}ms: ` +
        `completion ${completionExists ? 'created' : 'MISSING'}, ` +
        `assignment ${assignmentCompleted ? 'completed' : 'NOT repaired'}`;
    }
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  } finally {
    // Always remove the run's artifacts — even on failure — so nothing
    // accumulates and nothing lingers for reminder/delivery schedulers.
    try {
      await sweepCanaryArtifacts(config.coupleId);
    } catch (cleanupErr) {
      await reportError('canary.cleanup', cleanupErr, {
        coupleId: config.coupleId,
        extra: { assignmentId },
      });
    }
  }

  const elapsedMs = Date.now() - started;
  if (failure) {
    await reportError('canary', new Error(failure), {
      coupleId: config.coupleId,
      extra: { assignmentId, elapsedMs },
    });
  } else {
    console.log(`[canary] pipeline healthy (${elapsedMs}ms, ${assignmentId})`);
  }

  return { ok: !failure, assignmentId, elapsedMs, failure };
}

// ============================================
// SCHEDULED: Hourly Canary
// ============================================

export const canaryPipelineCheck = functions
  .runWith({ timeoutSeconds: 300 })
  .pubsub.schedule('every 60 minutes')
  .onRun(async () => {
    await runCanaryOnce();
    return null;
  });
