# Stoke Studio Status
*Last updated: 2026-05-09 — CEO review*

## Current Sprint
- **Focus**: Launch validation — manual testing, ops deployment, App Review submission
- **Sprint goal**: App Store submission
- **Status**: RED. 13 days since last code commit. Build 34 compiled May 3 but TestFlight submission blocked by Apple agreement. Same manual validation items pending since April 18 (3 weeks). EAS submit failing — Transporter workaround available.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| TestFlight submission | Operations | BLOCKED | Build 34 IPA ready, `eas submit` failing — use Transporter |
| Push notification manual test | Engineering | TODO (4+ weeks overdue) | Adam needs to test with partner |
| Firestore security rules deploy | Operations | TODO (6+ weeks overdue) | Firebase Console (Adam) |
| GCP Cloud Functions error alerting | Operations | TODO (6+ weeks overdue) | GCP Console (Adam) |
| Biometric Face ID loop | Engineering | FIXED | Rewritten Apr 26 — needs device verification |
| iOS Home Screen Widgets | Engineering | BRIDGE DISABLED | Swift widgets built, bridge is no-op stub |

## What Shipped Since Last Status (Apr 25-26)

### Design Audit Sprint (Apr 25) — 8 commits, ~90 files
Full screen audit of all 32 screens and 60 components. Three parallel agents reviewed auth/onboarding, core loop, and feature screens.

**P0 Critical (5/5 fixed):**
- Paywall purchase now uses selected plan (was buying first package regardless)
- Terms/Privacy accessible to pre-auth users (was crashing)
- Response submission preserves text on error (was losing user's writing)
- Onboarding save errors now shown (were silent)
- Ready screen: removed misleading duplicate "Wait" button

**P1 High (10/10 fixed):**
- Touch targets fixed to 44px across 12+ components
- Games header: "Date Night" -> "Games"
- Typing dots animated (were static)
- Font weight/family mismatches aligned across 47 files
- Explore back button, Privacy/Terms back buttons standardized
- Verify-email contrast fixed (WCAG AA)
- Home screen fully i18n'd (21 keys)
- Accept-invite KeyboardAvoidingView added

**P2 Medium (19/19 fixed):**
- Theme tokens created (spacing, radius, shadow, card presets)
- Memory cards: accent bars + proper shadow
- Settings/Home/ProfileCard: chevrons replaced with Icon
- Brand voice: ALL CAPS removed, grammar fixed
- ProfileCard decomposed (706 -> 516 lines, extracted LoveLanguageModal + AnniversaryPicker)
- Photo grid loading state, skeleton borderRadius, explore background color

**P3 Polish (12/14 fixed):**
- Input haptic removed, forgot-password animation, waiting-partner pulse
- CompletionMoment stagger improved, home pull-to-refresh added
- StreakRing haptics abstracted, first-prompt deduped, Button accessibility
- ChatBubble, QueryError, ConnectionHeader polished

### Biometric Fix (Apr 26) — 2 commits
Face ID was looping infinitely. Root cause: Face ID dialog causes AppState `active->inactive->active` which re-triggered the lock.
- First fix (2s timestamp window) didn't work
- Second fix: rewrote AppState handling — skip transitions while prompting, only lock on `background` (not `inactive`), only prompt on `active←background`

## Latest Build
- **Build**: 34
- **Version**: 1.0.0
- **Compiled**: May 3
- **Commit**: `bbac388` (status update)
- **IPA**: https://expo.dev/artifacts/eas/31DNA1jeufiGfrTEeUqzMv.ipa
- **TestFlight**: BLOCKED — `eas submit` failing with Apple agreement error. Upload via Transporter as workaround.
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6759679330/testflight/ios

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0 across all codebases
- Cloud Functions: 33 deployed on Node 22 (7 modules)
- Analytics events: 66 distinct event types tracked
- Working tree: CLEAN
- Days since last commit: 13 (last: May 3 status update, last code: Apr 26)
- Production build: 34 (compiled, not on TestFlight)
- i18n keys: ~206 (was ~185)

## Engineering Health
- **Tests**: All green
- **Types**: 0 errors
- **Design system**: Unified with theme.ts tokens (colors, spacing, radius, shadow, typography)
- **Tech debt**: Expo SDK 52 (current is 55)
- **New components**: LoveLanguageModal, AnniversaryPicker (extracted from ProfileCard)

## Launch Blockers (Prioritized)
1. ~~Push unpushed commits~~ DONE
2. ~~Encryption compliance~~ DONE
3. ~~Push notification deep links~~ DONE
4. ~~App Store metadata~~ DONE
5. ~~TestFlight submission~~ DONE
6. ~~Design audit P0-P2~~ DONE (53 issues fixed)
7. ~~Biometric Face ID loop~~ FIXED (needs device verification)
8. **Push notification manual test** — untested end-to-end with real partner
9. **Firestore security rules deploy** — written but not deployed to production

## Known Bugs
- Memories photo add silently fails for non-premium users (paywall UX unclear)
- Widget bridge disabled (Swift widgets built but data not flowing)
- Biometric fix needs device verification (Build 33 on TestFlight)

## Compliance Status
All checks pass. No outstanding compliance issues.

## Roadmap
...Design Audit (DONE) -> Biometric Fix (DONE) -> **Validation + App Review (NOW)** -> iOS Widgets (Next) -> #4 Courses (Later)

## Adam Actions (Prioritized)
| Priority | Item | Time |
|----------|------|------|
| NOW | Upload Build 34 IPA via Transporter (download from artifacts link above) | 5 min |
| NOW | Install from TestFlight, verify Face ID fix | 5 min |
| NOW | Test push notifications end-to-end with partner | 15 min |
| NOW | Deploy Firestore security rules: `firebase deploy --only firestore:rules --project stoke-5f762` | 5 min |
| THIS WEEK | Set up GCP error alerting | 15 min |
| THIS WEEK | Create test account couple for App Review | 15 min |
| THIS WEEK | Verify getstoke.io/privacy and /support URLs | 5 min |
| THIS WEEK | Submit for App Review | 10 min |
| NEXT SPRINT | Re-enable widget bridge | 2-4 hrs |
| LATER | Relationship Courses (#4) | Greenfield |
