// Export barrel for Cloud Functions.
//
// v1 scope: modules containing disabled functions use explicit named exports
// so hidden-feature schedules are not deployed. Removing an export does NOT
// undeploy an already-deployed function — see functions/V1-SCOPE.md for the
// firebase functions:delete commands that must run at deploy time.

export {
  deliverDailyPrompts,
  triggerPromptDelivery,
  expireStalePrompts,
  graduatePrompts,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // checkStreakBreaks,
} from './prompts';

export {
  sendResponseReminders,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // dateNightReminder,
  // v1 scope: disabled — weekly recap surface is hidden; pushes "Your week
  // together is ready." for a screen the user cannot reach in v1.
  // sendWeeklyRecaps,
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
  onReactionAdded,
  onChatMessageCreated,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // deliverCheckIn,
  // onCheckInSubmitted, — pushes partner check-in notifications; check-ins are hidden in v1
} from './triggers';

export { onCompletionDiscussed } from './hearth';

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
