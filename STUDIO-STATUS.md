# Stoke Studio Status
*Last updated: 2026-04-25 — CEO review*

## Current Sprint
- **Focus**: App Store submission — validate Build 30 on TestFlight, then submit for review
- **Sprint goal**: App Store review submission
- **Status**: IN PROGRESS — YELLOW. Build 30 on TestFlight since Apr 22. No commits in 7 days. Manual push test and ops items still pending.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| TestFlight submission | Operations | DONE | Build 30 submitted to TestFlight Apr 22 |
| Push notification manual validation | Engineering | TODO | Adam needs to test with partner on device |
| Firestore security rules deploy | Operations | TODO | Firebase Console (Adam) |
| GCP Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| iOS Home Screen Widgets | Engineering | BRIDGE DISABLED | Swift widgets built, bridge is no-op stub |
| Feature #4 — Relationship Courses | All | Backlog | Greenfield — no code exists |

## What Shipped (April 18 Session)
- Pushed 2 stale commits to origin (biometric, re-auth, ToS, Home redesign — was 3 weeks old)
- Stripped all AES-256-CBC encryption code (286-line service + all hook integrations, -597 lines)
- Encryption compliance resolved: `ITSAppUsesNonExemptEncryption: false` is now truthful
- Privacy policy updated to remove encryption claims
- Push notification deep links fixed: all 14 notification types now include `data.type`
- Token refresh listener added for FCM/APNs rotation
- Chat message tap now routes to `/(app)/chat`
- Cloud Functions: 33 deployed (removed `migrateEncryptedResponses`)
- App Store metadata rewritten: Closer -> Stoke, added 9 features, fixed URLs
- Build 30 compiled (production profile, EAS)
- Notion build summary page created

## Build 30 Status
- **IPA**: https://expo.dev/artifacts/eas/qNGxhPKKmsP5W6exWZWoyS.ipa
- **Build page**: https://expo.dev/accounts/adamcurtiswarner/projects/stoke/builds/c8e0864c-772b-4835-b365-7044f162388a
- **Version**: 1.0.0, build number 30
- **TestFlight**: SUBMITTED Apr 22. Available for testing.
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6759679330/testflight/ios

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0 across all codebases
- Cloud Functions: 33 deployed on Node 22 (7 modules)
- Analytics events: 66 distinct event types tracked
- Working tree: CLEAN
- Days since last commit: 7 (last: Apr 18)
- Production build: 30 (on TestFlight since Apr 22)

## Engineering Health
- **Tests**: All green
- **Types**: 0 errors
- **Design system**: Unified — #c97454 accent, #fef7f4 background
- **Tech debt**: Expo SDK 52 (current is 55)

## Completed Features (Full Inventory)
- Daily prompts with real-time sync + offline queue
- Partner response reveal + completion moments
- Streak tracking with animated StreakRing
- Prompt reactions
- AI Coaching (weekly pulse, insights, action items) — premium-gated
- Couple Games (Would You Rather, How Well Do You Know Me, Truth or Dare)
- Date Night Planner (ideas library, calendar integration, reflection)
- Shared Photo Album / Memories
- Weekly Check-ins
- Wishlist / Goal tracker
- Real-time Chat
- Conversation starters
- Biometric unlock (Face ID/Touch ID)
- Account deletion with re-auth
- Terms of Service + Privacy Policy
- Data export + response anonymization
- OTA updates via expo-updates
- i18n infrastructure (English, ~185 keys)
- Admin dashboard (Next.js)
- RevenueCat subscription integration

## Launch Blockers (Prioritized)
1. ~~Push unpushed commits~~ DONE
2. ~~Encryption compliance~~ DONE (code removed)
3. ~~Push notification deep links~~ DONE (all 14 types)
4. ~~App Store metadata~~ DONE (Closer -> Stoke)
5. ~~TestFlight submission~~ DONE (Apr 22)
6. **Push notification manual test** — untested end-to-end with real partner

## Known Bugs
- Memories photo add silently fails for non-premium users (paywall UX unclear)
- Widget bridge disabled (Swift widgets built but data not flowing)

## Compliance Status
- Privacy policy: DONE
- AI disclosure: DONE
- Non-clinical disclaimer: DONE
- Data retention policy: DONE
- Account deletion: DONE (hardened with re-auth)
- Biometric security: DONE
- Terms of Service: DONE
- Encryption declaration: RESOLVED
- App Store metadata: DONE

## Roadmap (Updated)
Check-ins (DONE) -> Redesign (DONE) -> Home (DONE) -> AI Coach (DONE) -> Photo Album (DONE) -> Reactions (DONE) -> Games (DONE) -> Date Nights (DONE) -> Biometric (DONE) -> ToS (DONE) -> Encryption Removal (DONE) -> Push Fixes (DONE) -> Metadata (DONE) -> **TestFlight + Validation (NOW)** -> iOS Widgets (Next) -> #4 Courses (Later)

## Adam Actions (Prioritized)
| Priority | Item | Time |
|----------|------|------|
| NOW | Validate push notifications end-to-end with partner (Build 30 on TestFlight) | 15 min |
| THIS WEEK | Deploy Firestore security rules to production | 5 min |
| THIS WEEK | Set up GCP error alerting | 15 min |
| THIS WEEK | Create test account couple for App Review | 15 min |
| THIS WEEK | Verify getstoke.io/privacy and /support URLs are live | 5 min |
| NEXT SPRINT | Re-enable widget bridge (Swift widgets already built) | 2-4 hrs |
| NEXT SPRINT | Add premium gate UX to memories photo upload | 30 min |
| LATER | Plan Relationship Courses (#4) — needs PRD + data model | Greenfield |
| LATER | Expo SDK 52 -> 55 upgrade | Medium effort |
