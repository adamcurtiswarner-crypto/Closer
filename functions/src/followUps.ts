import * as admin from 'firebase-admin';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  db,
  APP_NAME,
  DEFAULT_SCALE_CONFIG,
  FollowUpBranch,
  FollowUpTemplate,
  ScaleConfig,
  sendPushNotification,
  logEvent,
  reportError,
} from './shared';

// ============================================
// FOLLOW-UP TRIGGER SYSTEM (v1)
//
// When both partners submit a response to a scale-format daily assignment,
// exactly one branch may fire (precedence order, first match wins):
//   1. divergence: |scoreA - scoreB| >= divergence_gap  -> next day
//   2. repair:     min(scoreA, scoreB) <= low_threshold -> step 1 next day,
//                  step 2 the day after step 1 is completed by both partners
//   3. deepener:   both scores >= high_threshold        -> immediately (at reveal)
//
// Follow-up assignments are free-text, never scored, and never score-trigger
// further follow-ups. The single exception is chaining: completing a repair
// step-1 follow-up schedules the repair step-2 follow-up for the next day.
//
// Scheduling mechanism: next-day follow-ups are created up-front with
// status 'scheduled' and assigned_date set to the next day in the couple's
// delivery timezone. deliverDailyPrompts (via deliverPromptToCouple) checks
// for a due scheduled follow-up before selecting a daily prompt and activates
// it instead — a follow-up day replaces the daily prompt.
// ============================================

const DEFAULT_TIMEZONE = 'America/Los_Angeles';

// ============================================
// PURE DECISION HELPERS (unit tested directly)
// ============================================

/**
 * Picks the follow-up branch for a pair of scores, in locked precedence
 * order: divergence > repair > deepener > none.
 */
export function evaluateFollowUpBranch(
  scoreA: number,
  scoreB: number,
  config: ScaleConfig = DEFAULT_SCALE_CONFIG
): FollowUpBranch | null {
  if (Math.abs(scoreA - scoreB) >= config.divergence_gap) return 'divergence';
  if (Math.min(scoreA, scoreB) <= config.low_threshold) return 'repair';
  if (scoreA >= config.high_threshold && scoreB >= config.high_threshold) return 'deepener';
  return null;
}

/**
 * Guard: only scale-format, daily-kind assignments can score-trigger a
 * follow-up. Follow-up assignments themselves never score-trigger.
 */
export function canScoreTriggerFollowUp(assignment: {
  assignment_kind?: string;
  response_format?: string;
}): boolean {
  const kind = assignment.assignment_kind || 'daily';
  return kind === 'daily' && assignment.response_format === 'scale';
}

/**
 * Guard for the one chaining exception: a completed repair step-1 follow-up
 * schedules repair step 2 (chaining, not score-triggering).
 */
export function isRepairStepOne(assignment: {
  assignment_kind?: string;
  follow_up?: { branch?: string; step?: number };
}): boolean {
  return (
    assignment.assignment_kind === 'follow_up' &&
    assignment.follow_up?.branch === 'repair' &&
    assignment.follow_up?.step === 1
  );
}

/**
 * Extracts both partners' scores from the assignment's responses.
 * Returns null unless exactly two numeric scores are present.
 */
export function extractScores(
  responses: Array<{ response_score?: number | null }>
): [number, number] | null {
  const scores = responses
    .map((r) => r.response_score)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length !== 2) return null;
  return [scores[0], scores[1]];
}

/**
 * Picks a template from the active candidates.
 * - preferredVariant (repair step 2 keeping the step-1 family) wins if present.
 * - Otherwise prefer variants the couple hasn't used for this category+branch.
 * - Random pick within the preferred pool.
 */
export function pickTemplate(
  templates: FollowUpTemplate[],
  usedTemplateIds: string[],
  preferredVariant?: number
): FollowUpTemplate | null {
  if (templates.length === 0) return null;

  if (preferredVariant != null) {
    const sameVariant = templates.filter((t) => t.variant === preferredVariant);
    if (sameVariant.length > 0) {
      return sameVariant[Math.floor(Math.random() * sameVariant.length)];
    }
  }

  const unused = templates.filter((t) => !usedTemplateIds.includes(t.id));
  const pool = unused.length > 0 ? unused : templates;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Finds the scheduled follow-up that should be activated today: the earliest
 * one whose assigned_date is due (<= today). Returns null when none is due.
 */
export function findDueScheduledFollowUp<T extends { assigned_date: string }>(
  scheduled: T[],
  today: string
): T | null {
  const due = scheduled
    .filter((s) => s.assigned_date <= today)
    .sort((a, b) => (a.assigned_date < b.assigned_date ? -1 : 1));
  return due[0] || null;
}

/** Returns tomorrow's date string (yyyy-MM-dd) in the given timezone. */
export function nextDayInTimezone(timezone: string, now: Date = new Date()): string {
  const zonedNow = toZonedTime(now, timezone || DEFAULT_TIMEZONE);
  return format(addDays(zonedNow, 1), 'yyyy-MM-dd');
}

/** Returns today's date string (yyyy-MM-dd) in the given timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  const zonedNow = toZonedTime(now, timezone || DEFAULT_TIMEZONE);
  return format(zonedNow, 'yyyy-MM-dd');
}

// ============================================
// PRIVATE: Template Selection
// ============================================

async function selectFollowUpTemplate(
  coupleId: string,
  category: string,
  branch: FollowUpBranch,
  step: 1 | 2,
  preferredVariant?: number
): Promise<FollowUpTemplate | null> {
  const templatesSnap = await db
    .collection('follow_up_templates')
    .where('category', '==', category)
    .where('branch', '==', branch)
    .where('step', '==', step)
    .where('active', '==', true)
    .get();

  const templates = templatesSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as FollowUpTemplate)
  );
  if (templates.length === 0) return null;

  // Prefer a variant the couple hasn't seen for this category+branch
  const priorFollowUps = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assignment_kind', '==', 'follow_up')
    .get();

  const usedTemplateIds = priorFollowUps.docs
    .filter((doc) => {
      const data = doc.data();
      return data.category === category && data.follow_up?.branch === branch;
    })
    .map((doc) => doc.data().follow_up?.template_id)
    .filter((id): id is string => typeof id === 'string');

  return pickTemplate(templates, usedTemplateIds, preferredVariant);
}

// ============================================
// PRIVATE: Create Follow-Up Assignment
// ============================================

interface CreateFollowUpParams {
  coupleId: string;
  category: string;
  branch: FollowUpBranch;
  step: 1 | 2;
  parentAssignmentId: string; // the scored daily assignment that triggered the chain
  timezone: string;
  deliverImmediately: boolean; // deepener only — shown at reveal in the same session
  preferredVariant?: number; // repair step 2 keeps the step-1 variant family
  triggeredByUserId: string; // for event logging
}

async function createFollowUpAssignment(params: CreateFollowUpParams): Promise<void> {
  const {
    coupleId, category, branch, step, parentAssignmentId,
    timezone, deliverImmediately, preferredVariant, triggeredByUserId,
  } = params;

  // Idempotency guard: onCreate triggers can fire more than once. One
  // follow-up per parent assignment per step.
  const existing = await db
    .collection('prompt_assignments')
    .where('follow_up.parent_assignment_id', '==', parentAssignmentId)
    .get();
  if (existing.docs.some((doc) => doc.data().follow_up?.step === step)) {
    console.log(
      `Follow-up already exists for parent ${parentAssignmentId} step ${step}, skipping`
    );
    return;
  }

  const template = await selectFollowUpTemplate(
    coupleId, category, branch, step, preferredVariant
  );
  if (!template) {
    await reportError(
      'createFollowUpAssignment',
      new Error(`No active follow-up template for ${category}/${branch}/step${step}`),
      { coupleId, extra: { parentAssignmentId } }
    );
    return;
  }

  const assignedDate = deliverImmediately
    ? todayInTimezone(timezone)
    : nextDayInTimezone(timezone);

  await db.collection('prompt_assignments').add({
    couple_id: coupleId,
    prompt_id: template.id, // follow-up template id (no /prompts doc exists)
    prompt_text: template.text,
    prompt_hint: null,
    prompt_type: null, // follow-ups have no prompt type
    requires_conversation: false,
    category,
    // Client renders from the assignment doc — denormalize render fields
    response_format: 'text', // follow-ups are free-text, never scored
    scale_config: null,
    closing_text: template.closing_text ?? null,
    assignment_kind: 'follow_up',
    follow_up: {
      branch,
      step,
      parent_assignment_id: parentAssignmentId,
      template_id: template.id,
    },
    assigned_date: assignedDate,
    source: 'follow_up',
    delivered_at: deliverImmediately
      ? admin.firestore.FieldValue.serverTimestamp()
      : null,
    delivery_timezone: timezone,
    status: deliverImmediately ? 'delivered' : 'scheduled',
    completed_at: null,
    response_count: 0,
    first_response_at: null,
    second_response_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent('follow_up_created', triggeredByUserId, coupleId, {
    branch,
    step,
    parent_assignment_id: parentAssignmentId,
    template_id: template.id,
    delivery: deliverImmediately ? 'immediate' : 'scheduled',
    assigned_date: assignedDate,
  });

  console.log(
    `Created ${branch} step ${step} follow-up for couple ${coupleId} ` +
    `(${deliverImmediately ? 'immediate' : `scheduled for ${assignedDate}`})`
  );
}

// ============================================
// PUBLIC: Evaluate Follow-Up After Completion
// ============================================

/**
 * Called from onResponseSubmitted after both partners have responded.
 * Decides whether this completion triggers a follow-up (score branches on
 * scale daily prompts) or chains repair step 2 (repair step-1 completion).
 */
export async function evaluateFollowUpOnCompletion(
  assignmentId: string,
  assignment: admin.firestore.DocumentData,
  responses: Array<{ response_score?: number | null }>,
  triggeredByUserId: string
): Promise<void> {
  const coupleId = assignment.couple_id;
  const timezone = assignment.delivery_timezone || DEFAULT_TIMEZONE;

  // Chaining exception: completing repair step 1 schedules step 2 next day.
  if (isRepairStepOne(assignment)) {
    // Keep the same template family (variant) as step 1 when available.
    let preferredVariant: number | undefined;
    const stepOneTemplateId = assignment.follow_up?.template_id;
    if (stepOneTemplateId) {
      const templateDoc = await db
        .collection('follow_up_templates')
        .doc(stepOneTemplateId)
        .get();
      const variant = templateDoc.data()?.variant;
      if (typeof variant === 'number') preferredVariant = variant;
    }

    await createFollowUpAssignment({
      coupleId,
      category: assignment.category,
      branch: 'repair',
      step: 2,
      parentAssignmentId: assignment.follow_up.parent_assignment_id,
      timezone,
      deliverImmediately: false, // day after step 1 is completed
      preferredVariant,
      triggeredByUserId,
    });
    return;
  }

  // Score branches: only scale-format daily assignments can trigger.
  if (!canScoreTriggerFollowUp(assignment)) return;

  const scores = extractScores(responses);
  if (!scores) {
    console.log(`Scale assignment ${assignmentId} missing scores, no follow-up evaluation`);
    return;
  }

  const scaleConfig: ScaleConfig = assignment.scale_config || DEFAULT_SCALE_CONFIG;
  const branch = evaluateFollowUpBranch(scores[0], scores[1], scaleConfig);
  if (!branch) return;

  // Category comes from the parent assignment (denormalized at delivery);
  // fall back to the prompt doc for assignments created before denormalization.
  let category = assignment.category;
  if (!category && assignment.prompt_id) {
    const promptDoc = await db.collection('prompts').doc(assignment.prompt_id).get();
    category = promptDoc.data()?.category;
  }
  if (!category) {
    console.log(`Assignment ${assignmentId} has no category, skipping follow-up`);
    return;
  }

  await createFollowUpAssignment({
    coupleId,
    category,
    branch,
    step: 1,
    parentAssignmentId: assignmentId,
    timezone,
    // deepener is created immediately (same session, shown at reveal);
    // divergence and repair step 1 are delivered the next day.
    deliverImmediately: branch === 'deepener',
    triggeredByUserId,
  });
}

// ============================================
// PUBLIC: Activate Due Scheduled Follow-Up
// ============================================

/**
 * Called from deliverPromptToCouple before daily prompt selection.
 * If a scheduled follow-up is due today (or overdue), activate it instead of
 * creating a new daily prompt — a follow-up day replaces the daily prompt.
 * Returns true when a follow-up was activated.
 */
export async function activateDueFollowUp(
  coupleId: string,
  today: string
): Promise<boolean> {
  // Uses the existing composite index (couple_id + assignment_kind + status)
  const scheduledSnap = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assignment_kind', '==', 'follow_up')
    .where('status', '==', 'scheduled')
    .get();

  const scheduled = scheduledSnap.docs.map((doc) => ({
    ref: doc.ref,
    assigned_date: doc.data().assigned_date as string,
  }));

  const due = findDueScheduledFollowUp(scheduled, today);
  if (!due) return false;

  await due.ref.update({
    status: 'delivered',
    assigned_date: today, // catch up overdue follow-ups to today
    delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Neutral follow-up copy — warm, quiet, direct
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  const memberIds: string[] = coupleDoc.data()?.member_ids || [];
  for (const userId of memberIds) {
    await sendPushNotification(userId, {
      title: APP_NAME,
      body: "Today's follow-up is ready.",
    }, { type: 'prompt' });
  }

  console.log(`Activated scheduled follow-up for couple ${coupleId} on ${today}`);
  return true;
}
