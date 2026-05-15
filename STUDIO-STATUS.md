# Stoke Studio Status
*Last updated: 2026-05-15 — CEO review*

## Current Sprint
- **Focus**: Production release — get a working Release build on TestFlight, validate, submit for App Review
- **Sprint goal**: App Store submission
- **Status**: GREEN-YELLOW. App runs on device in Debug mode. iOS 26 crash resolved (Firebase 12 upgrade). Missing: Release build for TestFlight (EAS build credits exhausted, can build locally via Xcode). CI pipeline added. CLAUDE.md fully rewritten.

## What Shipped (May 11-13)

### iOS 26 Crash RESOLVED (May 11)
After 12 debug builds, the actual root cause was found:
- **NOT a React Native TurboModule bug** (our initial diagnosis was wrong)
- **Actual cause**: Firebase web SDK v10's `getAuth()` throws "Component auth has not been registered yet" on React Native 0.83 / New Architecture
- **Fix**: Upgraded Firebase 10.14.1 → 12.13.0 which fixes auth component registration
- App now launches successfully on physical iPhone (iOS 26.5) in Debug mode

### Debugging Journey (May 10-11, 12 builds)
- Builds 37-45: Various attempts (Sentry versions, runtimeVersion, stale ios/ dir, minimal layout, expo-updates disabled, Xcode 26.0 vs 26.2)
- Build 43: Stripped to absolute minimum — still crashed. Proved it was native.
- SDK 56 canary attempted but too unstable for production
- Breakthrough: local Xcode debug build → saw the actual JS error on device
- Firebase 12 upgrade fixed the crash immediately

### Additional Fixes (May 11)
- Missing Firestore composite index for `prompt_assignments` (couple_id + assigned_date ASC) — was causing `triggerPromptDelivery` to fail with FAILED_PRECONDITION
- Auto-trigger prompt delivery on Today screen load (no button tap needed)
- New Stoke logo icon deployed

### Infrastructure (May 13)
- **CI Pipeline**: GitHub Actions running TypeScript + 140 tests + Functions build on every push/PR
- **Staging Support**: .env.staging.example, EAS preview builds use APP_ENV=staging
- **Performance Monitoring**: Sentry tracing (20% sample rate) + profiling (10%)
- **CLAUDE.md**: Full rewrite — updated to SDK 55, added 6 development rules, known issues/gotchas section

## Current App State
- **Full layout restored** — all features working
- **expo-updates**: Re-enabled with runtimeVersion "2.0.0"
- **All plugins restored**: Sentry, notifications, calendar, Google Sign-In, etc.
- **Debug build runs on device** — tested on iPhone (iOS 26.5)
- **Release build needed** — EAS credits exhausted, can build locally via Xcode

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0
- Cloud Functions: 33 deployed on Node 22
- Expo SDK: 55
- React Native: 0.83.6
- Firebase: 12.13.0
- Working tree: 1 modified file (today.tsx — uncommitted auto-trigger)
- CI: GitHub Actions active

## Engineering Health
- **Tests**: All green
- **Types**: 0 errors
- **CI**: Running on every push
- **Design system**: Unified with theme.ts tokens
- **Known issue**: Release builds crash on iOS 26 physical devices (React Native 0.83 TurboModule bug, facebook/react-native#54859). Debug builds work. May need SDK 56 stable or RN patch for Release mode.

## What Needs Attention

### Release Build Path
The app works in Debug mode on device. For App Store submission, we need a Release build. Options:
1. **Build locally via Xcode** in Release configuration — need to resolve code signing for device
2. **Wait for EAS credits to replenish** — then build + submit via EAS
3. **Test Release build on simulator first** — already confirmed it works (Build succeeded on simulator in Release mode)
4. **The Release-mode physical device crash** may still exist (TurboModule bug). Need to test.

### Outstanding Items
| Priority | Item | Status |
|----------|------|--------|
| NOW | Test Release build on physical device | Needs Xcode signing setup |
| NOW | If Release works: submit to TestFlight | Needs EAS credits or Transporter |
| THIS WEEK | Test push notifications with partner | Still not done |
| THIS WEEK | Set up GCP error alerting | Not done |
| NEXT | Create staging Firebase project | Template ready |
| NEXT | iOS Widgets (Swift code already built) | Bridge disabled |
| LATER | Relationship Courses (#4) | Greenfield |

## Roadmap
Firebase Fix (DONE) → Release Build Test (NOW) → TestFlight → App Review → iOS Widgets → Courses
