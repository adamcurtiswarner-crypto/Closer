# Stoke Studio Status
*Last updated: 2026-03-28 — CEO review*

## Current Sprint
- **Focus**: Launch readiness — commit security features, close compliance gaps
- **Sprint goal**: All App Store blockers resolved, core loop validated end-to-end
- **Status**: IN PROGRESS — YELLOW. Biometric + re-auth done but uncommitted. ToS still missing.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| Biometric unlock (Face ID/Touch ID) | Engineering | DONE — UNCOMMITTED | Needs commit + build |
| Account deletion re-auth hardening | Engineering | DONE — UNCOMMITTED | Needs commit + build |
| Terms of Service | Operations/Legal | TODO — LAUNCH BLOCKER | Content needed |
| Push notification end-to-end validation | Engineering | NEEDS VALIDATION | Cloud Function deployed, not confirmed working |
| Encryption key exchange | Engineering | DISABLED | Key mismatch between partners — disabled in commit 21106b2 |
| GCP Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| Firestore security rules deploy | Operations | TODO | Firebase Console (Adam) |
| App Store metadata | Operations | TODO (LOW) | App Store Connect (Adam) |
| Feature #4 — Relationship Courses | All | Backlog | Blocked until launch items clear |

## What Shipped (Builds 27-29, March 25-26)
- Encryption key exchange implementation (then disabled due to key mismatch)
- Push notification tokens: switched to native FCM/APNs, server auto-cleans stale tokens
- expo-updates configured (OTA updates, appVersion runtime policy)
- Core loop polish: trigger button style, explore response viewer
- Invite flow validated with real partner

## What's Ready to Ship (Uncommitted, March 28)
- Biometric unlock: `useBiometricAuth` hook, `BiometricGate` component, settings toggle
- Account deletion: `ReauthModal` (password/Google/Apple), subscription warning, SecureStore cleanup
- `expo-local-authentication` added, `NSFaceIDUsageDescription` in app.json
- 7 modified files, 4 new files, 0 type errors, 145/145 tests passing

## Key Metrics
- Test suites: 25/25 passing (145 tests)
- TypeScript errors: 0 across all codebases
- Cloud Functions: 34 deployed on Node 22
- Working tree: 11 changed files (biometric + re-auth work)
- Production build: 29 (latest)

## Engineering Health
- **Tests**: All green
- **Types**: 0 errors
- **Design system**: Unified — #c97454 accent, #fef7f4 background
- **Tech debt**: Encryption disabled (key exchange broken), conversation starter timer dead code

## Launch Blockers (Prioritized)
1. **Terms of Service** — Apple hard requirement, no ToS screen exists
2. **Push notification validation** — Core loop retention depends on this
3. **Encryption compliance** — app.json declares no encryption but AES-256-CBC code exists (currently disabled)

## Known Bugs
- Conversation starter timer is dead code (durationMinutes never passed)
- Memories photo add silently fails for non-premium users (paywall UX unclear)

## Compliance Status
- Privacy policy: DONE (screen + sign-up link)
- AI disclosure: DONE
- Non-clinical disclaimer: DONE
- Data retention policy: DONE
- Account deletion: DONE (hardened with re-auth)
- Biometric security: DONE (uncommitted)
- Terms of Service: MISSING — LAUNCH BLOCKER
- Encryption declaration: CONTRADICTORY (code exists but flagged as non-exempt)

## Roadmap
#6 Check-ins (DONE) → Figma Redesign (DONE) → Home Screen (DONE) → #5 AI Coach (DONE) → #7 Photo Album (DONE) → Prompt Reactions (DONE) → Biometric + Re-auth (DONE*) → **ToS + Push Validation (NOW)** → #4 Courses (Next)

## Adam Actions (Prioritized)
| Priority | Item | Time |
|----------|------|------|
| NOW | Commit biometric + re-auth work, cut Build 30 | 5 min |
| NOW | Add Terms of Service screen | 1-2 hrs (Engineering) |
| THIS WEEK | Validate push notifications end-to-end with partner | 15 min |
| THIS WEEK | Deploy Firestore security rules to production | 5 min |
| THIS WEEK | Set up GCP error alerting | 15 min |
| BEFORE LAUNCH | Resolve encryption compliance (enable or document) | Decision |
| LOW | Kill conversation starter timer dead code | 10 min |
| LOW | Add premium gate UX to memories photo upload | 30 min |
| LOW | App Store metadata | 10 min |
