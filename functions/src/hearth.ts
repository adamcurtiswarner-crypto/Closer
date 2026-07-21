import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  db,
  CompletionSignal,
  DEFAULT_SCALE_CONFIG,
  ScaleConfig,
  logEvent,
  reportError,
} from './shared';
import { evaluateFollowUpBranch, extractScores } from './followUps';

// ============================================
// HEARTH (v1)
//
// Answered-prompts review + the mutual "we talked" ritual.
//
// At completion time (onResponseSubmitted in triggers.ts) each
// prompt_completions doc is stamped with a signal derived from the two
// scale scores — the EXACT same thresholds/precedence as the follow-up
// branch logic (divergence > repair > deepener), with 'steady' when no
// branch fires and null for non-scale completions.
//
// For 'repair' and 'divergence' completions the doc also gets an empty
// `discussed` map. Each partner marks "we talked" by writing
// discussed.<uid> = serverTimestamp() directly (security rules confine
// that write to the discussed map). The onCompletionDiscussed trigger
// below stamps discussed_at once both marks are present. (The first-mark
// partner nudge push was removed 2026-07-21 — notification policy allows
// only "new prompt ready" and "partner responded".)
// ============================================

// ============================================
// PURE DECISION HELPERS (unit tested directly)
// ============================================

/**
 * Computes the completion-time signal from the embedded responses.
 * Reuses evaluateFollowUpBranch — the single source of truth for the
 * divergence > repair > deepener thresholds and precedence.
 *
 * - non-scale completion            -> null
 * - scale but missing/partial scores -> null (cannot evaluate)
 * - no branch fires                  -> 'steady'
 */
export function computeCompletionSignal(
  isScale: boolean,
  responses: Array<{ response_score?: number | null }>,
  scaleConfig: ScaleConfig = DEFAULT_SCALE_CONFIG
): CompletionSignal | null {
  if (!isScale) return null;
  const scores = extractScores(responses);
  if (!scores) return null;
  return evaluateFollowUpBranch(scores[0], scores[1], scaleConfig) ?? 'steady';
}

/**
 * Returns the uid keys present in `after` but absent from `before` —
 * the partners who just marked "we talked" in this update.
 */
export function discussedKeysAdded(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  return Object.keys(after).filter((uid) => !(uid in before));
}

// ============================================
// TRIGGER: "We Talked" Mark on a Completion
// ============================================

export const onCompletionDiscussed = functions.firestore
  .document('prompt_completions/{completionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const beforeDiscussed = (before.discussed || {}) as Record<string, unknown>;
    const afterDiscussed = (after.discussed || {}) as Record<string, unknown>;

    // Bail immediately unless a uid key was ADDED to the discussed map.
    // This guards refires from every other update to the doc — reactions,
    // memory saves, and this trigger's own discussed_at write below.
    const addedUids = discussedKeysAdded(beforeDiscussed, afterDiscussed);
    if (addedUids.length === 0) return null;

    const coupleId: string | null = after.couple_id || null;
    if (!coupleId) return null;

    try {
      const coupleDoc = await db.collection('couples').doc(coupleId).get();
      const memberIds: string[] = coupleDoc.data()?.member_ids || [];
      const membersNotMarked = memberIds.filter((id) => !(id in afterDiscussed));

      if (memberIds.length > 0 && membersNotMarked.length === 0) {
        // Both partner keys present — the completion is tended.
        // Idempotent: skip if discussed_at was already stamped.
        if (after.discussed_at) return null;

        await change.after.ref.update({
          discussed_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        await logEvent('completion_tended', addedUids[0], coupleId, {
          completion_id: context.params.completionId,
          couple_id: coupleId,
          category: after.category || null,
          signal: after.signal || null,
        });

        // No push on the second mark — the ritual completes quietly.
        return null;
      }

      // First mark: no push. Notification policy (2026-07-21): the only
      // push events are "new prompt ready" and "partner responded" — the
      // partner discovers the waiting mark in the app. The trigger still
      // exists for the discussed_at settle above.
    } catch (err) {
      await reportError('onCompletionDiscussed', err, {
        coupleId: coupleId || undefined,
        extra: { completionId: context.params.completionId },
      });
    }

    return null;
  });
