# Stoke Studio Status
*Last updated: 2026-07-05 — CEO review (v1 build complete, pre-submission)*

## Founder Directive (2026-07-05)
Adam reset the scope for the first App Store release. v1 is ONLY:
- A prompting system with many categories where couples answer scored questions
- A follow-up system triggered by scores: super-high scores get an "appreciation deepener", low scores get a guided-repair walkthrough
- No other features until post-launch

Everything else is HIDDEN via `src/config/features.ts` flags, not deleted.

## Current Sprint
- **Focus**: v1 simplification — DONE. Next: device testing + deployment + App Store submission
- **Status**: GREEN on build (all workstreams landed, full regression passing), YELLOW on submission (iOS 26 release-build crash unverified, RevenueCat unconfigured)

## v1 Build — COMPLETE (2026-07-05, uncommitted working tree)

All six workstreams landed and verified. Regression: app tsc clean, 28 suites / 192 tests passing; functions build clean, 156 tests passing; data files valid JSON.

| Workstream | What landed |
|---|---|
| Client simplification | 3 tabs (Today landing / Categories / Settings) driven by `src/config/features.ts`; today.tsx stripped of streak/check-in/coaching/spark/wishlist/memories entry points; notification-tap routing falls back to Today for hidden targets; onboarding copy audited (already v1-accurate) |
| Functions scope-cut | 6 scheduled push functions disabled in index.ts barrel (checkStreakBreaks, deliverCheckIn, dateNightReminder, deliverMorningCheckin, deliverEveningReflection, detectChurnRisk). sendWeeklyRecaps audited and kept. Deploy-time delete commands in `functions/V1-SCOPE.md` |
| Data model | Scale + follow-up schema in specs/types.ts, functions/src/shared.ts, src/types; 12-category taxonomy in promptCategories.ts (legacy 6 kept, marked); firestore.rules for follow_up_templates; 2 new composite indexes |
| Follow-up trigger | `functions/src/followUps.ts` wired into onResponseSubmitted. Precedence: divergence (gap ≥ 4) > repair (min ≤ 4) > deepener (both ≥ 9). Deepener same-session; repair L1/divergence next-day via status 'scheduled' + activation in the delivery path (replaces that day's daily prompt); repair L2 chains the day after L1 completes; depth capped; idempotent; 44 dedicated tests |
| Scored UI | ScaleSlider (1–10 dots, anchored labels), ScalePromptCard with optional note, side-by-side score reveal in CompletionMoment, follow-up context lines + closing text, local skip mechanism (AsyncStorage, no nagging, expires server-side) |
| Content | `app/data/follow-up-templates-v1.json` (132 templates: 36 deepener / 72 repair / 24 divergence) + `app/data/seed-prompts-v5.json` (60 scored prompts, 5×12 categories, 3 comfortable / 2 brave each). Tone-lint clean. Seed script fixed (was pointing at v3 in the wrong directory; now seeds v4+v5+templates, fixed silent field-drop) |
| Extras | Paywall benefits copy rewritten to v1-accurate (was advertising coaching/insights/check-ins); CLAUDE.md updated (tabs, functions scope, follow_up_templates collection) |

### Locked product decisions (reference)
Scale 1–10 ("Struggling"…"Thriving"); thresholds low ≤ 4 / high ≥ 9 (both partners) / divergence gap ≥ 4; blind answer → reveal when both submit; follow-ups max 2 levels, always skippable; 12 categories, curated rotation with override; deepener same-session, repair/divergence next-day; v1 prompt selection filters to scale-format prompts.

## What Needs Attention NOW

### Priority 1: Verify & commit
| Item | Status |
|---|---|
| Review + commit the v1 working tree (large uncommitted diff on main) | AWAITING ADAM — CEO recommends commit |
| Emulator end-to-end test: seed → deliver → both respond → branch fires → next-day activation | NOT DONE (unit-tested only) |
| Device/simulator visual pass on ScaleSlider, reveal, follow-up cards, Categories tab | NOT DONE |

### Priority 2: Deployment (in order, when ready)
1. `firebase deploy --only firestore:rules,firestore:indexes`
2. `firebase deploy --only functions` then run the `functions:delete` list in `functions/V1-SCOPE.md`
3. Seed production `prompts` (v5) + `follow_up_templates` (script currently targets emulator — needs a production path or admin managePrompt route)

### Priority 3: App Store blockers (unchanged)
| Item | Status |
|---|---|
| iOS 26 + RN 0.83 release-build TurboModule crash (facebook/react-native#54859) | UNVERIFIED — submission blocker |
| RevenueCat configuration | NOT CONFIGURED |
| Push notifications end-to-end test | NOT TESTED |
| getstoke.io live URLs | NOT VERIFIED |
| App Store screenshots (3-tab v1 design) | NOT CAPTURED |

## Punch List (non-blocking)
- Content batch 2: grow 60 → ~180 scored prompts (15/category) before or shortly after launch
- Safety off-ramp (crisis-lexicon suppression of follow-ups + resources screen) — spec'd, NOT built; strongly recommended before public launch
- "Explore prompts" row copy on Today vs tab named "Categories" — copy inconsistency
- 14-day curated rotation (current selection is weighted-random within scale prompts; acceptable v1)
- Paywall trial length: product spec said 14-day full-access trial; current copy says 7-day — decide before RevenueCat config

## Engineering Health
- App: tsc clean, 28 suites / 192 tests passing
- Functions: build clean, 2 suites / 156 tests passing
- Working tree: LARGE UNCOMMITTED v1 diff on main (intentional — awaiting review/commit)
- Expo SDK 55, Firebase 12.13.0, RN 0.83.6

## Key Metrics for v1 (post-launch)
Pairing ≥70% in 48h; couple-complete ≥50% at D7; follow-up completion deepener ≥60% / repair ≥40% / divergence ≥50%; ≥25% of scores in trigger zones; D7 ≥40%, D30 ≥20%; trial→paid ≥8%.

## Deferred (post-launch backlog, flagged off in code)
Four Engines screens, streaks, goals, wishlist, chat, games, date nights, coaching/AI coach, insights, memories, photo album, widgets, courses, weekly check-ins
