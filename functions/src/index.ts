// Export barrel for Cloud Functions.
//
// v1 scope: modules containing disabled functions use explicit named exports
// so hidden-feature schedules are not deployed. Removing an export does NOT
// undeploy an already-deployed function — see functions/V1-SCOPE.md for the
// firebase functions:delete commands that must run at deploy time.

// MUST stay first: emulator-only repair of admin.firestore statics dropped
// by the firebase-tools runtime proxy (no-op in production). See the file
// header for the full story.
import './emulatorShim';

export {
  deliverDailyPrompts,
  triggerPromptDelivery,
  expireStalePrompts,
  graduatePrompts,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // checkStreakBreaks,
} from './prompts';

// Notification policy (founder directive 2026-07-21, amended 2026-08-02):
// push only fires for reward events, never guilt — "a new prompt is ready"
// (daily delivery, follow-up delivery, partner-sent Explore question),
// "your partner responded" (first answer nudge, reveal ready), "your
// partner reacted" (onReactionAdded, re-enabled 2026-08-02), and the weekly
// recap ("Your week together is ready.", Sundays, only for couples with a
// completion that week). Reminder cadence, streak-break, and churn pushes
// stay dead — see functions/V1-SCOPE.md.
//
// One transactional exception: "Your partner has left Stoke." (users.ts,
// account deletion + unlink paths). It's a one-time relationship-state
// change the partner must learn about, not an engagement event.
//
export {
  // Re-enabled 2026-08-02 (founder approval, Hooked audit): the recap is the
  // PRD's own "Memory Artifact" loop step — zero guilt content, only sent to
  // couples who completed a prompt that week. Lands on Hearth, not the
  // hidden memories tab.
  sendWeeklyRecaps,
  // sendResponseReminders, — reminder pushes ("still waiting" cadence) removed
  // dateNightReminder, — hidden feature
} from './notifications';

export {
  aggregateWeeklyMetrics,
  getDashboardMetrics,
  assignExperimentVariant,
  createExperiment,
  exportEventsToBigQuery,
  triggerBigQueryExport,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // Sends a user-facing re-engagement push to high-risk couples; also writes
  // churn_risk_level to couple docs, which stops while disabled.
  // detectChurnRisk,
} from './analytics';

export {
  generateAIPrompts,
  autoGeneratePrompts,
  cleanupCoachingInsights,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // All three route into the relationship-pulse pipeline, which pushes
  // "Your weekly insight is ready." for the hidden coaching surface.
  // computeRelationshipPulse,
  // triggerPulseComputation,
  // generateCoachingInsight,
} from './coaching';

export * from './users';

export { acceptInvite } from './invites';

export {
  onResponseSubmitted,
  // Re-enabled 2026-08-02 (founder approval, Hooked audit): a reaction is a
  // reward from a named human — the "partner responded" family, not a nag.
  // Copy is brand-voice (no emoji), gated on notify_partner_response.
  onReactionAdded,
  // Chat is hidden in v1; its push source goes with it.
  // onChatMessageCreated,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // deliverCheckIn,
  // onCheckInSubmitted, — pushes partner check-in notifications; check-ins are hidden in v1
} from './triggers';

// Notification policy 2026-07-21: the Hearth "mark it too" nudge push is
// removed. The trigger ALSO settles discussed_at when both marks exist, so
// the function stays exported with its push stripped (see hearth.ts).
export { onCompletionDiscussed } from './hearth';

// Hourly synthetic-couple canary: exercises the real response -> completion
// pipeline in a shadow couple and reports failures to error_logs.
export { canaryPipelineCheck } from './canary';

export * from './admin';
export * from './alerting';

export {
  submitReflection,
  submitMissionResponse,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // deliverMorningCheckin,
  // deliverEveningReflection,
  // These callables push partner notifications for hidden Four Engines surfaces:
  // submitMorningCheckin,
  // sendSpark,
  // submitSparkGuess,
} from './engines';
