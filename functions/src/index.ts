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

// Notification policy (founder directive 2026-07-21): exactly TWO push
// events — "a new prompt is ready" (daily delivery, follow-up delivery,
// partner-sent Explore question) and "your partner responded" (first answer
// nudge, reveal ready). Everything else is un-exported below AND must be
// deleted from prod at deploy time — see functions/V1-SCOPE.md.
//
// export {
//   sendResponseReminders, — reminder pushes ("still waiting" cadence) removed
//   dateNightReminder, — hidden feature
//   sendWeeklyRecaps, — hidden feature
// } from './notifications';

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
  // Notification policy 2026-07-21: reaction pushes removed — a reaction is
  // not one of the two allowed events (new prompt / partner responded).
  // onReactionAdded,
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
