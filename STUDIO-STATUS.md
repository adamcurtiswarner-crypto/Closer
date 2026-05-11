# Stoke Studio Status
*Last updated: 2026-05-11 — CEO review*

## Current Sprint
- **Focus**: Fix iOS 26 launch crash — known React Native TurboModule bug
- **Sprint goal**: Get a working build on TestFlight
- **Status**: RED — BLOCKED. App crashes on launch on iOS 26 devices. Known upstream React Native bug (facebook/react-native#54859). Testing expo-updates disabled as workaround.

## Critical Issue: iOS 26 Launch Crash

**Symptom:** App crashes immediately on launch with SIGABRT on `expo.controller.errorRecoveryQueue` thread. Happens even with a completely stripped-down minimal layout (no JS init code at all).

**Root cause:** React Native TurboModule `performVoidMethodInvocation` doesn't properly catch NSExceptions on background queues on iOS 26. When any native module throws during initialization, the exception goes uncaught, hits `std::__terminate`, and the app aborts.

**Affected:** iPhone 18,1 running iOS 26.5. This is a known issue across the React Native ecosystem.

**Debugging timeline:**
- Build 37 (May 10): First crash on TestFlight after SDK 55 upgrade
- Build 38: Updated Sentry/RevenueCat — still crashes
- Build 39: Reverted Sentry to 7.11 — still crashes
- Build 40: Changed runtimeVersion policy — build failed on EAS
- Build 41: Static runtimeVersion, deleted stale ios/ — still crashes
- Build 43: Stripped _layout.tsx to bare minimum — STILL CRASHES (proves it's native, not JS)
- Build 44 (building): Disabled expo-updates entirely to bypass errorRecoveryQueue crash path

**References:**
- facebook/react-native#54859 — TurboModule SIGABRT on iOS 26
- expo/expo#44680 — Production crashes on A18 Pro + iOS 26
- expo/expo#44356 — Hermes PAC crashes on iOS 26

**Options if Build 44 still crashes:**
1. Try Expo SDK 56 (canary) with React Native 0.85
2. Test on an iOS 18.x device (crash may be iOS 26-specific)
3. Wait for React Native patch

## What Shipped (May 9-11)

### Expo SDK 52 -> 55 Upgrade (May 9-10)
Required because Apple now mandates iOS 26 SDK for App Store Connect uploads.
- Updated all Expo packages, React Native, React 19
- Fixed 5 TypeScript API changes (Input, notifications, file-system, vector-icons)
- Updated test infrastructure (reanimated mock, worklets mock, react-test-renderer 19)
- Updated EAS build image to Xcode 26.0
- Updated Sentry 6->7.11, RevenueCat 9->10
- New Stoke logo icon deployed

### Crash Debugging (May 10-11)
- Analyzed 3 crash logs from device
- Stripped app to bare minimum to isolate
- Confirmed crash is native (not JS) — happens even with empty layout
- Identified as known React Native iOS 26 TurboModule bug
- Deleted stale ios/ directory, added .easignore
- Testing expo-updates disabled as bypass

## Current State
- **_layout.tsx**: STRIPPED TO MINIMUM (debug mode) — needs restoring after crash is fixed
- **_layout.tsx.bak**: Full original layout backed up
- **expo-updates**: DISABLED in app.json (testing)
- **app.json**: Removed deprecated splash and assetBundlePatterns fields

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0
- Cloud Functions: 33 deployed on Node 22
- Working tree: Debug state (minimal layout, updates disabled)
- Expo SDK: 55
- React Native: 0.83.6
- Xcode: 26.0

## Roadmap
**BLOCKED on iOS 26 crash** -> Restore full layout -> TestFlight validation -> App Review -> iOS Widgets -> Courses
