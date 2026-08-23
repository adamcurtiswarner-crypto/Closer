# Stoke Studio Status
*Last updated: 2026-08-22 — **CEO cycle: error-report review. Four heads in parallel (Engineering, Testing, Operations, PM). Root cause of all 20 production denials found and reproduced in the emulator. **D1 approved by Adam and DEPLOYED** — ruleset live 2026-08-22T22:36:03Z. The client fixes (D2/D3) are held for build 73.***

**SUBMIT-BY: 2026-09-01** (target 2026-08-27). Moved in writing by the CEO on 2026-08-22, per the 8/3 governance rule. The 8/6 "realistic" and 8/10 "conservative" dates were missed and never moved — that is the failure this line exists to prevent.

## THE HEADLINE (read this first)

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

## OPEN — P0s that still need a decision or a founder action

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | **`/admins` is empty — error alerting has NEVER worked** | Adam | Needs founder uid + a live push token. Proven by a **31-day** BigQuery outage nobody saw. Also locks `getDashboardMetrics`/`managePrompt`. |
| 2 | **BigQuery dataset `stoke_analytics` does not exist** | Studio | Export has failed **31/31 days**. Every launch metric (pairing, D7, D30, trial→paid) is currently **unmeasurable**. `/events` also never prunes (2,036 docs). |
| 3 | **Write-side completion race** | Studio | `e0e8908` fixed the *read* listeners; reaction/clarify **writes** still target a doc that may not exist. A failed reaction shows as permanently applied to the sender and never reaches the partner. |
| 4 | **Crisis lexicon not applied to clarify text** | Studio | `STORE_METADATA.md` tells App Review the app detects crisis language in written notes. Clarify is a new free-text channel it does not cover — **we would be stating something untrue to Apple.** |
| 5 | **Notification consent copy is now false** | Studio | Pre-permission copy promises two push types; the app sends **six**. 5.1.1 risk + trust defect. |
| 6 | **In-app `privacy-policy.tsx` dated March 2026** | Studio | Mentions streaks and AI coaching; the paywall's own 3.1.2 links point at it. |
| 7 | **Clarify question quoted verbatim on the lock screen** | Founder call | Intimate free text on a locked phone. Matches the existing explore precedent — decision, not defect. |

## Build state

| Build | Commit | Status |
|---|---|---|
| 72 | `2a8e6b8` | On TestFlight. **NOT submittable** — predates the completion-listener fix; live reactions and clarify die during a fresh reveal. |
| **73** | from `028cda5`+ | **Required before submission.** Not cut — standing build hold; needs Adam's explicit go. Must use `EXPO_NO_CAPABILITY_SYNC=1`, and **bump `runtimeVersion` off "2.0.0"** (native changes since). |

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
