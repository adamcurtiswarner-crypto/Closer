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
} as const);

export type FeatureFlag = keyof typeof FEATURES;
