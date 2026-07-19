// Pure gating logic for the premium model (SEV-0 #8).
//
// One flag governs everything: FEATURES.premiumGates. When it is false the
// app behaves exactly as it did before — everything free. When it is true:
//
//   Always free, forever:
//     - the daily prompt loop (question, answer, seal, reveal, reactions)
//     - ANSWERING an Explore question the partner sent (never block the
//       recipient), and browsing Explore
//     - skipping a follow-up
//     - current-month Hearth embers AND the current-month couch queue,
//       including the "we talked" mark — the talk ritual is the product's
//       hook, never advertised in the header and then locked
//
//   Premium (trial / subscription):
//     - the follow-up question itself (deepener / repair / divergence)
//     - Hearth history (pre-current-month) and trends
//     - initiating an Explore send
//
// These functions are pure so the gate map is unit-testable without
// rendering. Entitlement (couple-scoped) comes from useSubscription.

export interface PremiumGateInput {
  /** FEATURES.premiumGates — the single flag that turns the model on. */
  gatesEnabled: boolean;
  /** Couple-scoped entitlement from useSubscription. */
  isPremium: boolean;
  /** True while entitlement is still resolving — never lock during it. */
  isPremiumLoading?: boolean;
}

export interface PremiumGateMap {
  /** The core ritual — hard-wired free, never locked. */
  dailyPromptLocked: boolean;
  /** Answering a question the partner sent — hard-wired free. */
  exploreAnswerLocked: boolean;
  /** The follow-up question (context line always stays visible). */
  followUpLocked: boolean;
  /** Tapping Respond on a fresh Explore prompt (initiating a send). */
  exploreSendLocked: boolean;
  /**
   * Hearth history (pre-current-month) and trends. The couch queue is NOT
   * behind this: free couples keep the queue built from current-month
   * completions — callers derive it from the currentMonthOnly() slice.
   */
  hearthHistoryLocked: boolean;
  /**
   * The Us view's alignment map and movement sections. The couple header
   * and side-by-side rows stay free; locked sections render the honest
   * teaser (real category names, blurred states).
   */
  usViewLocked: boolean;
}

/**
 * Resolve the full gate map for the current entitlement state.
 * While entitlement is still loading, everything stays open — a premium
 * couple must never see a flash of locked content.
 */
export function premiumGates(input: PremiumGateInput): PremiumGateMap {
  const locked =
    input.gatesEnabled && !input.isPremium && !(input.isPremiumLoading ?? false);
  return {
    dailyPromptLocked: false,
    exploreAnswerLocked: false,
    followUpLocked: locked,
    exploreSendLocked: locked,
    hearthHistoryLocked: locked,
    usViewLocked: locked,
  };
}

/** True when the date falls in the same calendar month (user-local). */
export function isSameCalendarMonth(
  date: Date | null,
  now: Date = new Date()
): boolean {
  return (
    date != null &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

/**
 * The free Hearth window: completions from the current calendar month only.
 * Returns a new array — the input is never mutated.
 */
export function currentMonthOnly<T extends { completedAt: Date | null }>(
  items: readonly T[],
  now: Date = new Date()
): T[] {
  return items.filter((item) => isSameCalendarMonth(item.completedAt, now));
}

export interface PairingPaywallInput {
  gatesEnabled: boolean;
  isPremium: boolean;
  isPremiumLoading: boolean;
  alreadySeen: boolean;
}

/**
 * The trial moment: shown exactly once after pairing completes, and never
 * to a user whose couple is already premium. While entitlement is still
 * loading we skip it entirely — the flow is never blocked on a network call.
 */
export function shouldShowPairingPaywall(input: PairingPaywallInput): boolean {
  return (
    input.gatesEnabled &&
    !input.isPremium &&
    !input.isPremiumLoading &&
    !input.alreadySeen
  );
}
