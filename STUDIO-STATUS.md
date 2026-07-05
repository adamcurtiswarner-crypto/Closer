# Stoke Studio Status
*Last updated: 2026-07-05 — CEO review (design program complete; build 56 = submission candidate)*

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
- App: tsc clean, 41 suites / 363 tests green; functions: 169 tests green
- Design lint: 0 violations in v1-visible surface
- main @ ff9fa71, pushed; working tree clean

## Key Metrics for v1 (post-launch)
Pairing ≥70% in 48h; couple-complete ≥50% at D7; follow-up completion deepener ≥60% / repair ≥40% / divergence ≥50%; ≥25% of scores in trigger zones; D7 ≥40%, D30 ≥20%; trial→paid ≥8%.

## Deferred (post-launch backlog, flagged off in code)
Four Engines screens, streaks, goals, wishlist, chat, games, date nights, coaching/AI coach, insights, memories, photo album, widgets, courses, weekly check-ins
