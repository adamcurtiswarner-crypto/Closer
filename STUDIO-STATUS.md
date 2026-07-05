# Stoke Studio Status
*Last updated: 2026-07-05 — CEO review (v1 deployed to production backend; App Store steps remain)*

## Founder Directive (2026-07-05)
Adam reset the scope for the first App Store release. v1 is ONLY:
- A prompting system with many categories where couples answer scored questions
- A follow-up system triggered by scores: super-high scores get an "appreciation deepener", low scores get a guided-repair walkthrough
- No other features until post-launch

Everything else is HIDDEN via `src/config/features.ts` flags, not deleted.

## Current Sprint
- **Focus**: v1 built, design-conformed, E2E-verified, and backend DEPLOYED to production. Next: device build + App Store submission steps
- **Status**: GREEN on product/backend. YELLOW on submission (iOS 26 release-build crash unverified, RevenueCat unconfigured)

## Done Today (2026-07-05) — commits d86212d, 8ee80c1, 5d9a2b5

### Build (d86212d)
All six workstreams: client simplification (3 tabs: Today landing / Categories / Settings, features.ts flags), functions scope-cut (6 hidden-feature push schedules disabled, `functions/V1-SCOPE.md`), data model (scale + follow-up schema, 12-category taxonomy, rules, indexes), follow-up trigger (`functions/src/followUps.ts`: divergence gap ≥ 4 > repair min ≤ 4 > deepener both ≥ 9; deepener same-session, repair/divergence next-day scheduled + activated in delivery path replacing that day's daily; repair L2 chains next day), scored UI (ScaleSlider 1–10, optional note, side-by-side reveal, skippable follow-up cards), content (132 follow-up templates + 60 scored prompts across 12 categories, tone-lint clean). Paywall copy fixed; seed script fixed (was loading v3 from wrong dir + silently dropping fields).

### Design conformance (8ee80c1)
Both design agents swept every v1-visible surface against `docs/design-reference/StokeScreens.jsx` (checked into repo): zero hardcoded hexes remain, all Nunito family/weight mismatches fixed, pill buttons + eyebrow caps throughout, ScalePromptCard rebuilt as full-bleed ink hero with ToneShapes + dark-tone scale dots, Paywall as coral hero sheet, tab bar matched to reference Nav. theme.ts gained surface.ink + onDark group; brand.purpleLight migration slip fixed.

### Emulator E2E + critical race fix (5d9a2b5)
Full pipeline exercised live in Firebase emulators: seed counts verified (422 prompts / 132 templates), all branch scenarios PASS (deepener immediate, repair scheduled next-day, divergence overrides at 9/3 AND at exact gap 4, middle scores fire nothing, activation replaces daily prompt, repair chains step 2 same variant family, no over-chaining).
**Found + fixed a launch-blocking race**: onResponseSubmitted branched on the client-maintained response_count snapshot; under production timing the first response took the completion path (1-response completions, follow-ups never firing, streak double-counts). Now branches on the queried actual response count with atomic completion `create()` idempotency (winner runs streaks/reveal/follow-up exactly once). 6 new race tests; functions at 162/162.

### Production deployment (all verified)
1. Firestore rules + indexes deployed to stoke-5f762 ✓
2. Functions deployed with `--force`: all v1 functions updated (incl. race-fixed onResponseSubmitted + follow-up trigger); 6 hidden-feature schedules DELETED (checkStreakBreaks, deliverCheckIn, dateNightReminder, deliverMorningCheckin, deliverEveningReflection, detectChurnRisk) ✓
3. Production content seeded and verified by query: 422 prompts (60 scale with full scale_config intact), 132 follow_up_templates ✓

## What Needs Attention NOW (App Store path)

| Item | Status |
|---|---|
| Simulator/device visual pass with human eyes (design conformed in code; needs a look on device) | NOT DONE — `npx expo run:ios` |
| iOS 26 + RN 0.83 release-build TurboModule crash (facebook/react-native#54859) | UNVERIFIED — submission blocker |
| RevenueCat configuration (decide trial length first: spec says 14-day, paywall copy says 7-day) | NOT CONFIGURED |
| Push notifications end-to-end test on device (incl. new "Today's follow-up is ready.") | NOT TESTED |
| getstoke.io live URLs | NOT VERIFIED |
| App Store screenshots (3-tab v1 design) | NOT CAPTURED |
| TestFlight build | STALE — needs rebuild from d86212d+ |

## Punch List (non-blocking)
- Safety off-ramp (crisis-lexicon suppression of follow-ups + resources screen) — spec'd, NOT built; strongly recommended before public launch
- Content batch 2: grow 60 → ~180 scored prompts (15/category)
- Shared `src/components/Button.tsx` primitive still non-conformant (radius 12, Nunito-Bold+'600'); used by auth screens
- Emulator tooling: firebase-tools proxy bug breaks admin.firestore.FieldValue in emulated triggers (E2E agent patched a scratchpad copy); long-term migrate functions to `import { FieldValue } from 'firebase-admin/firestore'`. OpenJDK 26 now installed locally for emulators
- Seed script hardcodes emulator project id 'closer-app-dev'; add a `.firebaserc` so emulator + CLI project ids agree
- "Explore prompts" row copy on Today vs tab named "Categories"
- specs/types.ts schema additions live OUTSIDE this git repo (repo root is app/) — not covered by today's commits
- 14-day curated category rotation (current: weighted-random within scale prompts; acceptable v1)

## Engineering Health
- App: tsc clean, 28 suites / 192 tests passing
- Functions: build clean, 3 suites / 162 tests passing
- Working tree: clean at 5d9a2b5 (main, not pushed — no remote configured check pending)
- Expo SDK 55, Firebase 12.13.0, RN 0.83.6

## Key Metrics for v1 (post-launch)
Pairing ≥70% in 48h; couple-complete ≥50% at D7; follow-up completion deepener ≥60% / repair ≥40% / divergence ≥50%; ≥25% of scores in trigger zones; D7 ≥40%, D30 ≥20%; trial→paid ≥8%.

## Deferred (post-launch backlog, flagged off in code)
Four Engines screens, streaks, goals, wishlist, chat, games, date nights, coaching/AI coach, insights, memories, photo album, widgets, courses, weekly check-ins
