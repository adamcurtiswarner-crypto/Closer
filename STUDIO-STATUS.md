# Stoke Studio Status
*Last updated: 2026-03-19 — CEO review: 11-day sprint assessment*

## Current Sprint
- **Focus**: Ship accumulated features to TestFlight, complete Feature #5, address operational gaps
- **Sprint goal**: Get Build 23+ to users with Photo Album, Reactions, expanded content, and coaching polish
- **Status**: IN PROGRESS — YELLOW (massive feature delivery, but TestFlight still unconfirmed shipped)

## Active Initiatives
| Initiative | Department | Status | Blockers |
|-----------|-----------|--------|----------|
| TestFlight Build 23+ | Operations | UNKNOWN | Was blocked on provisioning profile — needs Adam confirmation if shipped |
| Feature #5 — AI Coach screen | Engineering | DONE (~99%) | `generateCoachingInsight` callable built, disclaimer strengthened, actionText guard added. Missing: deploy to Firebase |
| Feature #7 — Shared Photo Album | Engineering | DONE | Photos grid, milestones timeline, photo upload, analytics — all shipped |
| Prompt Reactions + Depth Progression | Engineering | DONE | useReaction hook, ReactionRow component, notifications, cloud functions |
| Prompt library expansion (162 prompts) | Product | DONE | Expanded from 60 to 162 via seed scripts |
| Conversation starters (70 total) | Product | DONE | Expanded from 20 to 70 — content runway extended |
| Storage security rules tightened | Operations | DONE | Shipped in commit ba1250b |
| Accept-invite error handling | Engineering | IN PROGRESS | Uncommitted — improved error messages for edge cases |
| Deploy `cleanupCoachingInsights` | Operations | UNKNOWN | Was ready to deploy — needs Adam confirmation |
| Set up Cloud Functions error alerting | Operations | TODO | GCP Console (Adam) |
| Node 22 upgrade | Engineering | TODO (target March 30) | 41 days to EOL |
| Update App Store metadata (Closer to Stoke) | Operations | TODO (LOW) | App Store Connect (Adam) |
| Feature #4 — Relationship Courses | All | Backlog | Content strategy |

## What Shipped Since Last Review (2026-03-08)
**16 commits landed on main. Feature-heavy sprint.**

### Features
- **Shared Photo Album (Feature #7)** — Photos grid tab + Milestones timeline on Memories screen. AddMilestoneModal, PhotoGrid, PhotoViewer, MilestoneTimeline components. useAddPhoto, useMilestones, usePhotoGrid hooks. Photo upload cloud functions + storage rules. Analytics events wired.
- **Prompt Reactions + Depth Progression** — useReaction hook, ReactionRow component. Reaction notifications and depth progression cloud functions. Wired into CompletionMoment and Today screen.
- **Coaching screen polish** — Empty state handling, analytics events, all-couples insights view.

### Content
- **Prompt library**: 60 to 162 prompts (2.7x expansion)
- **Conversation starters**: 20 to 70 (3.5x expansion) — content runway ~10 weeks at daily usage

### Bug Fixes / Security
- **Storage rules tightened** — Scoped per-user paths (was: any authenticated user could read/write all)
- **Photo upload Hermes fix** — expo-file-system base64 approach (confirmed working)

## Resolved Since Last Review
| Previous Status | Resolution |
|----------------|------------|
| HIGH: Storage rules too permissive | RESOLVED — Rules tightened to per-user scope |
| HIGH: Conversation starters too few (20) | RESOLVED — Expanded to 70 (~10 weeks runway) |
| Content depth risk: prompts would feel repetitive | MITIGATED — Library at 162 prompts |
| Feature #7 in backlog | RESOLVED — Fully built and shipped |
| Coaching screen incomplete (~40%) | RESOLVED — Polished to ~95% |

## Key Metrics
- Test suites: 25/25 passing (147 tests)
- TypeScript errors (src/): 0
- Components: 34+ in barrel export (was 28)
- Hooks: 37+ custom hooks (was 33)
- Cloud Functions: 32 exported (was 31)
- Conversation starters: 70 (was 20)
- Seed prompts: 162 (was 60)
- Production build: 22 (status of Build 23 unknown)

## Engineering Health
- **Tests**: All green (25 suites, 147 tests). Jest worker force-exit warning persists (low priority)
- **Types**: Clean in src/
- **Working tree**: 1 modified file uncommitted (accept-invite.tsx — improved error handling)
- **Tech debt**:
  - `functions/src/index.ts` — 3,284 lines (grew from 3,128). Decomposition increasingly urgent.
  - 4 stale local branches: `feat/coaching-quick-wins`, `feat/figma-redesign`, `feature/explore-prompts`, `feature/games`
  - Jest teardown leak still present

## Operational Concerns (Updated 2026-03-19)
- **CRITICAL**: TestFlight Build 23 status unknown — 11 days since flagged as blocked. Production users may still be on Build 22 with photo upload bug.
- **MEDIUM**: `cleanupCoachingInsights` deployment status unknown — was flagged as ready to deploy 11 days ago
- **MEDIUM**: No Cloud Functions error alerting — silent failures possible
- **MODERATE**: No `expo-updates` — bug fixes require full EAS build + App Store review
- **MODERATE**: Node 20 EOL April 30, 2026 — 41 days away (migration target: March 30)
- **LOW**: App Store metadata still says "Closer"
- **LOW**: No Terms of Service document (recommended before Feature #5 ships to public)

## Known Bugs
- ~~Defensive gap: if `actionText` is empty on a coaching insight, the conversation modal opens with blank content~~ FIXED — fallback text added
- Photo upload failure on Hermes (fixed in main — unknown if shipped to users)
- Uncommitted: accept-invite error handling improvements (hardcoded strings, should use i18n)

## Product Risks
- **Feature #5 backend built, not deployed**: `generateCoachingInsight` callable function exists. Needs Firebase deployment.
- **No rollback path**: Only Build 22 confirmed in the wild.
- **Terms of Service**: Still missing. Recommended before AI coaching ships publicly.

## Compliance Status (Feature #5)
- Privacy policy AI disclosure: DONE
- Non-clinical disclaimer in coaching UI: DONE (strengthened 2026-03-19)
- Data retention policy: DONE (90-day TTL)
- Privacy-preserving architecture: CONFIRMED
- Terms of Service: MISSING

## Roadmap
**Execution order**: #6 Check-ins (DONE) -> Figma Redesign (DONE) -> Home Screen (DONE) -> #5 AI Coach (95%) -> #7 Photo Album (DONE) -> Prompt Reactions (DONE) -> #4 Courses (Backlog)

## Adam Actions (Prioritized)
| Priority | Item | Time | Impact |
|----------|------|------|--------|
| NOW | Confirm: Did Build 23 ship to TestFlight? Are users off Build 22? | 2 min | Resolves biggest operational unknown |
| NOW | Confirm: Was `cleanupCoachingInsights` deployed? | 1 min | Compliance with retention policy |
| THIS WEEK | Commit accept-invite.tsx changes (or discard) | 5 min | Clean working tree |
| THIS WEEK | Set up Cloud Functions error alerting in GCP Console | 15 min | Prevents silent failures |
| THIS WEEK | Decide: Ship Feature #5 coaching backend or defer? | Decision | Unblocks roadmap |
| THIS MONTH | Update App Store metadata (Closer to Stoke) | 30 min | Brand consistency |
| BEFORE APR 30 | Node 22 migration deploy | 30 min | Runtime EOL compliance |

## Decisions Made This Session (2026-03-19)
1. **Feature #7 shipped ahead of schedule**: Photo Album was backlogged behind Feature #5 but was built and merged. Good velocity, but Feature #5 backend still incomplete.
2. **Content runway extended significantly**: 3.5x conversation starters, 2.7x prompt library. Daily users won't hit repetition for ~10 weeks.
3. **Prompt Reactions added**: New engagement mechanic not in original roadmap. Partners can react to each other's responses.
4. **Storage rules tightened**: Previously flagged security concern resolved.

## Next Actions (Prioritized)
1. **NOW**: Adam answers status questions (Build 23, cleanupCoachingInsights deployment)
2. **THIS WEEK**: Finish Feature #5 — coaching insight generation cloud function + non-clinical disclaimer
3. **THIS WEEK**: Commit or discard accept-invite.tsx changes
4. **THIS WEEK**: Clean up 4 stale local branches
5. **THIS WEEK**: Set up GCP error alerting
6. **NEXT SPRINT**: Node 22 migration, Terms of Service, Feature #4 planning
