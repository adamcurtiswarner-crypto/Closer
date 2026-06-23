# Stoke Studio Status
*Last updated: 2026-06-23 — CEO review (session 2)*

## Current Sprint
- **Focus**: Four Engines redesign — design system migration + new screen builds
- **Sprint goal**: Implement designer handoff (new design system, 6 new engine screens)
- **Status**: GREEN. Design system fully migrated. All 6 new engine screens built. 24/24 tests passing, 0 TS errors.

## What Shipped Since Last Update (May 18-24)

### May 24 — Prompt Library Expansion + CI Agent
- Expanded prompt library from 162 to 362 prompts
- Added competitive intelligence agent to studio

### May 18 — Badge System + Real-Time Sync + Fixes
- Badge system redesign + chat removal
- Face ID fix: biometric only on cold start, not every foreground
- Converted wishlist, date nights, goals, love languages to real-time sync (onSnapshot)
- Fixed partner love language query (couple.id cache key, reduced stale time)

## Blockers (All Operational, Not Code)

| # | Blocker | Severity | What Exists | What's Missing |
|---|---------|----------|-------------|----------------|
| 1 | **RevenueCat not configured** | CRITICAL | Paywall UI, useSubscription hook, webhook Cloud Function — all code-complete | RevenueCat project, App Store Connect in-app purchases ($49.99/yr, $9.99/mo), API key in env, `react-native-purchases` in app.json plugins array |
| 2 | **Push notifications untested** | CRITICAL | Client registration, FCM sendEach(), 5 notification Cloud Functions — all deployed | Never tested end-to-end on two real devices. 10+ weeks overdue. |
| 3 | **TestFlight build stale** | HIGH | May 17 build in App Store Connect | 37 days old, missing last 5 commits, never human-validated. Known iOS 26 + RN 0.83 TurboModule crash risk (facebook/react-native#54859). |

### Additional Pre-Submission Items
| Item | Status |
|------|--------|
| getstoke.io live (privacy, terms, support URLs) | NOT VERIFIED — Apple requires live URLs |
| App Store screenshots (8 screens) | NOT CAPTURED |
| App Review test account with partner data | NOT CREATED |
| `react-native-purchases` in app.json plugins | MISSING — native module won't link without it |

## Action Plan (This Week)

### Day 1: RevenueCat Setup
1. Create in-app purchase products in App Store Connect (annual $49.99, monthly $9.99)
2. Create RevenueCat project, connect to App Store Connect
3. Configure `premium` entitlement
4. Add API key to `.env` as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
5. Add `react-native-purchases` to `app.json` plugins array
6. Set `revenuecat.webhook_key` in Firebase functions config
7. Point RevenueCat webhook URL to deployed `revenueCatWebhook` function

### Day 2: Build + Validate
1. Check status of facebook/react-native#54859 (iOS 26 crash)
2. Build fresh production binary via local Xcode (EAS credits reset June 1)
3. Install TestFlight on two physical devices
4. Test complete flow: signup, partner link, prompt delivery, response, streak
5. Verify push notification token appears in Firestore, trigger notification, confirm delivery
6. Test payment flow through RevenueCat sandbox

### Day 3: Submit
1. Capture App Store screenshots (8 screens per STORE_METADATA.md)
2. Create demo test account with pre-linked partner for App Review
3. Verify getstoke.io URLs are live
4. Submit for App Store Review

## Engineering Health
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0
- Cloud Functions: 35 deployed, all scheduled functions running
- Working tree: clean
- Expo SDK: 55 (upgrade to latest post-launch)
- Firebase: 12.13.0
- React Native: 0.83.6
- EAS builds: reset June 1 (credits available)

## Risk Register
| Risk | Impact | Mitigation |
|------|--------|------------|
| iOS 26 + RN 0.83 TurboModule crash in release builds | Blocks submission entirely | Check #54859 status first. Fallback: build with Xcode 16 / iOS 18 SDK |
| Scheduled functions consuming resources while idle | Low cost but worth checking | Review Firebase Console for billing surprises |
| `autoGeneratePrompts` using Anthropic API credits weekly | Unexpected charges | Verify API key validity and charges |
| Expo SDK 55 is ~14 months old | App Review could flag outdated toolchain | Upgrade post-submission, not before |

## Roadmap
Together Redesign (DONE) -> Calendar Streak (DONE) -> Infrastructure (DONE) -> Prompt Expansion (DONE) -> Badge Redesign (DONE) -> Real-Time Sync (DONE) -> **App Store Submission (NOW)** -> iOS Widgets -> Courses
