/**
 * Reveal dwell gate — pure decision logic for the Today screen.
 *
 * When both partners answer a scored prompt, the server creates a same-session
 * deepener follow-up. Its arrival via onSnapshot swaps the surfaced assignment,
 * which used to flip the screen from the completion reveal straight back to
 * 'prompt' mode before the couple ever dwelled on the reveal. These helpers
 * decide when to hold the reveal and when/how the deepener card lands below it.
 */

/** AsyncStorage key marking a completion reveal as seen (shared with CompletionMoment). */
export function revealSeenKey(assignmentId: string): string {
  return `reveal_seen_${assignmentId}`;
}

/** Minimum time after the reveal mounts before the deepener card may land. */
export const DEEPENER_MIN_DELAY_AFTER_REVEAL_MS = 2600;

interface DeepenerCandidate {
  assignmentKind: string;
  followUp: { branch: string; parentAssignmentId: string } | null;
}

/**
 * True when `assignment` is the same-session deepener spawned by the
 * just-completed assignment currently held in the reveal. Next-day follow-ups
 * (repair/divergence) never match: their branch differs and they arrive in a
 * fresh session where no reveal is held.
 */
export function isSameSessionDeepener(
  assignment: DeepenerCandidate | null | undefined,
  heldRevealAssignmentId: string | null | undefined
): boolean {
  if (!assignment || !heldRevealAssignmentId) return false;
  return (
    assignment.assignmentKind === 'follow_up' &&
    assignment.followUp?.branch === 'deepener' &&
    assignment.followUp.parentAssignmentId === heldRevealAssignmentId
  );
}

/**
 * Entrance delay for the deepener card so it never lands earlier than
 * DEEPENER_MIN_DELAY_AFTER_REVEAL_MS after the reveal mounted. If the reveal
 * has already been on screen long enough, the card enters immediately.
 */
export function deepenerEntranceDelay(revealMountedAt: number, now: number): number {
  const elapsed = Math.max(0, now - revealMountedAt);
  return Math.max(0, DEEPENER_MIN_DELAY_AFTER_REVEAL_MS - elapsed);
}

// ─── Relationship stage prompt demotion (Fix: stop offering after 3 views) ───

export const STAGE_PROMPT_MAX_VIEWS = 3;

/**
 * Whether the "Help us personalize" stage prompt should still be offered.
 * Stops after the user dismisses it, or after it has been shown (and left
 * unanswered) STAGE_PROMPT_MAX_VIEWS times.
 */
export function shouldOfferStagePrompt(dismissed: boolean, viewCount: number): boolean {
  return !dismissed && viewCount < STAGE_PROMPT_MAX_VIEWS;
}
