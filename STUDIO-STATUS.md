# Stoke Studio Status
*Last updated: 2026-03-25 — CEO review*

## Current Sprint
- **Focus**: User testing, bug fixes, invite flow validation
- **Sprint goal**: Validate core loop works end-to-end with two real users
- **Status**: IN PROGRESS — YELLOW. Build 26 on TestFlight, critical fixes shipped, invite flow untested with partner.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| TestFlight Build 26 | Operations | DONE | Submitted with all bug fixes from user testing |
| Invite flow validation | Product | PENDING | Adam needs to test with partner |
| Feature #5 — AI Coach | Engineering | DONE | Fully live |
| Dev mode → production Firebase | Engineering | DONE | No longer routes to emulators |
| Encryption disabled | Engineering | DONE | Pending key exchange design |
| Stale coupleId fix | Engineering | DONE | Auto-clears deleted couples |
| Silent error handling fix | Engineering | DONE | Alerts shown for wishlist, date night, explore |
| Snapshot listener leak fix | Engineering | DONE | Properly tracked and cleaned up |
| Set up Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| Push notifications | Engineering | TODO | Needed for partner engagement |
| Encryption key exchange | Engineering | TODO | Required before re-enabling encryption |
| Update App Store metadata | Operations | TODO (LOW) | App Store Connect (Adam) |
| Feature #4 — Relationship Courses | All | Backlog | Content strategy |

## What Shipped (March 22 bug fix sprint — 4 commits)
- Dev mode connects to production Firebase (was routing to localhost emulators)
- Stale coupleId auto-clearing in invite and accept flows
- Invite flow routes unauthenticated users to sign-up first
- Encryption disabled (key mismatch between partners)
- Nested snapshot listener leak fixed in useTodayPrompt
- Silent failures replaced with error alerts (wishlist, date night, explore)
- Notification toggles load saved values from Firestore
- Version number from expo-constants
- Invite code/shareUrl restored on app restart
- Build 26 submitted to TestFlight

## Key Metrics
- Test suites: 25/25 passing (144 tests) — clean exits
- Function tests: 1/1 passing (112 tests)
- TypeScript errors: 0 across all 3 codebases
- Cloud Functions: 34 deployed on Node 22
- Working tree: CLEAN (1 modified: STUDIO-STATUS.md)
- Production build: 26 (on TestFlight)

## Engineering Health
- **Tests**: All green, clean exits
- **Types**: 0 errors across src/, functions/, admin/
- **Design system**: Unified — #c97454 accent, #fef7f4 background
- **Tech debt**: Encryption needs key exchange. Otherwise clean.

## Critical Path
The #1 priority is validating the invite flow with a real partner. Until two users are linked, the core loop (prompt → respond → see partner's response) cannot be tested. Every feature (wishlist, date night, explore, memories, coaching) requires coupleId.

## User Testing Feedback (March 22)
From Adam's testing session — bugs filed and fixed:
1. ~~Today prompt not loading~~ FIXED (emulator routing)
2. ~~Wishlist add button inactive~~ FIXED (silent error)
3. ~~Date night not saving~~ FIXED (silent error)
4. ~~Explore respond buttons not working~~ FIXED (silent error)
5. Conversation starter timer — needs removal or activation
6. Memories add notes/photos — needs premium check clarity
7. Insights not actionable enough — product feedback for future sprint
8. Push notifications needed — TODO

## Known Bugs
- Conversation starter timer is dead code (durationMinutes never passed)
- Memories photo add silently fails for non-premium users (paywall UX unclear)

## Compliance Status (Feature #5)
- Privacy policy AI disclosure: DONE
- Non-clinical disclaimer: DONE
- Data retention policy: DONE
- Privacy-preserving architecture: CONFIRMED (encryption temporarily disabled)
- Terms of Service: MISSING

## Roadmap
#6 Check-ins (DONE) → Figma Redesign (DONE) → Home Screen (DONE) → #5 AI Coach (DONE) → #7 Photo Album (DONE) → Prompt Reactions (DONE) → **#4 Courses (Next)**

## Adam Actions (Prioritized)
| Priority | Item | Time |
|----------|------|------|
| NOW | Test invite flow with partner on Build 26 | 10 min |
| THIS WEEK | Set up GCP error alerting | 15 min |
| BEFORE LAUNCH | Push notifications setup | Engineering |
| BEFORE LAUNCH | Encryption key exchange | Engineering |
| BEFORE LAUNCH | Terms of Service | Decision |
| LOW | App Store metadata (Closer → Stoke) | 10 min |

## Next Sprint Options
1. **Push notifications** — Required for partner engagement loop
2. **Encryption key exchange** — Required before public launch
3. **expo-updates** — OTA bug fixes without App Store review
4. **Feature #4 — Courses** — Next on roadmap, needs content strategy
5. **Insights improvements** — More actionable, proactive suggestions
