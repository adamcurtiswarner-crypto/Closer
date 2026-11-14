# Stoke Studio Status
*Last updated: 2026-11-14 — **CEO cycle: the submission gate is already open and nobody checked.** Privacy/terms are live (200), rules are deployed and byte-identical to HEAD, every changed Cloud Function is deployed, prod content is verified (405 scored prompts, all 6 Explore collections populated), and build 75 + OTA `53ea17ab` is the current product with no native change. What remains is four founder items and about a day of studio copy/gating work. Two scheduled functions have been failing silently since Nov 10.*

*Previous: 2026-11-12 — CEO cycle: P0 fixes shipped via OTA `53ea17ab`. Previous: 2026-08-22 — error-report review, D1 deployed, build 73 submitted.*

**SUBMIT-BY: 2026-11-24 (committed) · target Fri 2026-11-21.** Moved in writing by the CEO on 2026-11-14, per the 8/3 governance rule. The 9/1 commitment was missed by 74 days and never moved — the second time that failure mode has run unchecked. Thanksgiving is Thu 11/26, so 11/24 keeps a two-day buffer ahead of the holiday.

## THE HEADLINE (read this first)

**Two scheduled functions have been failing every day since at least Nov 10, and one of them is the account-purge job we promise in the privacy policy.**

Both fail with `FAILED_PRECONDITION: query requires an index`:

| Function | Missing composite index | Consequence |
|---|---|---|
| `cleanupDeletedAccounts` | `users(is_deleted, scheduled_purge_at)` | **The 30-day purge of deleted accounts did not run.** The privacy policy and the App Store account-deletion commitment both rest on it. |
| `aggregateWeeklyMetrics` | `prompt_assignments(prompt_id, delivered_at)` | Weekly metrics silently stopped aggregating (`functions/src/analytics.ts:~105`). |

**Measured, so the claim stays honest: production holds ZERO deleted users.** The purge job was broken and would have failed the first time it was actually needed, but nothing was waiting for it, so no user's data outlived the 30-day promise. A broken control, not a breached one — worth fixing at exactly this urgency and not overstating to Adam or to anyone else.

Neither index existed in `firestore.indexes.json`. **And nothing alerted, again.** `error_logs` holds 0 docs, so `checkErrorAlerts` never saw these — it scanned `error_logs` only, and neither scheduler wrapped its top-level failure in `reportError`. `cleanupDeletedAccounts` guarded every per-user step but not the query that selects the users; `aggregateWeeklyMetrics` had no try/catch at all. This is the identical mechanism that hid the `documentId() in` outage for 20 days and the BigQuery outage for 24 days: **the failure is visible in Cloud Logging and invisible to every alerting path we own.** Three outages, one cause.

## Shipped this cycle (2026-11-14, studio — on Adam's go)

Everything below is on main's working tree, green, and NOT yet committed. The only production change made today is the index deploy.

**1. The compliance fix, deployed.** Both missing composite indexes added to `firestore.indexes.json` and deployed; both verified **READY**, and both previously-failing queries re-run against production successfully. Tonight's 03:00 PT run will work.

**2. The mechanism behind all three outages, closed.** New `runScheduled(name, fn)` wrapper in `shared.ts` puts a scheduled function's *entire* body inside one reporting path, so a top-level failure writes `error_logs` and reaches `checkErrorAlerts`, then rethrows so Cloud Scheduler still records the failure. Applied to `cleanupDeletedAccounts`, `aggregateWeeklyMetrics` and `checkErrorAlerts` itself (which had no try/catch — the alerting function could fail silently). Wrapping the whole body, not the one query we happened to know about, is the point.

**3. The write-only sink, finally read.** `checkErrorAlerts` now scans `/events` for `client_error` docs — the telemetry `logger.reportQueryDenied` has written since July that *nothing has ever read*. Uses a cursor in `admin_state/client_error_alerts`, not an `alerted` flag, because those docs are client-written and have no such field (a Firestore equality on a missing field matches nothing, so the obvious implementation would have silently never fired). First run initializes the cursor instead of alerting on months of diagnosed backlog; with no admin recipients the cursor is **not** advanced, so denials resurface. The alert names the failing call site and groups by context.

**4. Explore Revisit works.** The tap now opens the reveal sheet (`setRevealAssignmentId`) instead of setting state only a `partial` branch could consume, and logs `explore_revisit_opened` instead of inflating `explore_prompt_completed`. Both event names are now in the typed union, removing two `as any` casts.

**5. Try This card.** Device-local date key (was UTC, so it wrote tomorrow's doc after ~7 PM ET); a denied write is reported via `logger.reportQueryDenied` instead of an empty `catch {}`; copy no longer promises a learning loop that does not exist ("Noted." / "Got it."); and `pickDailyAction` falls back to the full pool for an unrecognised `love_language`, which previously made the index `NaN` and threw inside a render path — taking the whole app down through the root ErrorBoundary, not just the card.

**6. Every client listener now reports its errors.** Added `onError` to both `usePrompt` listeners — the two that drive the entire Today screen and had none, which is precisely how a denial stayed invisible for 20 days — plus `useGoals`, `useWishlist`, `useDateNights` and `home.tsx`. Those four are flagged-off features; fixed rather than allowlisted so re-enabling one cannot reintroduce the hole.

**7. Hearth no longer leaks history during entitlement load.** Gates stay deliberately open while RevenueCat resolves so a premium couple never sees a lock flash; the cost was a free couple rendering its full history for three network calls. The shimmer now covers entitlement load, as the Us view already did.

**8. The rules suite runs again, and cannot rot again.** `scripts/with-java.js` resolves a working JRE (the macOS `/usr/bin/java` stub and keg-only Homebrew openjdk made `npm run test:rules` impossible on a stock machine, documented nowhere). The one red test was stale — it asserted a stranger could read a pending couple, which `b62ba46` deliberately ended — now flipped, plus a new test for the inviter's own read. **Rules: 70/70 green from a clean shell.** A new CI job runs `test:rules` and `test:flows` with `actions/setup-java`; neither had ever run in CI.

**9. The governance control that was promised in August.** `scripts/check-submit-by.js` + a `schedule`-triggered workflow fail once SUBMIT-BY passes, reading the date out of this file so the control and the record cannot drift. Verified both ways: it reports 10 days remaining today, and against the old 9/1 date it fails with "74 days ago".

**New guards, each proved to fail when the behaviour regresses** (a guard that cannot fail is not a guard): `shared.runScheduled.test.ts` (4), `alerting.clientErrors.test.ts` (6), `tryThisCard.test.tsx` (9), Revisit tests in `exploreStates.test.tsx` (3), Hearth entitlement-load tests (2), and the query-shape guard extended to scan **all** of `src/` and `app/` — not just `src/hooks/` — plus a new structural assertion that every `onSnapshot` in the client passes an error callback.

**Verification:** app **97 suites / 1005 tests** (was 96/988) · functions **27 / 542** (was 25/532) · rules **70/70** · `tsc` clean both sides · design lint 0 errors (890 warnings, unchanged).

**Corrections to the department reports themselves:** `promptText` is normalized to `''` at the read boundary (`useExplorePrompts.ts:84`), so ExploreRevisit cannot throw on it; `getSkippedFollowUpIds` already catches internally, so the `usePrompt` unhandled-rejection concern does not hold; the Us view's entitlement-loading skeleton survived the November redesign (`us.tsx:251`) — only Hearth was exposed; and today's "Delivered prompts to 5 couples" counts *attempts*, not sends, because `deliverPromptToCouple` returns silently for an inactive couple while the caller still records the id (`prompts.ts:408` vs `:571`). The active-couple guard itself is sound — no push reached an ex. The misleading counter is logged in the backlog below, not fixed, because changing delivery accounting the day before a device pass is not worth the risk.

**The second headline: the gate everyone was waiting on has been open for days and the status file still said 404.**

`stoke.llc/privacy`, `/terms`, `/support` and the `web.app` equivalents all return **200**. The `firebase.json` hosting exclusion was removed and deployed — **from an uncommitted working tree**, which is why no record of it exists. "Apple's hard gate" was carried as the top blocker in this file for 103 days and had already been cleared.

## Verified state (2026-11-14 — measured, not claimed)

| Thing | Verified value | What the file said before |
|---|---|---|
| Hosted privacy / terms / support | **200** (both domains) | "stoke.llc still 404" — wrong |
| Deployed Firestore ruleset | released **2026-11-07T20:16Z**, byte-identical to HEAD `firestore.rules`; `action_feedback`, `wasCoupleMember`, `former_member_ids` all present | unverified |
| Cloud Functions | 32 deployed; every function changed since Aug is live (`onCompletionClarified` Nov 9, `onReactionAdded` + `deleteAccount` + `generateAIPrompts` Nov 7). `onResponseSubmitted` unchanged since its Aug 2 deploy | unverified; P0 #7 wrongly credited to OTA |
| Current binary | **build 75** (`66d0b0e`), fingerprint `5fe901bb…` — **identical to build 73's fingerprint** | "73 is current" — wrong |
| Native surface since 75 | `git diff 66d0b0e..HEAD -- ios plugins patches package.json app.json` is **empty**. No runtimeVersion bump. **No build 76 required** | open question |
| Prod content | **405 scored prompts** (= seed exactly); all 6 Explore collections populated (65/75/25/25/130/25 = 345); 60 v5 prompts carry no collection (daily pool, correct); 132 follow-up templates | "60 scored prompts live" — stale by 345 |
| Tests | app **96 suites / 988** green · functions **25 / 532** green · tsc clean both sides | 96/988 confirmed |
| Rules suite | **68 / 69 — one RED**, and it cannot run at all without a Java PATH fix | "rules 69" — wrong |
| CI | runs tsc + `npm test` only. **Never runs `test:rules` or `test:flows`** | not recorded |
| BigQuery | dataset healthy, 6,192 rows, exports ran Nov 12/13/14 | resolved — confirmed |
| `/admins` | 1 doc, 1 live push token | resolved — confirmed |
| `/events` | 1,747 docs and shrinking (pruning works); 9 `client_error` docs, newest Aug 22 | "~4,000, unbounded" — stale |

## Live defects found this cycle (all new; none were on any list)

1. **Explore Revisit is a dead tap** — shipped 3 days ago. `explore.tsx:628-633` sets `viewingAssignmentId`, but the only consumer (`:579`) also requires `status === 'partial'` while Revisit lists only `completed`. Tapping a Revisit card does nothing, on the feature whose entire purpose is reopening answers. It also fires `logEvent('explore_prompt_completed')` on every tap, corrupting the completion metric. One-line fix: `setRevealAssignmentId(a.id)`.
2. **Free users cannot reach the Hearth at all**, while `gates.hearthBody` ("This month glows right here") and the draft listing both promise the current month. Hearth is no longer a tab (`_layout.tsx:226-228`, `href: null`); the only entries are the Us tile grid (locked for free users) and a "waiting" pill that renders only when the couch queue is non-empty. `hearth.tsx:51-100` implements the free window that nothing links to.
3. **Premium gates open during entitlement load.** `premiumGates.ts:86` locks only when `!loading`, and `useSubscription` starts `isLoading: true` at each of 10 call sites, clearing only after three RevenueCat network calls. Free users — and an App Review device on a slow sandbox network — see premium content, then a lock.
4. **Trial length contradicts itself.** Paywall CTA and both Terms documents say **21 days** (`en.json:457`, `terms-of-service.tsx:64`, `hosting/terms.html:92`); the last ASC record and `hosting/index.html` say **14**. A 3.1.2 accuracy rejection if ASC is still 14.
5. **The progressive trial does not exist.** `src/utils/trialPhase.ts` / `computeTrialState` is imported by nothing but its own test. Never advertise it.
6. **Try This card:** UTC date key (`TryThisCard.tsx:44`) violates the user-local-date doctrine and rolls over mid-evening in the US; a second tap hits `allow update: if false` and is swallowed by `catch {}`; the copy ("More like this coming") promises a learning loop that no code implements; hardcoded English; `dailyActions.ts:168-173` can throw into the root ErrorBoundary if `love_language` is an unexpected non-empty string.
7. **Today's two core listeners have no `onError`** (`usePrompt.ts:474`, `:516`) — the exact telemetry hole that hid the 20-day outage. A denial leaves Today showing stale data and reports nothing.
8. **`deliverDailyPrompts` overstates its own work.** `deliverPromptToCouple` returns silently for a non-active couple (`prompts.ts:408`), but the caller adds the id to `deliveredCouples` anyway (`:571`) — so today's "Delivered prompts to 5 couples" counts attempts, not sends. The guard is sound; the metric is not. Same defect `notifyCoupleMembers` was built to fix.
9. **The rules suite is red and unrunnable as shipped.** `/usr/bin/java` is the macOS stub; Homebrew openjdk is unlinked. Forced to run, it is 68/69 — the failure is a stale test (`firestoreRules.emulator.test.ts:746`) that still expects strangers to read pending couples, which `b62ba46` deliberately ended. Proof the suite has not run since Nov 6.

## Still structurally open (carried, confirmed open today)

- `checkErrorAlerts` still ignores `/events` `client_error` docs — the write-only sink, now implicated in a third outage.
- The hourly canary writes through the Admin SDK, so it structurally cannot detect a rules regression. It reported green through all three outages.
- `getReceipts` is called nowhere, so dead push tokens are never pruned.
- `/events` retention is still welded to the BigQuery export — a dataset outage disables pruning as a side effect.
- Zero GCP alert policies, notification channels or log-based metrics. `checkErrorAlerts` reaches Adam through one Expo push token with no email or SMS fallback.
- Sentry `environment` is set (`app/_layout.tsx:26`) but preview and TestFlight both report as "production".
- `deliverDailyPrompts` runs an unbounded serial `users` scan 96×/day. Not a cost problem (~$3.50/mo at 1,000 couples) but a 540s timeout risk at scale.
- Fixture couples (`sandbox-couple`, `uitest-visualp`) are still in prod, now `paused`.
- The hosted privacy page is dated **July 9, 2026** while the in-app policy says November 2026. Apple fetches the hosted one.
- `support@stoke.llc` and `privacy@stoke.llc` **receive no mail** — `dig MX stoke.llc` returns nothing — and both are published on the live site, in the policy, and in the in-app contact row.

## Critical path to submission

**Adam (~1h, and only he can do these):**
1. **ASC trial length** — set the annual intro offer to 21 days, or we change the copy back to 14. Decide which. Confirm whether the trial covers monthly. (15 min)
2. **A working support mailbox** — MX records for `stoke.llc` or a forwarder, then studio makes the address consistent everywhere. (20 min, external propagation)
3. **W-9 + banking / Paid Apps Agreement status** — unverifiable from here, startable for 100+ days. Blocks subscriptions going live, not review itself. (15 min + 24-48h external)
4. **The free-vs-premium decision for the merged Us/Hearth** — open since July and now distorting the gating code, the gate copy, the listing and the screenshots. Can a free couple see the tile grid and the current month, or is the whole screen premium? (defect 2 above)
5. **Device pass** — 75 min, 6 of 12 items need two phones. Then the explicit go for submission.

**Studio (~1.5 days, unattended, in this order):**
~~1. Deploy the two missing composite indexes; wrap both schedulers in `reportError`.~~ **DONE — indexes READY, both queries verified against prod.**
~~4. Fix Revisit, the premium-gate load flash, the Try This date/copy/throw, and add `onError` to the `usePrompt` listeners.~~ **DONE.**
~~5. Extend `checkErrorAlerts` to scan `/events` `client_error`.~~ **DONE.**
~~6. Fix the stale rules test, the Java PATH, and add `test:rules` + `test:flows` to CI.~~ **DONE — 70/70 from a clean shell.**
~~8. Build the `on: schedule` GitHub Action that fails once SUBMIT-BY passes.~~ **DONE.**

**Remaining, in order:**
1. **Commit the working tree** (today's fixes, `firebase.json`, the metadata doc, this file). Production hosting is live from an uncommitted tree — that is how the privacy/terms deploy went unrecorded for days.
2. **Deploy the functions** carrying items 2, 3 and the scheduler wrappers: `cleanupDeletedAccounts`, `aggregateWeeklyMetrics`, `checkErrorAlerts`. The indexes are live, so tonight's runs already succeed; the alerting improvements need this deploy.
3. **Publish an OTA** for the client fixes (Revisit, Try This, Hearth flash, listener telemetry). Runtime 2.0.0, no binary needed. Adam's call.
4. **Rewrite `hosting/privacy.html`** to match the in-app November policy, then redeploy hosting from a clean tree. Needs Adam's 15-minute legal read.
5. **Rewrite the listing** against the real app — 6 collections not 12 categories, Hearth merged into Us, "400+ questions" (405 verified in prod), drop "No other app does this", drop the insights and progressive-trial claims — then recapture the 16 frames on build 75 + OTA.
6. **Resolve the trial length** (21 in the app, 14 last recorded in ASC) and the free-vs-premium decision for the merged Us/Hearth. Both are Adam's.

**Backlog, deliberately not done today:** the `deliverDailyPrompts` attempt-vs-send counter (changing delivery accounting the day before a device pass is not worth the risk); `getReceipts` token pruning; `/events` TTL independent of BigQuery; GCP alert policies and a non-push alert channel; the Us/Hearth i18n gaps and the hardcoded English in TryThisCard and ExploreRevisit; splitting `explore.tsx` (1019 lines) and `us.tsx` (623) under the 800-line rule; deleting the dormant streak and churn code.

**No new binary.** Build 75 + OTA `53ea17ab` is the product. Cut 76 only if the device pass shows the first-launch bundle mismatch matters, and only on Adam's explicit ask.

## Governance

The 8/3 rule — no feature work while a submission runway is open unless the CEO moves the submit date in writing first — **was breached.** The Explore restructure, the Us/Hearth merge, Try This, collections, Love Language Tips and the paywall rewrite all landed Nov 6-11 against a submit date that had been missed since Sept 1 and never moved. The cost is not hypothetical: it produced defects 1-6 above, invalidated the screenshots and the listing, and shipped 12K lines to production that no device pass has ever touched.

Effective now: **feature freeze on main** until submission. Only device-pass fixes and ASC work. `docs/plans/v2-information-architecture.md` Phase 3 is post-launch and is not to be started. A daily one-line runway entry goes in this file until submit.

---

## CEO Cycle 2026-11-12 and earlier — prior headline (the `documentId() in` outage, now resolved and guarded)

**One bug explains every production error we have. `where(documentId(), 'in', [...])` is unsafe under any Firestore rule that dereferences `resource.data`.**

Firestore fans that query out into per-key lookups and evaluates rules once per key — **including keys with no document**. `resource` is null, `resource.data.couple_id` raises an evaluation error, and the **whole query** returns `permission-denied`. The `where('couple_id','==',…)` filter does not protect it; it is applied after rules evaluation. There is a second, independent failure: a hard cap around **20 keys**, and both of our call sites chunk at **30**.

Emulator-reproduced twice, independently, by Engineering and Testing against the live `firestore.rules`. Exactly two `documentId() in` call sites exist in the whole app — `useOpenDays.ts:78` and `useYourWords.ts:128` — and both are defective. That is the entire blast radius.

**What it has cost us, unnoticed, for 20 days:**

| Signature | Events | Reality |
|---|---|---|
| `useCompletionClarify.listener` | 16 | Fixed on main by `e0e8908`, **never shipped**. Also fixable on the *currently installed* build by a one-line rules change. |
| `useYourWords.assignmentJoin` | 3 | **Your Words has never shown a question to either founder.** 74 distinct assignment ids → first chunk of 30 → over the cap → denied → answers render with no prompt text. Indistinguishable from the intended post-unlink degraded state, so nothing signalled a fault. |
| `useOpenDays` | 2 | **Open Days has never worked once.** Not degraded — structurally dead. It returns non-empty only in a branch it can never reach: a real open day requires an absent response doc, and an absent doc denies the query. Shipped 8/2, has rendered nothing since. A missed question has no other entry point and the server expires it after 7 days. |

Low event counts are not low severity. They are the *catch* firing; the silent healthy-looking path is the norm.

**And we did not find out. Adam did, by exporting a CSV by hand.** `logger.reportQueryDenied` writes `client_error` docs to `/events` — and **nothing anywhere reads them.** `checkErrorAlerts` scans `error_logs` only (`functions/src/alerting.ts:22`). Populating `/admins` tomorrow would still not have surfaced these. The hourly canary writes through the Admin SDK, which bypasses rules by definition — our one live health probe is structurally incapable of detecting a rules regression, and it reported green throughout. Zero GCP alert policies, zero notification channels, zero log-based metrics exist.

## BUILD 73 — cut 2026-08-23, commit `938d1d6`

Build id `917d7c0c-e73e-4a7c-8132-4cae79f9c7d6` · build number **73** · runtime **2.0.0** · cut with `EXPO_NO_CAPABILITY_SYNC=1`. Built in **9m28s** (09:06 → 09:16). **Submitted to TestFlight** on Adam's go — submission `cdf95fbf-5408-4648-85cf-58da4e1b5df8`, uploaded to App Store Connect, Apple processing ~5-10 min. **73 replaces 72 as the current TestFlight build; 72 is superseded and should not be tested against.**

**`runtimeVersion` deliberately NOT bumped.** The 8/3 note called for moving off "2.0.0" because of native changes; `git diff 2a8e6b8..HEAD` over `ios/`, `plugins/`, `patches/`, `package.json` and `app.json` is **empty**, so 73 has the same native surface as the shipped 72 — those native changes had already gone out *in* 72. Bumping would have broken OTA compatibility with 72 for no cause.

**What 73 carries that 72 did not**
- clarify/reactions listener survives the moment before the completion doc exists (`e0e8908` + the rules null-guard, already live on 72 via rules)
- **Open Days works for the first time** — it had never rendered anything since shipping 8/2
- **Your Words shows questions** — the journal now carries its own copy of the prompt, so it survives an unlink, which the old join design never could
- sign-out hands the device push token back
- `member_ids` policy + `notifyCoupleMembers` choke point (server side already live)

**Pre-cut verification:** app 92 suites / 940 · functions 25 / 532 · rules 69 · tsc clean both sides. All 284 production responses backfilled with `prompt_text`/`category`.

**Before submission:** the 45-minute two-device pass. Risk-ordered, the three new items first — Your Words with real history (≥30 answers + a dissolved prior couple), Open Days catch-up (skip 2–3 days, confirm the chips render), and the reveal-moment listener. Then the existing push/RevenueCat items. Screenshots (16 frames) must be shot against **this** binary.

**Still gating submission, unchanged and founder-owned:** privacy/terms URLs (`/privacy` and `/terms` still 404; `stoke.llc` is not Firebase Hosting and has no MX records — recommend the `web.app` fallback), W-9 + banking, IAP screenshots, ASC display names.

## CEO Cycle 2026-08-23 — duplicate morning pushes (found by Adam, fixed and deployed)

Adam reported three identical "Today's prompt is ready." notifications back to back every morning. Not a device or Expo problem — **three separate server sends**, all landing on his one registered token, at 08:14 local.

**Cause 1 (fixed, deployed).** `deliverDailyPrompts` iterates onboarded users and delivers to `user.couple_id` **without ever checking the couple's status** — the comment above the query said "Find onboarded, active users with a couple" and the word *active* was enforced nowhere. `member_ids` is deliberately never cleared at breakup, so **both of the founders' long-deleted couples had been assigned a fresh prompt every single day and pushed both ex-partners.** `activateDueFollowUp` was also still firing for them. This is the 2026-07-09 SEV-0 "ex retains access / member_ids never cleared" resurfacing on a path the original fix did not cover. Beyond the noise, it means an ex keeps receiving notifications from a relationship that ended — a trust and review risk, not just a bug.

`isActiveCouple()` added in `shared.ts`, **fails closed** (missing/unreadable/unexpected status is not a send) and excludes the `canary` couple. Guard moved to the **top** of `deliverPromptToCouple`, ahead of follow-up activation; the couple-doc read that sat further down is reused, so delivery now costs one read fewer. Applied to `sendResponseReminders` too — dormant, since that function is not exported from the v1 barrel. **functions 23 suites / 516 green** (was 505). Deployed `deliverDailyPrompts` + `triggerPromptDelivery`, commit `074f4f7`.

**Cause 2 (FIXED — client fix rides build 73; prod data cleaned today).** Expo push tokens are per-device-per-app, and **sign-out never unregisters the token**, so every account ever signed in on a phone stays addressable from that phone. Adam's token is currently on three user docs (`adamcurtiswarner@gmail.com`, `awarner@everdriven.com`, `adam+stoke1@getstoke.io`); Masha's is on two. This is why the July scrub of 10 stale tokens regrew — the scrub removed the rows and left the mechanism untouched.

`unregisterPushToken()` now hands the token back before `firebaseSignOut` (the rules only allow a self-write while still signed in). **Cache-only by design** — the token is remembered at registration in memory and AsyncStorage, and sign-out never calls `getExpoPushTokenAsync`, because that is a round trip to Expo and sign-out has to work offline. The cache clears only after the removal lands, so a failed attempt retries. Never throws. **app 91 suites / 935 green** (was 929), tsc clean. Commit `b6bf03a` — ships with build 73.

**Prod cleanup done 2026-08-23** (the client fix is not retroactive): removed Adam's device token from `awarner@everdriven.com` and `adam+stoke1@getstoke.io`, and Masha's from `9pt8dhzfjy@privaterelay.appleid.com`. **No token is now shared across accounts.** Verified.

**Morning pushes, before → after** (both fixes plus the cleanup): Adam **3 → 1**. Masha **5 → 2** — 2 because her account carries two live device tokens.

**Masha's second token — resolved 2026-08-23.** Her account held two Expo tokens. Verified with a silent data-only probe through the Expo push API (`_contentAvailable`, no title/body — nothing displayed on her phone): **both returned receipt `ok`**, i.e. both were live APNs registrations on her single device, which is precisely why she saw doubles. Adam confirmed one device; the older token (`ln_cXgGSca…`, first in insertion order) was removed and `A2eIq1O0…` kept. **Both founders now hold exactly one token each. Morning pushes: Adam 1, Masha 1.**

**Correction to an earlier claim in this file: we do NOT reliably prune dead push tokens.** `sendExpoPushNotifications` prunes only on an immediate *ticket* error; `DeviceNotRegistered` almost always arrives in the *receipt*, and **`getReceipts` is never called anywhere in the codebase**. A token for a deleted app therefore persists indefinitely. That is a second, independent way `push_tokens` accumulates — the sign-out fix does not address it, because the device never signs out, it just stops existing. Worth a scheduled receipt sweep; not launch-blocking, and now that each founder holds one token there is nothing accumulating today.

**DECIDED AND IMPLEMENTED 2026-08-23 — the `member_ids` policy.**

> `member_ids` is a **live roster** — the two people this couple is *for, right now*. It is never a history and never a permission grant. Dissolution (unlink or account deletion) **empties it** and preserves the roster as `former_member_ids`.

Rejected the alternative — keep the roster and rely on every send path remembering a status check. That is the shape that already produced two production defects, and it fails toward *leaking to an ex*, which is the worst available direction. Under the new shape a forgotten status check is a no-op over an empty array, and every remaining call site reads as history because the field is named like history.

The one real cost, paid deliberately: clearing the roster would have cost an ex the ability to read their own dissolved couple doc, turning a send bug into a **read denial** — and denials are what tear listeners down in this app (see the 8/22 cycle). So `wasCoupleMember()` in the rules restores exactly that one read from `former_member_ids`. **READ ONLY** — asserted in the emulator suite: an ex reads their dissolved couple doc, and is still denied its completions, its responses, and any write that would revive it. A stranger gets nothing through the history field.

Shipped: `unlinkCouple` + `deleteAccount` write the new shape (roster read first, cleared second — the partner push and the per-member claim cleanup both depend on it); `wasCoupleMember()` added to `firestore.rules`. **Rules + both callables deployed.** app 91/935, functions 23/520, rules 66 — all green, tsc clean.

**Both existing deleted couples migrated in prod.** Verified: zero deleted couples carry a live roster. `isActiveCouple` stays in place as belt-and-braces — the policy makes the failure harmless, the guard makes it explicit.

**Worth noting about the delivery query:** `deliverDailyPrompts` filters `is_deleted == false`, and the sandbox/uitest fixture users have that field **missing** rather than false — which is the only reason those fixture couples are not also delivering. Set the field and a fourth push appears. Fixture accounts active in prod remain an unresolved ops item.

### `notifyCoupleMembers` — the fan-out choke point (2026-08-23)

`member_ids` was fanned out by hand in **nine** places. Two shipped without a status check, months apart, written by different code. The policy above made that harmless; this makes it hard to write.

`notifyCoupleMembers(coupleId, notification, data)` in `shared.ts` is now the only sanctioned way to notify both halves of a couple. It puts four things in one place instead of nine:
1. the couple must be **active** (`isActiveCouple`, fails closed);
2. the roster is **de-duplicated** — the canary couple really is `[uid, uid]` in prod, and every raw loop pushed it twice;
3. malformed roster entries are skipped, not thrown on;
4. members are **isolated** — a raw `for` loop with an `await` inside aborts the rest, so one corrupt user doc silently cost the partner their notification.

It deliberately **re-reads the couple doc** rather than accepting one from the caller: a caller-supplied doc is exactly how an unchecked status gets back in. Returns the number notified, because a zero-send run used to be indistinguishable from a quiet one.

**Nine call sites migrated:** daily delivery, follow-up ready, weekly recap, churn risk, streak break, date-night reminder, morning check-in, evening reflection, coaching insight. TypeScript then flagged four now-unused `sendPushNotification` imports — the compiler confirming the raw fan-outs are gone.

**Left alone, deliberately:** `notifications.ts` reminders decide per member (quiet hours, reminder count, set-aside) so they are not a uniform fan-out; `triggers.ts` notifies the *partner of the acting member*, never the roster; `users.ts` tells the partner the couple has ended, which must fire exactly as the couple dissolves; `alerting.ts` pushes `/admins`, not couples. Each is on the allowlist with its reason.

**The guard:** `pushFanOut.guard.test.ts` fails when an unlisted file calls `sendPushNotification` directly, or when any file loops the roster straight into a push. **Verified by planting a violation in `hearth.ts` and watching both assertions go red**, then reverting — a guard that cannot fail is not a guard. A third assertion keeps the allowlist honest by failing on a stale entry.

functions **25 suites / 532** (was 23/520). app 91/935. tsc clean both sides. `deliverDailyPrompts` + `triggerPromptDelivery` redeployed.

## CEO Cycle 2026-08-22 — decisions

**D1. Fix the shipped build from the server, today.** `firestore.rules:456` → `allow read: if isAuthenticated() && (resource == null || isCoupleMember(resource.data.couple_id));`. Emulator-verified: member reads a missing completion → OK(0); member reads a real one → OK(1); stranger read and stranger list → still DENIED. Retires the largest error cluster (16/20) on build 72, which is what the founders are actually running. No build required.

**DEPLOYED 2026-08-22 22:36:03Z** (prior ruleset dated 8/3). Rules suite **62 tests green** — the 8/3 test that *documented* the denial as expected behaviour was replaced by three that pin the new one: a member reads a missing completion and gets `exists === false`; a stranger reading a missing doc succeeds (learning only non-existence — the honest residual exposure of the null guard) while a stranger reading a real completion is still denied; a stranger listing the couple's completions is still denied. **No client build needed — the fix reaches the founders' installed build 72 immediately.**

**D2. Hold build 73 until the two `documentId() in` fixes land.** Cutting today ships two known, reproducible, permanently-denying queries onto the path App Review walks: create account → pair → answer → reveal. A 2.1 rejection costs a full review requeue; the hold costs half a day and zero founder time. Build 72 already earned "NOT submittable" by shipping ahead of a known fix — we do not repeat that with a higher number. Target the cut for **Tue 8/25**, on Adam's explicit go, `runtimeVersion` bumped off "2.0.0", `EXPO_NO_CAPABILITY_SYNC=1`.

**D3. Do not fix these by chunking smaller.** Chunking does not save `useOpenDays` — its ids deny at n=1 by construction. Both hooks move to value-field queries (`where('assignment_id','in',chunk)`) so the result set can only contain readable documents, chunked at ≤10. Standing rule from this cycle: **`documentId() in` is banned in client code** unless the id list is provably all-present and ≤20, which a mobile client can almost never guarantee.

## The plan

**Rules deploy — DONE 2026-08-22:**
1. ~~`firestore.rules:456` null-guard + emulator tests for the missing-doc read and both stranger-deny regressions.~~ Shipped. Watch `/events` for `useCompletionClarify.listener`: it should now stop appearing. If it recurs, the cause is not the missing-doc race and the diagnosis needs reopening.

**Client fixes, ride build 73:**
2. `useOpenDays.ts:73-88` → `where('couple_id','==',c), where('user_id','==',u), where('assignment_id','in',chunk)`, chunk 10. Index `prompt_responses (assignment_id, user_id)` already exists (`firestore.indexes.json:152`) — confirm it covers the 3-clause form.
3. `useYourWords.ts:110-135` → same shape now; **denormalise `prompt_text` + `category` onto the response doc in `onResponseSubmitted`** as the real fix, plus a backfill. That also makes Your Words correct after an unlink, which the current join design cannot be.
4. Write-side completion race (P0 #3, still true in full): gate the reveal's write affordances on `completionWatch` having seen `snap.exists()`, and add the missing `onError` to `useReaction` — a denied reaction currently leaves the optimistic ring lit for the life of the sheet, reaches the partner never, and **emits no telemetry at all**.

**Guards, so this class cannot return:**
5. A plain unit test in `npm test` (no emulator, no Java) that greps `src/hooks/` for `documentId(), 'in'` and asserts the call-site set matches a checked-in allowlist. Highest-leverage single item — it survives the emulator being unrunnable.
6. Every `documentId() in` emulator test must use production chunk size and a fixture containing a ghost id and an ex-couple id. The existing test used `['asg-1']` — n=1, one existing doc, one active couple. Green, and actively misleading.
7. `npm run test:rules` **does not run on a stock machine** — dies on `Unable to locate a Java Runtime`; Homebrew openjdk is installed but keg-only and unlinked. Documented nowhere. Fix the PATH in a pretest step or the rules suite silently rots again.

**Alerting — the mechanism failure, not the bug:**
8. Sentry issue-alert rule keyed on **frequency, not first-seen** (`firestore_code:permission-denied`, >3 in 1h → email + phone). ~10 min in Adam's Sentry account, zero code, zero deploy. Would have fired on 8/9, on error #1. Sentry's own "no events received" monitor means the mechanism reports its own death. Also set `environment` in `Sentry.init` (`app/_layout.tsx:21`) — prod and preview are currently indistinguishable.
9. Extend `checkErrorAlerts` to also scan `/events where event_name == 'client_error'`. ~15 lines, rides the existing 5-min schedule and push path, composite index already live. The durable fix for the write-only sink.
10. Cloud Monitoring log-based metric + email channel on `checkErrorAlerts`'s `console.error`. The only path with **no dependency on Adam at all**.
11. `SUBMIT-BY` above, enforced by a **`on: schedule`** GitHub Action that fails when the date passes. `.github/workflows/ci.yml` is push-only — with zero pushes for 19 days it ran zero times, so anything hung off it would have been equally silent.

## Corrections to the 2026-08-03 record

- **`/events` does prune** — but the 90-day sweep is welded into `exportEventsToBigQuery`, so a missing dataset disables retention as a side effect. 2,490 docs today (+454 in 19 days, ~24/day for two users); **908 are already past the cutoff** and unreclaimable until BigQuery exists. Give `/events` its own TTL policy.
- **`/admins` is a 10-second task, not a blocked one.** The field is `push_tokens` (array), not `push_token` — Adam's uid `FwAjAreJ2…` already carries a live token. One document. Not created: it grants production admin and needs his explicit say-so.
- **BigQuery outage is older than 31 days and its start date is being erased daily** — `cleanupErrorLogs` deletes at 30 days and the oldest surviving doc is exactly 30 days old. "31/31" is a floor, not a measurement. Zero datasets, zero jobs ever.
- **Only 1.5 of the 8 studio items were ever actually gated on the legal answer.** Consent copy, crisis lexicon, write-side race, nutrition labels, screenshots and the in-app policy swap needed nothing from Adam and could have been done in the 19 silent days. The legal gate was real for the deploy; it became cover for everything behind it.
- **`stoke.llc` is not Firebase Hosting at all.** Apex resolves to AWS-parked IPs (GoDaddy nameservers), 301s to `www.stoke.llc` = a Google Site behind a **Google login wall**. `/privacy`, `/terms`, `/support`, `/join` all 404 on the apex. Deploying to Firebase does not make `stoke.llc/privacy` resolve. `STORE_METADATA.md:103-106` points Apple at four dead URLs — including Support and Marketing, which were never gated on legal.
- **`stoke.llc` has no MX records.** `support@stoke.llc` — shipped in `src/config/app.ts`, linked from the live support page, named in both policy drafts — receives no mail. The "confirm the support email" leg of the 15-minute gate **cannot be answered truthfully as drafted**. Recommend the `stoke-5f762.web.app` fallback the 3.1.2 checklist already sanctions; it removes the last external clock from the critical path.
- **The legal drafts already contain the answers.** `hosting/privacy.html` and `terms.html` name **Omnific Collective LLC**; `terms.html` §14 already specifies **Georgia** governing law. Two of the three legs are a confirmation, not authorship.
- **Test fixtures are live in production with `status: 'active'`** (`sandbox-couple`, premium through 9/20; `uitest-visualp`). Every scheduler iterating active couples processes them. **`last_active_at` is dead** — stale since 2026-02-28 on both real users. Clean both before quoting D7/D30 to anyone.
- **Canonical test counts (measured today, both prior records stale):** app **91 suites / 929**, functions **22 / 505**, rules **60**. `tsc` clean. Two real flakes under parallel load (`ProfileCardPhotoAccess` upload, `nameScreen` save) — 5s default-timeout expiries, green on a serial re-run; give them explicit timeouts.

## Founder actions (~1h45m, Monday 2026-08-24) — every date below moves 1:1 with this

1. ~~Go / no-go on the rules deploy (D1).~~ **Approved and deployed 2026-08-22.**
2. **Legal confirmations** — entity and governing law are a confirmation of drafted text. **Support email needs a decision, not a confirmation** (no MX).
3. **Domain decision:** repoint `stoke.llc` to Firebase (registrar creds — studio cannot do this; up to 48h propagation + cert issuance) **or** take the `web.app` fallback. Recommend the fallback.
4. **W-9 + banking in ASC** — 24–48h external processing, the longest pole, startable for 47 days. If not Active at submit, review proceeds but subscriptions cannot go live.
5. IAP review screenshots into both products · ASC subscription display names + RevenueCat verify.
6. **Sentry alert rule** (item 8 above) — needs his account.
7. **Tue 8/25: explicit go for build 73.** **Wed 8/26: 45-min two-device pass** (the checklist is 45 min, not 30, and needs two physical devices).

## Runway

Sun 8/23 studio: rules fix + both client fixes + write-side race · Mon 8/24 founder AM, studio takes the six items that were never actually gated · Tue 8/25 build 73 + `STORE_METADATA` rewrite + alerting + regression · Wed 8/26 16-frame screenshot recapture (6h, must be shot against the final binary) + founder device pass · **Thu 8/27 submit (target)** · buffer to **Tue 9/1 (committed)**.

Not binding: build 72 expires 10/31; distribution cert and provisioning profile 2027-02-25.

---

# Prior cycles (history)

## CEO Cycle 2026-08-03 — headline at the time

**Submission has slipped 11 days on a 15-minute task, not on engineering.**
`firebase.json` still excludes `privacy.html` and `terms.html` from hosting deploys pending Adam's legal confirmations (entity, support email, governing law). Verified today: `/privacy` and `/terms` return **404**. Apple fetches the Privacy Policy URL during review — this is the hard gate, and it is 28 days old.

Timeline evidence: `git log` shows **zero commits 7/23 → 8/01** (ten silent days), then 17 commits on 8/2 and 2 on 8/3. The feature work did not displace the submission; the silence did, and nobody escalated. PM Lead has recorded that as their own governance failure and is instituting a daily runway line until submit.

## CEO Cycle 2026-08-03 — executed today (studio, no founder input needed)

**SECURITY — was live in production rules:**
- Reaction writes were constrained only by *which* top-level fields changed — no own-key pin, no type, no length. A member could **forge a reaction under their partner's uid** and store arbitrary text, which the push pipeline renders into the partner's notification **title and body**. Any-emoji reactions (8/2) turned that into an attacker-controlled push channel with no rate limit. `isReactionUpdate()` now pins `request.auth.uid` and enforces string ≤16 or null. **7 new emulator tests; 60 total. Rules deployed.**

**DATA LOSS:**
- A failed clarify write silently destroyed up to 1,000 characters of the user's typed text — the composer cleared synchronously before the write resolved, with only a Sentry log. Now holds the text until the write lands and shows an inline failure. (Violated CLAUDE.md's own mandatory rule.)

**LIVE PROD DEFECTS — fixed and deployed, no build required:**
- `sendWeeklyRecaps` **matched the wrong week**. Fires Sunday 18:00 PT = Monday 01:00 UTC, container clock is UTC, so the week string was the week that had just *started* — matching ~32 hours instead of 7 days. A couple active Mon–Sat but quiet on Sunday got **no recap at all**. Now an explicit 7-day `completed_at` window + evaluated/notified counters (a zero-match run was previously indistinguishable from a quiet week).
- `onCompletionClarified` ignored `notify_partner_response` while `onReactionAdded` and `onResponseSubmitted` both honour it — the newest push type silently overrode a shipped user setting.
- `checkErrorAlerts` stamped every error `alerted: true` **with zero admin recipients configured**, permanently suppressing failures nobody was ever told about. Now logs loudly and leaves errors unalerted so they resurface.

## P0s (audited 2026-11-12)

| # | Item | Owner | Status | Note |
|---|---|---|---|---|
| 1 | **`/admins` was empty — error alerting never worked** | Adam | **RESOLVED (Nov 12)** | `/admins/FwAjAreJ21VurOnbK8kO60tqKxT2` created with push token. `checkErrorAlerts` now has a recipient. 112 days of silence ended. |
| 2 | **BigQuery export pipeline** | Studio | **RESOLVED (Nov 12)** | Dataset was deleted sometime after Aug 13, recreated later. Pipeline errored daily Oct 14 – Nov 6 ("Not found: Dataset"). Manual export of 15 backlogged events completed. 27 stale error_logs cleaned. BigQuery: 6,132 rows (Feb 26 – Aug 14). Firestore: 1,787 events (< 90 days, awaiting natural export). Pipeline verified working — daily 4 AM PT run will process events as they age past 90 days. |
| 3 | **Write-side completion race** | Studio | **SHIPPED (OTA Nov 12)** | `useReaction` checks existence before write, surfaces Alert + telemetry. |
| 4 | **Crisis lexicon not applied to clarify text** | Studio | **SHIPPED (OTA Nov 12)** | `containsCrisisLanguage` on both clarify paths. SafetyResources modal on match. |
| 5 | **Notification consent copy is now false** | Studio | **SHIPPED (OTA Nov 12)** | Pre-prompt copy accurately describes all 6 push types. |
| 6 | **In-app privacy policy dated March 2026** | Studio | **SHIPPED (OTA Nov 12)** | Privacy + TOS rewritten for Nov 2026. |
| 7 | **Clarify question on lock screen** | Studio | **SHIPPED (OTA Nov 12)** | Clarify text redacted from lock screen notifications. |

**Score: 7 of 7 resolved (Nov 12).** P0s 3-7 shipped via OTA `53ea17ab`. P0 #1 admin doc created. P0 #2 BigQuery pipeline verified working, backlog exported, stale errors cleaned.

## Build state (audited 2026-11-12)

| Build | Commit | Status |
|---|---|---|
| 73 | `938d1d6` | **On TestFlight** since Aug 23. Carries Open Days fix, Your Words fix, sign-out token fix, member_ids policy. |
| OTA (live) | `31f0e11` | **Published 2026-11-06** via `eas update`. Alignment Map radar chart + Us tab promotion. Update group `6f2c9787`. Runtime 2.0.0. |
| OTA (Oct) | `bd700c4` | 300 scored prompts (v6) to fix pool exhaustion. |
| OTA (Nov 12) | `4609dde` | **Published 2026-11-12** via `eas update`. Update group `53ea17ab`. P0 fixes 3-7, security audit, explore restructure, Us redesign, paywall, small moves, love language tips, 45 new prompts. 54 files, 12K+ lines. Runtime 2.0.0. |

**App Store submission remains blocked by:** privacy/terms URLs (stoke.llc still 404), W-9/banking, `/admins` empty. **SUBMIT-BY 2026-09-01 missed by 72 days.**

## Production health (audited 2026-11-12)

| Metric | Value |
|---|---|
| Active couples (real) | 1 (Adam & Masha) |
| Total completions | ~145 (est. from 81% rate over 173 days) |
| Completion rate | 81% over 173 days |
| Events collection | ~4,000+ docs (unbounded, no pruning) |
| Error logs | 30+ (all BigQuery failures) |
| Admin docs | **0** |
| BigQuery dataset | **Does not exist** |
| Canary pipeline | Healthy |
| Test suites | 96/96 (988 tests, 100% pass) |
| TypeScript | Clean (zero errors) |
| Unpublished commits | **20+** (54 files, 12K lines) |

## Test coverage gaps (audited 2026-11-12)

- **AlignmentRadar component: UNTESTED** — shipped via Nov 6 OTA with zero tests
- **deriveRadarData utility: UNTESTED** — feeds the radar chart, no unit tests
- **Explore Revisit, Collections, Try This, Love Language Tips: UNTESTED** — all new features on main with no tests
- **Paywall restructure (progressive trial): UNTESTED**
- Pre-existing gap: ~30% of hooks and ~47% of components untested

## Critical path to submission

**Adam, ~55 minutes, today:** ① W-9 + banking in ASC (24–48h external processing — longest pole, startable for 28 days) ② **legal confirmations, 15 min — unblocks privacy/terms deploy, the Apple hard gate** ③ IAP review screenshots into both products ④ ASC subscription display names + RevenueCat check.

**Studio, ~2 focused days, gated on ②:** deploy privacy/terms → replace the March-2026 in-app policy → fix consent copy → crisis lexicon over clarify → write-side race → nutrition labels for 3 new SDKs → rewrite `STORE_METADATA.md` (frozen at build 65) → **recapture all 8 screenshots × 2 sizes** (every surface in them has been redesigned).

**Then:** build 73 → device pass (30-min checklist from Testing Lead, risk-ordered) → ASC assembly → submit.
**Realistic: Thursday 2026-08-06. Conservative: Monday 2026-08-10.**

## Governance change (effective now)
While a submission runway is open, the studio does not open feature work unless the CEO moves the submit date **in writing** in this file first. Ten silent days should never have been possible.




## Earlier cycles

## CEO Cycle July 20 (night) — three-department review, findings executed
Three heads consulted in parallel (Testing, Product, PM). All studio-side findings were fixed the same night and ride **build 66**; founder items are in "Adam's Monday List" below.

**Executed tonight (studio):**
1. **Paywall 3.1.2 compliance (was a latent rejection):** no Terms/Privacy links existed on the paywall and the renewal disclosure was incomplete. Added auto-renewal note + tappable Terms/Privacy (bundled in-app screens, work before hosting deploys) + Us view added to the premium benefits list. (PM Lead audit finding.)
2. **Us view pre-device-pass fixes (Testing Lead adversarial review, 9 findings):** sparkline gap-domain fix (gap 0 plotted off-chart on the flagship "closing" chart), entitlement-loading skeleton (free couples saw premium states unblurred for seconds before blur landed), Hearth deep-link re-entry fix, tended-count month semantics now match Hearth's stat, VoiceOver hardening on locked rows (label pinned to category name — the blurred-state leak risk). Remaining device-only checks are in the founder checklist below. Backlog filed: 120-completion window truncation, time-based movement halves.
3. **Store metadata refreshed against build 65 (Product Lead audit):** Us view section in description + What's New + promo text; subscription copy now states trial is **annual-only** (was a 3.1.2 accuracy defect reading as trial-on-both-plans); couple-scoped line promoted to first bullet; keywords swap `date night` (hidden feature) → `husband,wife`; screenshot narrative now 8 shots with the Us view as shot 5; reviewer path updated (Us reached via Profile/Hearth, not a tab; seed script must guarantee a populated map).
4. **Hosting deployed:** /support and /join now live (200 verified). /privacy /terms remain correctly gated on founder legal confirmations (firebase.json exclusion untouched) — **Apple fetches the Privacy URL at review; this is the hard gate.**
5. Tests after all changes: app 83 suites / 870 green; tsc clean. Commits `850e9a0`…`ad84d25` pushed.

**Adam's Monday List (≈90 min total, order matters):**
1. **W-9 + banking in ASC** — longest external pole (24-48h Apple/bank processing); first thing Monday
2. **Legal confirmations** (entity, support email, governing law) — 15 min; studio deploys privacy/terms within the hour of the answer; unblocks the Privacy Policy URL Apple requires
3. IAP review screenshots into both subscription products (file staged in Downloads)
4. RevenueCat email confirm + webhook dashboard verify (likely already done — 2-min check)
5. ASC subscription display names → "Stoke Premium (Couple)" per REVENUECAT-SETUP.md
6. **Tuesday: two-phone pass on build 66** — use the Testing Lead's 11-step checklist (VoiceOver on locked Us rows FIRST, entitlement flash, blur legibility in bright light, repeat deep-link, sparkline gap-0, tended cross-check, Dynamic Type, analytics smoke, sandbox purchase suite: annual trial → webhook → partner unlocks → restore → monthly)

**Runway:** Mon = Adam items + screenshots captured from 66 (studio) · Tue = device pass · **Wed 7/23 = ASC assembly + submit** (conservative Fri 7/25). Contingency: if Paid Apps Agreement still pending Wed, submit anyway — review can proceed but subs can't go live until Active.

## Legal & Corporate Track (opened 2026-07-22 — advisor cross-reference of the LLC/Privacy action plan)
Product safety architecture is ahead of the plan (unpair/delete/anonymize live, anti-guilt in code, crisis off-ramp, minimal collection, two-event notifications). The exposed flank is corporate: personal-identity accounts, no IP assignment, individual Apple enrollment. Studio docs prepared in `docs/legal/`:
- **DATA-MAP.md** — full collection map from the live schema, data states, retention, the documented position on freeform answers + photos, user controls
- **POLICY-ADDENDA.md** — AI disclosure ("your answers are never sent to AI services" — true in v1), unpairing, conduct clause, real 6-vendor subprocessor list, no-overclaim security overview, subscription note
- **CONTRIBUTOR-IP-ASSIGNMENT-DRAFT.md** — attorney-review skeleton, past-work + AI-work capture, both contributors, entity facts pre-answered
- **LLC-MIGRATION-RUNBOOK.md** — per-service ownership transfer in blast-radius order (Firebase add-owner-then-demote; Apple org-enrollment decision A/B; Expo/RevenueCat/GitHub/domain steps; money hygiene)

**Adam's corporate P0s (gate public/paid launch):** ① sign IP assignment (attorney review of the draft) ② the July-6 legal confirmations (~15 min; unblocks privacy/terms deploy — Apple hard gate) ③ D-U-N-S lookup today → Apple org enrollment decision (Option A delay vs Option B TestFlight-now/org-before-paid-launch) ④ LLC email + card → run the migration runbook ⑤ insurance quotes (cyber + tech E&O) — applications answerable from DATA-MAP.md.

## Founder Directive (2026-07-05)
v1 = scored prompts by category + score-triggered follow-ups (deepener / repair / divergence). Everything else hidden via `src/config/features.ts`. Target: top 0.1% design quality for the category. Payments live. App Store submission next.

## Done July 20 — Build 65
- **Us view (new premium surface, per docs/plans/2026-07-20-us-profile-view-design.md)**: couple page at `/(app)/us` — alignment map from both partners' daily scores (per-category avg gap × level over 90 days, states in brand voice, never a grade), gap-movement sparklines, "what you tended" line, love languages finally side by side. Free couples get the honest teaser (real category names, blurred states) + quiet gate → paywall (`source: us_view`; funnel instrumented vs the follow-up gate). Entry rows in ProfileCard + Hearth header; rows deep-link into Hearth category detail (`?category=` param). New `usViewLocked` gate key + `FEATURES.usView` flag (ON). Derivation is pure (`src/utils/alignment.ts`, 11 tests); zero new server work — reads the completions Hearth already streams.
- **Follow-up cards match the main design**: PromptCard (all text-format prompts incl. follow-ups) restyled to the ink hero surface (ToneShapes, category eyebrow, Nunito-Black question, coral pill); FollowUpLockedCard moved to ink with light-shadow blur. The design no longer shifts the moment the follow-up engine kicks in.
- **Couple-scoped pricing said loudly** (competitor research: per-partner double-charging is the category's #1 complaint): paywall line now "One subscription covers you both. Your partner unlocks automatically."; REVENUECAT-SETUP.md mandates couple wording in ASC display name/description/review notes. Verified entitlement is couple-scoped end-to-end (webhook → couples.premium_until + /subscriptions doc; partner pays nothing). Confirmed `EXPO_PUBLIC_REVENUECAT_IOS_KEY` live in EAS prod env — payments enabled in builds since 55.
- **Competitive research** (Paired/Couply/Flamme/Agapé/Evergreen): profile-as-couple-identity is table stakes at the top; our score-divergence data is the unique asset — the Us view is its face. Spec + findings in docs/plans.
- Tests: app 83 suites / 869; functions 21 suites / 484. tsc + design lint clean.

## Where Things Stand — END OF DAY
One day, scope reset to submission candidate. Commits `d86212d` → `ff9fa71` (main, pushed).

### Shipped today
1. **v1 build**: scored 1–10 prompts, follow-up engine (divergence > repair > deepener, next-day scheduling, repair chaining), 132 follow-up templates + 60 scored prompts seeded to production, 3-tab app, safety off-ramp (crisis lexicon suppresses follow-ups + resources modal)
2. **Backend deployed**: rules/indexes/functions live on stoke-5f762; 6 hidden-feature push schedules deleted; onResponseSubmitted race fix (atomic completion create — was silently killing follow-ups in production timing)
3. **iOS 26 launch blockers fixed and device-verified**: TurboModule patch (patch-package + buildReactNativeFromSource) and release-only Firebase Auth registration crash (initializeAuth + metro hardening; auth now persists across restarts). Confirmed on Adam's phone via TestFlight build 54
4. **Payments end-to-end**: ASC group "Stoke Premium" — stoke_premium_annual $49.99/yr (14-day free trial, all regions) + stoke_premium_monthly $9.99/mo; RevenueCat project wired (App Store app via .p8, products, `premium` entitlement, default offering $rc_annual/$rc_monthly); SDK key in EAS prod env + .env; revenueCatWebhook secured (env secret, verified 401/200)
5. **Design program — all three waves**, per the approved review (claude.ai/code/artifact/cbf787fc-fe1c-4955-a6db-22a43e5ac1b8):
   - **Wave A**: two-beat reveal choreography + deepener dwell gate, slider haptics, mode crossfades, auth/welcome pill unification + ToneShapes hero, category palette discipline, paywall 3-state + "TRY 14 DAYS FREE", reaction icons de-tofued, keyboard fix, a11y groundwork
   - **Wave B**: type scale with baked line-heights (243 styles collapsed, 0 raw fontSize in scope), contrast fixes (muted #8A8A96, 45 copy sites → secondary), spacing grid + one 20px gutter, warm semantics, single AccentBar, Dynamic Type (19 texts) + ReduceMotion (6 loops), eslint design rules (`npm run lint:design`, 0 in-scope violations)
   - **Wave C**: invite universal link LIVE (stoke-5f762.web.app/join/CODE — AASA + branded join page on Firebase Hosting), warm one-link share message, onboarding 12→5-7 steps (value-prop first; verify-email/preferences/relationship-stage removed from path; skip trap fixed), push pre-prompt after first answer, offline submit integrity (optimistic seal + dedupe), truthful unpaired Today with invite CTA, explore/settings states + copy truths, claims softened ("Private by design")

### Builds
| Build | Contents | Status |
|---|---|---|
| 54 | iOS 26 fixes (device verification) | On TestFlight, verified on Adam's phone |
| 55 | + Wave A + payments enabled | On TestFlight |
| **56** | **+ Waves B & C + universal-link entitlement — SUBMISSION CANDIDATE** | Building → auto-submits to TestFlight |

## Done July 6
- **Hearth (new feature, founder-approved via interactive concept mock)**: 4th tab — every completed prompt is an ember colored by its signal (coral talk-about-it / purple compare-notes / sage glowing-tended / gray steady); couch queue with read-aloud starters; mutual "we talked" ritual (both partners mark -> ember settles, partner gets a quiet nudge on first mark); category detail with score-trend sparkline; quiet monthly stats. Backend deployed (enriched completions, field-scoped rules, onCompletionDiscussed trigger, category index). App 46 suites / 418 tests; functions 211.
- **Push delivery fixed**: client registered raw APNs tokens while server sent via FCM — all iOS pushes failed silently. Now Expo push tokens end-to-end (server deployed; client rides build 58). Partner-answered, reveal, follow-up, reminder, and Hearth nudges all use the fixed pipe.
- **stoke.llc marketing site live** (stoke-5f762.web.app; serves stoke.llc once DNS verifies): flame hero, interactive follow-up demo, pricing, footer. Privacy/Terms drafted but NOT deployed (pending entity/email/governing-law confirmations).
- New welcome hero (founder's flame illustration) + original tagline restored; App Store listing copy rewritten (STORE_METADATA.md); GitGuardian webhook-secret leak rotated + purged from history.
- Builds: 57 on TestFlight (submission candidate before Hearth); **58 building now = Hearth + push fix**.

## GATE 2 COMPLETE (2026-07-10)
- Pairing moment designed both sides ("The fire is lit." + one Success haptic); all onboarding system alerts → inline states; radius tokens fixed
- Explore reveal = full CompletionMoment ceremony w/ reactions (pageSheet); first-ever reveal beat ("The first of many"); Hearth cold-start warmth; feedback re-ask fixed (data-derived); note field default w/ per-category placeholders
- Invite chain: first-person share message, ?from wired (sanitized), og:image, join.html rebuilt for the skeptical partner ("Nothing's wrong."); privacy.html truthful (Expo added, deletion claim now matches code); support.html + in-app Contact row (hosting deploy still gated on founder legal confirmations)
- Store package: listing surgery (Hearth/Explore in, differentiator in first 3 lines, keyword swap), one-device reviewer path + seedReviewerCouple.ts (re-run each review morning), screenshot shot-list, nutrition labels (Sensitive Info declared), 3.1.2 checklist; uitest cleanup FROZEN
- Seams: two-client emulator harness (5 flows, npm run test:flows), shared tz/DST matrix both sides + TZ-pinned jest, hourly canary exercising the real completion pipeline (reportError on failure), client permission-denied telemetry, onResponseSubmitted reportError wrapper, pre-submission device checklist. Contract pinned: seal is client-side only (server gating = post-launch item)
- Functions redeployed (32); hosting NOT deployed (legal gate)

## 2026-07-09 WORTHINESS REVIEW — GATES THE LAUNCH
Full synthesis: docs/reviews/2026-07-09-worthiness-review.md (8 department audits; CEO-verified findings).
**SEV-0 — ALL CLEARED 2026-07-09 night (client fixes ride the next build; server/rules LIVE in prod):**
1. Content death spiral — depth progression permanently locks every answered category; pool exhausts ~2 weeks → same prompt daily forever (VERIFIED in prod; founder couple at ~6 eligible prompts) [S]
2. Storage rules open — any authed user can read/write any couple's photos (VERIFIED) [S]
3. Breakup model — ex retains permanent access (member_ids never cleared); deletion leaves embedded answer copies; client unlink rules-broken [M]
4. Invite enumeration → partner impersonation [S]
5. Reveal race — simultaneous answers strand assignment at 'partial' forever; duplicate-response paths → deterministic IDs + server-authoritative status [M]
6. Offline answers silently lost (rules-blocked flush query + silent catch) [S]
7. Reminders never fire for default 19:00 users (quiet-hours window math) [S]
8. Paywall unreachable — FOUNDER DECISION on the paywall moment (recommend trial-at-pairing; daily question free forever; follow-ups+Hearth+Explore-send premium) [M]
9. RevenueCat webhook fails open on missing env [S]
**SEV-1 pre-launch:** pairing-moment design (both sides), Explore reveal = CompletionMoment, invite chain rewrite (first-person msg, ?from wiring, og:image, domain decision), join-page rebuild, 7-screenshot store narrative + listing surgery (Hearth/Explore missing entirely), reviewer one-device path (+ FREEZE uitest cleanup), privacy policy accuracy (add Expo; fix deletion claim), support floor (inbox + in-app contact + /support), rules test suite + two-client harness + tz/DST matrix, observability (reportError wrappers, non-push alert channel, Sentry DSN→EAS, canary), scheduler timeouts, note-field emphasis, response/assignment field-scoping.
**Founder decisions pending:** paywall moment · invite domain (stoke.llc vs getstoke.io) · beta wave during review (recommended YES, manual release) · ex-partner data policy · W-9/legal/IAP items.
**Org:** all 8 head charters were stale → .claude/agents/heads/CURRENT-STATE.md is now authoritative; canonical tests 487 app / 308 functions; "422 prompts" claim retired (60 live); "AES-256" claim purged (no encryption code exists).

## Done July 9 — founder bug/UX report
- **Phantom notifications fixed (root causes, not symptoms)**: (1) UTC "today" rolled over at 8PM ET, re-delivering the daily prompt each evening — now user-timezone dates client+server with ±1-day dedupe window; (2) hidden-feature pushes (weekly pulse/recap + 6 callables + check-in trigger) un-exported AND deleted from prod; (3) legacy dual-transport sends killed — Expo-only with auto-prune; 10 stale tokens scrubbed (founder account had 8); (4) reminder quiet hours 8AM-9PM user-local.
- **Explore = "send your partner a question"**: full lifecycle rebuilt — seal after answering (own answer always viewable), partner gets truthful push ("sent you a question: …") deep-linking to that prompt, "FROM {NAME}" discovery card on Today, Respond available on partner side (dead-end hourglass removed), duplicate-assignment guard, real-time updates, side-by-side reveal, completions flow into Hearth (category fix + 40 assignments backfilled). Partial explore questions never expire; explore never blocks daily delivery.
- **Name personalization**: {partner}/{me} tokens render as real first names everywhere (fallback "your partner"/"you"); wired across Today/Explore/Hearth/onboarding + explore push bodies (server mirror util); 38 follow-up templates + 1 prompt retokenized in prod (seeds updated to match); missing prompt_responses index deployed.
- Tests: app 51 suites / 482; functions 11 suites / 304. Functions redeployed. **Build 59 = all of the above.**

## Adam's Open Items
1. **W-9 tax form** (ASC → Business → Add Tax Info) — Paid Apps Agreement stuck at "Pending User Info" until done; bank (Omnific Collective LLC) processing ~24h. Blocks real revenue, not sandbox
2. **IAP review screenshots** — drag `Downloads/files (1)/iap-review-screenshot.png` into both subscription products' Review Information (clears "Missing Metadata"; required at version submission)
3. **RevenueCat webhook** — Integrations → Webhooks → URL `https://us-central1-stoke-5f762.cloudfunctions.net/revenueCatWebhook`, Authorization `Bearer <secret>` — the secret lives in `functions/.env` (`REVENUECAT_WEBHOOK_KEY`, not committed) and was shared with Adam directly. Never paste secrets into tracked files.
4. **RevenueCat email confirmation** (banner in dashboard)
5. **On-device pass of build 56** when TestFlight processes: reveal choreography, invite link tap (universal links start working in this build), sandbox purchase, new onboarding flow
6. Optional: point `link.getstoke.io` DNS (Squarespace) at Firebase Hosting for the pretty invite domain; ASC App Info → App Store Server Notifications URL from RevenueCat

## App Store Submission Checklist (remaining)
- [ ] Screenshots for the store (capture from build 56 — 3-tab v1 design)
- [ ] App Store copy/metadata review (STORE_METADATA.md exists — needs refresh against v1)
- [ ] Attach both subscriptions to the version page (required with first submission)
- [ ] Privacy nutrition labels review; `ITSAppUsesNonExemptEncryption` check
- [ ] Sandbox purchase test on device (build 56)
- [ ] Submit 1.0 for review

## Punch List (non-blocking)
- Content batch 2: 60 → ~180 scored prompts (12×15)
- Hidden screens: 907 design-lint warnings — next mechanical sweep before flipping rules to error
- Wave C phase-2 items (approved as post-launch): solo first answer while waiting; paywall product preview
- Welcome hero: commissioned illustration decision before store screenshots final
- uitest accounts cleanup (stoke.uitest.a/b@example.com + 26 tagged docs) when done testing
- invite-partner "Copied" Alert → quiet inline pattern (flagged cross-agent, unowned)

## Engineering Health
- App: tsc clean, 83 suites / 869 tests green; functions: 21 suites / 484 green (canonical 2026-07-20)
- Design lint: 0 violations in v1-visible surface
- main @ ff9fa71, pushed; working tree clean

## Key Metrics for v1 (post-launch)
Pairing ≥70% in 48h; couple-complete ≥50% at D7; follow-up completion deepener ≥60% / repair ≥40% / divergence ≥50%; ≥25% of scores in trigger zones; D7 ≥40%, D30 ≥20%; trial→paid ≥8%.

## Deferred (post-launch backlog, flagged off in code)
Four Engines screens, streaks, goals, wishlist, chat, games, date nights, coaching/AI coach, insights, memories, photo album, widgets, courses, weekly check-ins
