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
  sendWeeklyRecaps, // kept: recap references prompt completions only (v1-visible)
  sendResponseReminders,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // dateNightReminder,
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

export * from './coaching';
export * from './users';

export {
  onResponseSubmitted,
  onReactionAdded,
  onCheckInSubmitted,
  onChatMessageCreated,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // deliverCheckIn,
} from './triggers';

export * from './admin';
export * from './alerting';

export {
  submitMorningCheckin,
  sendSpark,
  submitSparkGuess,
  submitReflection,
  submitMissionResponse,
  // v1 scope: disabled — hidden feature (see src/config/features.ts in app)
  // deliverMorningCheckin,
  // deliverEveningReflection,
} from './engines';
