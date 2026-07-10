// ============================================
// FEATURE FLAGS (v1 launch scope)
// ============================================
//
// v1 ships only scored daily prompts by category plus score-triggered
// follow-ups. Everything else is hidden, not deleted — flip a flag to
// true to restore that feature post-launch.

export const FEATURES = Object.freeze({
  home: false,
  memories: false,
  insights: false,
  streaks: false,
  goals: false,
  checkIns: false,
  coaching: false,
  wishlist: false,
  dateNights: false,
  games: false,
  chat: false,
  engines: false, // morning-checkin, evening-reflection, surprise-mission, partner-guess, todays-spark
  resources: false,
  explore: true, // shown as the "Categories" tab
  hearth: true, // ember grid + couch queue over prompt_completions
  // ONE flag for the premium model (SEV-0 #8). False = the app behaves
  // exactly as before, everything free. True = the daily prompt loop stays
  // free forever; follow-up questions, Hearth history/trends/couch queue,
  // and initiating Explore sends live behind Stoke Premium.
  // Gate logic: src/utils/premiumGates.ts. Entitlement: useSubscription.
  premiumGates: true,
} as const);

export type FeatureFlag = keyof typeof FEATURES;
