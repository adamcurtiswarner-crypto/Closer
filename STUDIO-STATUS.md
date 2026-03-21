# Stoke Studio Status
*Last updated: 2026-03-21 — CEO review: design polish sprint*

## Current Sprint
- **Focus**: Ship accumulated features, resolve operational gaps, harden infrastructure
- **Sprint goal**: Get Build 24 to TestFlight, deploy all backend, eliminate tech debt
- **Status**: COMPLETE — GREEN. Build 24 on TestFlight, all functions deployed, codebase clean.

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| TestFlight Build 24 | Operations | DONE | Submitted to App Store Connect, awaiting Apple processing |
| Feature #5 — AI Coach | Engineering | DONE (99%) | All code shipped + deployed. Missing: Anthropic API key config |
| Feature #7 — Shared Photo Album | Engineering | DONE | Fully shipped |
| Prompt Reactions + Depth Progression | Engineering | DONE | Fully shipped |
| Photo upload bug fix | Engineering | DONE (code) | Storage rules need manual deploy in Firebase Console |
| functions/src/index.ts decomposition | Engineering | DONE | 3,521 lines → 8 modules, all deployed |
| Node 22 migration | Engineering | DONE | All 34 functions on Node 22, deployed |
| Admin dashboard TS errors | Engineering | DONE | Root tsconfig exclusion fix |
| Stale branch cleanup | Engineering | DONE | All 4 deleted |
| Jest teardown leak | Engineering | DONE | QueryClient cleanup + global fake timers |
| Sandbox seeded to production | Operations | DONE | ~830 documents, test account ready |
| Set up Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| Deploy storage rules | Operations | TODO | Firebase Console (Adam) |
| Set Anthropic API key | Operations | TODO | Firebase config (Adam) |
| Update App Store metadata (Closer to Stoke) | Operations | TODO (LOW) | App Store Connect (Adam) |
| Feature #4 — Relationship Courses | All | Backlog | Content strategy |

## What Shipped (March 19-20 sprint — 11 commits)

### Features
- **generateCoachingInsight callable** — On-demand coaching insight generation for Premium users. Deduplicates by week, uses existing pulse score, falls back to full computation.
- **Coaching UI hardened** — actionText fallback guard (3 locations), "Generate your first insight" button, requestInsight mutation.
- **Non-clinical disclaimer strengthened** — Explicit non-clinical, non-therapeutic language.

### Infrastructure
- **Node 22 migration** — All 34 functions migrated from Node 20, deployed.
- **functions/src/index.ts decomposed** — 3,521-line monolith → 8 domain modules (shared, prompts, notifications, analytics, coaching, users, triggers, admin) + 7-line barrel. All deployed.

### Bug Fixes
- **Photo upload fix** — Profile and partner photo uploads failing due to Firebase Storage rule wildcard mismatch. Moved to directory-based paths.
- **Admin TS errors** — 359 phantom errors from root tsconfig including admin/ with wrong path aliases. One-line fix.
- **Jest teardown leak** — QueryClient not destroyed + timer leaks. Force-exit warning eliminated.

### Operations
- **Build 24 to TestFlight** — Production build submitted to App Store Connect.
- **Sandbox seeded to production** — 12 weeks of test data for TestFlight testing.
- **4 stale branches deleted** — feat/coaching-quick-wins, feat/figma-redesign, feature/explore-prompts, feature/games.

## Key Metrics
- Test suites: 25/25 passing (147 tests) — no warnings
- Function tests: 1/1 passing (112 tests)
- TypeScript errors: 0 across all 3 codebases (src/, functions/, admin/)
- Cloud Functions: 34 deployed on Node 22
- Function modules: 8 (was 1 monolith)
- Stale branches: 0 (was 4)
- Working tree: CLEAN
- Production build: 24 (submitted to TestFlight)
- Conversation starters: 70
- Seed prompts: 162

## Engineering Health
- **Tests**: All green. No force-exit warning. Clean exits.
- **Types**: 0 errors across src/, functions/, admin/
- **Working tree**: Clean
- **Tech debt**: functions/src/index.ts decomposition COMPLETE. No major debt remaining.
- **Node runtime**: 22 (EOL concern eliminated)

## Operational Concerns (Updated 2026-03-20)
- **HIGH**: Anthropic API key not configured — Feature #5 coaching generates no insights without it
- **HIGH**: Storage rules not deployed — photo uploads (profile + partner) broken in production
- **MEDIUM**: No Cloud Functions error alerting — silent failures possible
- **MODERATE**: No `expo-updates` — bug fixes require full EAS build + App Store review
- **LOW**: App Store metadata still says "Closer"
- **LOW**: No Terms of Service document

## Known Bugs
- ~~actionText empty on coaching insight~~ FIXED
- ~~Photo upload failure (profile + partner)~~ FIXED in code, awaiting storage rules deploy
- ~~Jest force-exit warning~~ FIXED

## Product Risks
- **Feature #5 inactive without API key**: All code deployed, but no insights generated without Anthropic API key.
- **Photo uploads broken in production**: Code fix pushed, but Firebase Storage rules need manual deploy in Console.
- **Terms of Service**: Still missing. Recommended before AI coaching ships publicly.

## Compliance Status (Feature #5)
- Privacy policy AI disclosure: DONE
- Non-clinical disclaimer in coaching UI: DONE (strengthened 2026-03-19)
- Data retention policy: DONE (90-day TTL, cleanupCoachingInsights deployed)
- Privacy-preserving architecture: CONFIRMED
- Terms of Service: MISSING

## Roadmap
**Execution order**: #6 Check-ins (DONE) → Figma Redesign (DONE) → Home Screen (DONE) → #5 AI Coach (99%) → #7 Photo Album (DONE) → Prompt Reactions (DONE) → #4 Courses (Backlog)

## Adam Actions (Prioritized)
| Priority | Item | Time | Impact |
|----------|------|------|--------|
| NOW | Deploy storage rules in Firebase Console | 2 min | Unblocks photo uploads |
| NOW | Set Anthropic API key: `firebase functions:config:set anthropic.api_key="KEY" --project stoke-5f762` | 2 min | Activates Feature #5 |
| THIS WEEK | Set up Cloud Functions error alerting in GCP Console | 15 min | Prevents silent failures |
| THIS WEEK | Cut Build 25 with photo upload fix | 20 min | Gets fix to users |
| BEFORE LAUNCH | Draft Terms of Service | Decision | Legal requirement for AI Coach |
| THIS MONTH | Update App Store metadata (Closer → Stoke) | 10 min | Brand consistency |

## Decisions Made This Sprint (2026-03-19/20)
1. **functions/src/index.ts decomposed**: 3,521-line monolith split into 8 domain modules. Eliminates deployment blast radius.
2. **Node 22 migration completed early**: Was targeted for March 30, done March 19. EOL concern eliminated.
3. **Photo upload paths restructured**: Moved from flat naming with underscores to directory-based paths for clean Firebase Storage rule matching.
4. **Build 24 shipped to TestFlight**: First build with Photo Album, Reactions, coaching generation, 162 prompts.
5. **Sandbox seeded to production**: Enables end-to-end TestFlight testing with realistic data.

## Next Actions (Prioritized)
1. **NOW**: Adam deploys storage rules + sets API key (4 min total)
2. **THIS WEEK**: Cut Build 25 with photo upload fix
3. **THIS WEEK**: Set up GCP error alerting
4. **NEXT SPRINT**: Terms of Service, Feature #4 planning, expo-updates integration
