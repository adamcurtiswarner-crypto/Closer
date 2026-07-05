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

## Audited and kept

- **`sendWeeklyRecaps`** (`src/notifications.ts`, Sunday 6 PM PT) — kept. The
  recap gates on `prompt_completions` for the current week and the notification
  copy is "Your week together is ready." It references prompt responses only —
  no streaks, check-ins, goals, or other hidden features.
- **`onResponseSubmitted`** (`src/triggers.ts`) — partner notification copy
  audited: "answered today's prompt. Your turn — takes 2 minutes." and
  "answered too. Tap to reveal both responses." No hidden-feature references,
  no exclamation points, no emojis. No changes needed. (The trigger still
  writes streak fields to the couple doc internally, which is fine — no
  user-facing surface.)
- All callables (including hidden-feature callables like `submitMorningCheckin`,
  `sendSpark`, `generateCoachingInsight`) remain exported. Deployed-but-unused
  callables send nothing on their own.

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
```

Then redeploy the remaining functions:

```bash
firebase deploy --only functions --project stoke-5f762
```

Note: `firebase deploy --only functions` will also prompt to delete functions
that are deployed but no longer exported; the explicit `functions:delete`
commands above make the removal deliberate and scriptable.
