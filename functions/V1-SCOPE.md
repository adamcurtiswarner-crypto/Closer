# V1 Scope — Cloud Functions

v1 ships only scored daily prompts + follow-ups. Features that are hidden in the
app (streaks, check-ins, date nights, Four Engines, coaching surfaces) must not
send user-facing push notifications. This document records which functions were
disabled in the export barrel (`src/index.ts`) and what must happen at deploy time.

Functions remain implemented in their source modules — only their exports are
commented out. Restore a feature by uncommenting its line in `src/index.ts` and
redeploying.

## Disabled functions

| Function | Module | Schedule | Reason |
|---|---|---|---|
| `checkStreakBreaks` | `src/prompts.ts` | daily 4:30 AM PT | Pushes streak-break notifications; streaks are hidden in v1 |
| `deliverCheckIn` | `src/triggers.ts` | Sunday 10 AM PT | Pushes weekly check-in invitations; check-ins are hidden in v1 |
| `dateNightReminder` | `src/notifications.ts` | daily 9 AM PT | Pushes date night reminders; date nights are hidden in v1 |
| `deliverMorningCheckin` | `src/engines.ts` | daily 8 AM PT | Four Engines morning check-in push; engines are hidden in v1 |
| `deliverEveningReflection` | `src/engines.ts` | daily evening | Four Engines evening reflection push; engines are hidden in v1 |
| `detectChurnRisk` | `src/analytics.ts` | daily 5 AM PT | Sends a user-facing re-engagement push to high-risk couples ("It's been a while. A new prompt is waiting for you."). Disabled because it is user-facing. Side effect: the internal `churn_risk_level` / `consecutive_missed_prompts` writes to couple docs also stop while disabled. |
| `sendWeeklyRecaps` | `src/notifications.ts` | Sunday 6 PM PT | Pushes "Your week together is ready." — the weekly recap surface is hidden in v1, so the push is a dead end |
| `computeRelationshipPulse` | `src/coaching.ts` | Monday 3 AM PT | Pushes "Your weekly insight is ready." for the hidden coaching surface |
| `triggerPulseComputation` | `src/coaching.ts` | callable | Routes into the same pulse computation + push as `computeRelationshipPulse` |
| `generateCoachingInsight` | `src/coaching.ts` | callable | Coaching surface is hidden in v1; insight generation routes into the pulse push path |
| `submitMorningCheckin` | `src/engines.ts` | callable | Pushes partner notifications for the hidden Four Engines morning check-in |
| `sendSpark` | `src/engines.ts` | callable | Pushes spark notifications; Four Engines is hidden in v1 |
| `submitSparkGuess` | `src/engines.ts` | callable | Pushes spark-guess result notifications; Four Engines is hidden in v1 |
| `onCheckInSubmitted` | `src/triggers.ts` | Firestore trigger | Pushes partner check-in notifications; check-ins are hidden in v1 |

## Audited and kept

- **`onResponseSubmitted`** (`src/triggers.ts`) — partner notification copy
  audited: "answered today's prompt. Your turn — takes 2 minutes." and
  "answered too. Tap to reveal both responses." No hidden-feature references,
  no exclamation points, no emojis. No changes needed. (The trigger still
  writes streak fields to the couple doc internally, which is fine — no
  user-facing surface.)
- **`submitReflection` / `submitMissionResponse`** (`src/engines.ts`) — kept
  exported. Audited: neither sends a push notification on its own, and nothing
  in the v1 UI can invoke them.

## Deploy-time commands (run manually — not run by CI or agents)

Removing an export does NOT undeploy an already-deployed function or its Cloud
Scheduler job. After merging this change, delete the deployed schedules:

```bash
firebase functions:delete checkStreakBreaks --project stoke-5f762
firebase functions:delete deliverCheckIn --project stoke-5f762
firebase functions:delete dateNightReminder --project stoke-5f762
firebase functions:delete deliverMorningCheckin --project stoke-5f762
firebase functions:delete deliverEveningReflection --project stoke-5f762
firebase functions:delete detectChurnRisk --project stoke-5f762
firebase functions:delete sendWeeklyRecaps --project stoke-5f762
firebase functions:delete computeRelationshipPulse --project stoke-5f762
firebase functions:delete triggerPulseComputation --project stoke-5f762
firebase functions:delete generateCoachingInsight --project stoke-5f762
firebase functions:delete submitMorningCheckin --project stoke-5f762
firebase functions:delete sendSpark --project stoke-5f762
firebase functions:delete submitSparkGuess --project stoke-5f762
firebase functions:delete onCheckInSubmitted --project stoke-5f762
```

Then redeploy the remaining functions:

```bash
firebase deploy --only functions --project stoke-5f762
```

Note: `firebase deploy --only functions` will also prompt to delete functions
that are deployed but no longer exported; the explicit `functions:delete`
commands above make the removal deliberate and scriptable.
