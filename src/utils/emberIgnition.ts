/**
 * Decides whether the connection ember plays its ignition or settles
 * straight to the breath.
 *
 * This lives in a util rather than inside ConnectionHeader because the
 * Today screen wraps its body in `<Animated.View key={mode}>` — the whole
 * subtree (header included) is UNMOUNTED and remounted the instant the day
 * flips from 'waiting' to 'complete'. A mount-time `useRef` inside the
 * header therefore always captured an already-complete day and the ignition
 * could never fire (caught in adversarial review before the build, 2026-08-02;
 * a component-level rerender() test had passed it because rerender keeps the
 * same instance and never crosses the remount).
 *
 * The state is held in a ref on the Today screen itself, which survives the
 * keyed remount, and the answer is passed down as a plain prop.
 */

export interface EmberIgnitionState {
  assignmentId: string | null;
  /** We observed THIS assignment in an incomplete state during this mount. */
  sawIncomplete: boolean;
}

export const INITIAL_EMBER_IGNITION: EmberIgnitionState = {
  assignmentId: null,
  sawIncomplete: false,
};

/** Fold the current render into the ignition state. Pure and idempotent. */
export function nextEmberIgnition(
  prev: EmberIgnitionState,
  assignmentId: string | null,
  isComplete: boolean
): EmberIgnitionState {
  if (prev.assignmentId !== assignmentId) {
    // A new day: we only "saw it incomplete" if it arrives incomplete.
    return { assignmentId, sawIncomplete: !isComplete && assignmentId != null };
  }
  if (prev.sawIncomplete || isComplete) return prev;
  return { assignmentId, sawIncomplete: true };
}

/**
 * True only when the day completed while the screen was open. Arriving at an
 * already-complete day (fresh launch, tab return) settles to the breath — the
 * ceremony belongs to the moment it happened.
 */
export function isEmberIgniting(
  state: EmberIgnitionState,
  isComplete: boolean
): boolean {
  return isComplete && state.sawIncomplete;
}
