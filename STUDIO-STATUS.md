# Stoke Studio Status
*Last updated: 2026-07-11 — Build 63 SUBMITTED to TestFlight (founder-pass batch complete). Board: 733 app / 470 functions / 34 rules / 18 flows. Critical path = founder items: W-9, legal confirmations, IAP screenshot, domain, paywall verdict.*

## Founder Directive (2026-07-05)
v1 = scored prompts by category + score-triggered follow-ups (deepener / repair / divergence). Everything else hidden via `src/config/features.ts`. Target: top 0.1% design quality for the category. Payments live. App Store submission next.

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
- App: tsc clean, 51 suites / 487 tests green; functions: 11 suites / 308 green (canonical 2026-07-09)
- Design lint: 0 violations in v1-visible surface
- main @ ff9fa71, pushed; working tree clean

## Key Metrics for v1 (post-launch)
Pairing ≥70% in 48h; couple-complete ≥50% at D7; follow-up completion deepener ≥60% / repair ≥40% / divergence ≥50%; ≥25% of scores in trigger zones; D7 ≥40%, D30 ≥20%; trial→paid ≥8%.

## Deferred (post-launch backlog, flagged off in code)
Four Engines screens, streaks, goals, wishlist, chat, games, date nights, coaching/AI coach, insights, memories, photo album, widgets, courses, weekly check-ins
