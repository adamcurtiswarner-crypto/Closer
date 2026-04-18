# Stoke Studio Status
*Last updated: 2026-04-18 — CEO session (encryption removal, push fixes, all pushed)*

## Current Sprint
- **Focus**: Launch readiness — App Store metadata, manual push test, then submit
- **Sprint goal**: App Store submission ready
- **Status**: IN PROGRESS — GREEN. Encryption removed, push notifications fixed, all pushed. Only metadata and manual validation remain.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| Push notification manual validation | Engineering | TODO | Adam needs to test with partner on device |
| Firestore security rules deploy | Operations | TODO | Firebase Console (Adam) |
| GCP Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| App Store metadata update | Operations | TODO | STORE_METADATA.md references "Closer", dead encryption claims |
| iOS Home Screen Widgets | Engineering | BRIDGE DISABLED | Swift widgets built, bridge is no-op stub |
| Feature #4 — Relationship Courses | All | Backlog | Greenfield — no code exists |

## What Shipped (Committed March 28, Build 29)
- Biometric unlock: `useBiometricAuth` hook, `BiometricGate` component, settings toggle
- Account deletion: `ReauthModal` (password/Google/Apple), subscription warning, SecureStore cleanup
- Terms of Service: full screen at `/app/(app)/terms-of-service.tsx`, linked from sign-up and settings
- Home screen redesign: profile moved to Home, partner info in settings
- Streak animations, prompt trigger refresh fix
- `expo-local-authentication` added, `NSFaceIDUsageDescription` in app.json

## Shipped Today (April 18)
- Pushed 2 commits to origin (biometric, re-auth, ToS, Home redesign — was 3 weeks stale)
- Stripped all AES-256-CBC encryption code (286-line service + all hook integrations)
- Encryption compliance resolved: `ITSAppUsesNonExemptEncryption: false` is now truthful
- Privacy policy updated to remove encryption claims
- Cloud Functions: removed `migrateEncryptedResponses`, cleaned `response_text_encrypted` from triggers
- Push notification code audit completed — 4 issues identified for fixing

## Key Metrics
- Test suites: 24/24 passing (140 tests)
- TypeScript errors: 0 across all codebases
- Cloud Functions: 34 deployed on Node 22 (7 modules)
- Analytics events: 66 distinct event types tracked
- Working tree: CLEAN
- Days since last commit: 0 (2 commits today: encryption removal + push notification fixes)
- Production build: 29 (latest)

## Engineering Health
- **Tests**: All green
- **Types**: 0 errors
- **Design system**: Unified — #c97454 accent, #fef7f4 background
- **Tech debt**: Expo SDK 52 (current is 55)
- **Dependencies**: Expo SDK 3 majors behind, Sentry 2 majors behind — not urgent for launch

## Completed Features (Full Inventory)
- Daily prompts with real-time sync + offline queue
- Partner response reveal + completion moments
- Streak tracking with animated StreakRing
- Prompt reactions
- AI Coaching (weekly pulse, insights, action items) — premium-gated
- Couple Games (Would You Rather, How Well Do You Know Me, Truth or Dare) — SHIPPED, remove from roadmap
- Date Night Planner (ideas library, calendar integration, reflection) — SHIPPED, remove from roadmap
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
1. ~~Push 2 unpushed commits~~ DONE
2. ~~Push notification fixes~~ DONE (all 14 notifications have data.type, token refresh listener added, chat deep link added)
3. ~~Encryption compliance~~ DONE (code removed)
4. **App Store metadata** — STORE_METADATA.md still says "Closer", references disabled encryption

## Known Bugs
- Memories photo add silently fails for non-premium users (paywall UX unclear)
- Widget bridge disabled (Swift widgets built but data not flowing)

## Compliance Status
- Privacy policy: DONE (screen + sign-up link)
- AI disclosure: DONE
- Non-clinical disclaimer: DONE
- Data retention policy: DONE
- Account deletion: DONE (hardened with re-auth)
- Biometric security: DONE (committed)
- Terms of Service: DONE (screen + sign-up link)
- Encryption declaration: RESOLVED (AES code removed, `ITSAppUsesNonExemptEncryption: false` is accurate)

## Roadmap (Updated)
#6 Check-ins (DONE) -> Figma Redesign (DONE) -> Home Screen (DONE) -> #5 AI Coach (DONE) -> #7 Photo Album (DONE) -> Prompt Reactions (DONE) -> #2 Couple Games (DONE) -> #3 Date Night Planner (DONE) -> Biometric + Re-auth (DONE) -> ToS (DONE) -> **Push Validation + Encryption Decision (NOW)** -> iOS Widgets (Next) -> #4 Courses (Later)

## Adam Actions (Prioritized)
| Priority | Item | Time |
|----------|------|------|
| NOW | Push 2 unpushed commits to origin | 5 sec |
| NOW | Validate push notifications end-to-end with partner | 15 min |
| THIS WEEK | Decide encryption: remove AES code OR declare encryption to Apple | Decision |
| THIS WEEK | Deploy Firestore security rules to production | 5 min |
| THIS WEEK | Set up GCP error alerting | 15 min |
| THIS WEEK | Update STORE_METADATA.md (rename Closer -> Stoke, fix URLs, remove encryption claim) | 30 min |
| NEXT SPRINT | Re-enable widget bridge (Swift widgets already built) | 2-4 hrs |
| NEXT SPRINT | Add premium gate UX to memories photo upload | 30 min |
| LATER | Plan Relationship Courses (#4) — needs PRD + data model | Greenfield |
| LATER | Expo SDK 52 -> 55 upgrade | Medium effort |
