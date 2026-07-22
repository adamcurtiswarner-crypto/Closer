# Stoke Studio Status
*Last updated: 2026-07-22 — **Build 67 cutting on EAS (id 77d2e35c; submits to TestFlight on completion — Adam lifted the build hold for this one).** Contents since 66: Categories tab in the prompt design language (ink hero category band, hero responding card, heading-voice questions), reveal typography unified to the prompt voice (headingLg question, bodyLg answers, new bodyLg token), reaction ring lights optimistically + "partner was moved" line centered. Already LIVE server-side since 7/21 (independent of builds): notification policy — exactly two push events (new prompt ready / partner responded); reminder/reaction/chat push functions deleted from prod. Build holds resume after this cut — no further builds without Adam's go. Submission runway still gated on Adam's founder items below.*

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
