# Stoke Studio Status
*Last updated: 2026-03-06 — CEO review: sprint health assessment + merge strategy*

## Current Sprint
- **Focus**: Figma redesign (merge-ready) + stabilization cleanup
- **Sprint goal**: Merge both feature branches, close stabilization items, prepare for Feature #5
- **Status**: IN PROGRESS — YELLOW (accumulating integration risk)

## Active Initiatives
| Initiative | Department | Status | Owner Agent | Blockers |
|-----------|-----------|--------|-------------|----------|
| Figma redesign (14/16 tasks done) | Engineering/Design | MERGE-READY | frontend-developer | Illustration assets deferred |
| Commit + merge coaching-quick-wins | Engineering | IMMEDIATE | — | — |
| Rotate hardcoded model ID to config | Engineering | TODO (HIGH) | backend-architect | — |
| Node 22 upgrade | Engineering | TODO (target March 30) | devops-automator | — |
| Deploy `cleanupCoachingInsights` function | Operations | READY TO DEPLOY | — | `firebase deploy` (Adam) |
| EAS preview build | Operations | BLOCKED | mobile-app-builder | Device registration (Adam) |
| Create Sentry project + DSN | Operations | BLOCKED (CRITICAL) | devops-automator | sentry.io account (Adam) |
| Enable social auth in Firebase Console | Operations | BLOCKED | infrastructure-maintainer | Firebase Console (Adam) |
| Set up Cloud Functions error alerting | Operations | TODO | — | GCP Console (Adam) |
| QA: Social Auth flows | Testing | BLOCKED | — | EAS build + Firebase Console |
| QA: Weekly Check-ins (Feature #6) | Testing | BLOCKED | — | EAS build |
| QA: Date Night Planner | Testing | BLOCKED | — | EAS build |
| QA: Figma Redesign visual pass | Testing | BLOCKED | — | EAS build |
| Update App Store metadata (Closer to Stoke) | Operations | TODO (LOW) | support-responder | App Store Connect (Adam) |
| Feature #5 — AI Relationship Coach | All | NEXT (after redesign merge) | ai-engineer | Redesign merge |
| Feature #7 — Shared Photo Album | Engineering | Backlog | — | Feature #5 |
| Feature #4 — Relationship Courses | All | Backlog | — | Content strategy |

## Branch Situation (CRITICAL — Action Needed)
- `main`: Last commit `a4b7ff3` (2026-03-04)
- `feat/coaching-quick-wins`: 8 commits + 12 uncommitted files. Same merge base as main.
- `feat/figma-redesign`: 14 commits (81 files, +2,141/-437 lines). Same merge base as main.
- **Risk**: 22 combined commits sitting unmerged for 2 days. Uncommitted work is unprotected.

### Merge Strategy (Decided)
1. Commit uncommitted work on `feat/coaching-quick-wins` (IMMEDIATE)
2. Merge `feat/coaching-quick-wins` into main (PR — smaller, lower-conflict)
3. Rebase `feat/figma-redesign` onto updated main (conflicts in ~6 overlapping files, straightforward)
4. Merge `feat/figma-redesign` into main (PR — larger, visual-only, overwrites old colors)

## Figma Redesign Progress (14/16 Tasks)
- Tasks 1-9, 11-13, 15: DONE (fonts, colors, typography, all screens, components, global sweep)
- Task 10 (Welcome screen full rebuild): PARTIAL — logo updated but no purple hero/illustrations
- Task 14 (Illustration assets): DEFERRED — no assets exported from Figma
- Task 16 (Visual QA): BLOCKED on EAS preview build
- Old accent `#c97454` fully removed from figma-redesign branch
- New palette: `#ef5323` (bright orange), `#490f5f` (deep purple), Alexandria + Inter fonts

## Completed This Session (2026-03-06)
- Comprehensive studio health assessment across Engineering, Operations, PM
- Merge strategy decided for two divergent feature branches
- Node 22 migration timeline set (target: March 30, deadline: April 30)
- Analytics event count corrected: 61 (was 53 in prior status)
- Identified compliance gaps: Terms of Service needed before Feature #5, App Store privacy URL stale

## Previously Completed (2026-03-04)
- Privacy policy rebranded: Closer to Stoke, updated contact email to privacy@getstoke.io
- AI-Assisted Features section added to privacy policy (Feature #5 compliance)
- `cleanupCoachingInsights` Cloud Function written (90-day TTL, daily 3:30 AM PT)
- Coaching analytics, conversation fix, tone calibration shipped (merged in `feat/coaching-quick-wins`)

## Key Metrics
- Test suites: 22/22 passing on each branch (worktree cross-contamination causes phantom failures — fix: add `.worktrees/` to testPathIgnorePatterns)
- TypeScript errors (src/): 0
- Analytics events: 61 tracked (corrected from 53)
- Components: 25+ in barrel export
- Hooks: 30+ custom hooks
- Cloud Functions: 31 exported
- i18n keys: ~234

## Feature #5 Readiness Assessment

### What's Already Built
- `computeRelationshipPulse` (Mon 3AM PT) generates weekly coaching insights via Claude
- `CoachingCard` + `EngagementCards` render insights on Today tab (premium-gated)
- `useCoachingInsight` hook fetches, dismisses, and tracks action
- Pulse score computation uses check-in data, prompt completion, emotional signals
- Premium gate enforced both server-side and client-side
- Coaching analytics events: viewed, acted, dismissed (all 3 instrumented)
- Tone calibration integrated into `buildCoachingPrompt`
- `ConversationStarterModal` handles conversation action type
- Privacy policy AI disclosure (done)
- `cleanupCoachingInsights` 90-day TTL function (written, needs deploy)

### What Needs Building (MVP)
- Dedicated coaching surface (`/coaching` route) with pulse score context and insight history
- "I did this" action confirmation UX (visible feedback when user acts)
- Non-clinical disclaimer in coaching UI (Apple 5.1.1)
- Add `pulse_score` + `week_id` to `coaching_insight_acted` event
- New analytics events: `coaching_screen_viewed`, `coaching_action_confirmed`, `pulse_score_viewed`

### What's OUT of MVP
- Conversational chat interface with the AI
- Per-dimension coaching (separate insights per relationship dimension)
- User-initiated "ask the coach" queries
- Push notifications surfacing pulse score numbers

### Competitive Advantage
Stoke has behavioral data grounding that no competitor has. Lasting has no data, Paired has no data, Relish had data but burned it on human labor costs (shut down 2022). Stoke's coaching is grounded in observed couple behavior — not self-reported questionnaires.

## Operational Concerns (Updated 2026-03-06)
- **CRITICAL**: Sentry DSN not configured — zero crash visibility in production
- **CRITICAL**: Uncommitted work on active branch — unprotected code
- **HIGH**: Hardcoded model ID `claude-sonnet-4-5-20250929` — silent failure risk if Anthropic deprecates
- **HIGH**: Two feature branches unmerged for 2 days — integration risk growing
- **MODERATE**: No `expo-updates` — bug fixes require full EAS build + App Store review
- **MODERATE**: No Cloud Functions error alerting — silent failures possible
- **MODERATE**: Social auth requires Firebase Console setup + EAS build
- **MODERATE**: Node 20 EOL April 30, 2026 — 55 days away (migration target: March 30)
- **LOW**: App Store metadata still says "Closer"
- **LOW**: App Store privacy URL points to dead `closer.app` domain
- **LOW**: No Terms of Service document (recommended before Feature #5)
- **LOW**: `functions/` package still named `closer-functions`

## Known Bugs
- Defensive gap: if `actionText` is empty on a coaching insight, the conversation modal opens with blank content. Guard recommended.

## Engineering Health
- **Tests**: All green (22/22 per branch, 117 tests on figma-redesign, 142+ on coaching-quick-wins)
- **Types**: Clean in src/
- **Active work**: Branch merges needed, then Feature #5
- **Tech debt**:
  - `functions/src/index.ts` — 3,128 lines. Decomposition into modules recommended before Feature #5.
  - `ProfileCard.tsx` — 700 lines, decomposition candidate
  - 21 `as any` casts — modest, 2 in src/, rest in functions/
  - Worktree test contamination — add `.worktrees/` to `testPathIgnorePatterns`

## Compliance Status (Feature #5)
- Privacy policy AI disclosure: DONE
- Non-clinical disclaimer in coaching UI: TODO (engineering task)
- Data retention policy: DONE (90-day TTL, disclosed in privacy policy, enforced by function)
- Privacy-preserving architecture: CONFIRMED (only anonymized metrics sent to Anthropic)
- Terms of Service: MISSING (recommended before shipping AI features)

## Roadmap
**Execution order**: #6 Check-ins (DONE) -> Figma Redesign (MERGE-READY) -> #5 AI Coach (NEXT) -> #7 Photo Album -> #4 Courses

## Critical Path to Feature #5
1. Commit + merge `feat/coaching-quick-wins` to main (TODAY)
2. Rebase + merge `feat/figma-redesign` to main (TODAY/TOMORROW)
3. Rotate model ID to configurable value (THIS WEEK)
4. Feature #5 design doc (coaching screen UX, pulse trend, disclaimer)
5. Feature #5 implementation sprint (~1 week)
6. Feature #5 QA + deploy

## Adam Actions (Prioritized)
| Priority | Item | Time | Impact |
|----------|------|------|--------|
| TODAY | Create Sentry project + set DSN as EAS secret | 10 min | Unblocks crash visibility |
| TODAY | `firebase deploy --only functions:cleanupCoachingInsights` | 2 min | Compliance with stated retention policy |
| THIS WEEK | Register devices + trigger EAS preview build | 15 min | Unblocks QA for 4 features |
| THIS WEEK | Enable Apple/Google auth in Firebase Console | 20 min | Unblocks social auth testing |
| THIS WEEK | Set up Cloud Functions error alerting in GCP Console | 15 min | Prevents silent failures |
| THIS MONTH | Update App Store metadata (Closer to Stoke) | 30 min | Brand consistency |
| BEFORE APR 30 | Node 22 migration deploy | 30 min | Runtime EOL compliance |

## Decisions Made This Session (2026-03-06)
1. **Merge order decided**: coaching-quick-wins first, then figma-redesign. Rationale: smaller merge first reduces conflict surface; figma-redesign cleanly overwrites old colors.
2. **Figma redesign declared merge-ready**: 14/16 tasks complete. Remaining illustration assets and visual QA deferred to follow-up. Color migration (the Feature #5 gate) is 100% done.
3. **Node 22 target date**: March 30 deploy, giving 30-day buffer before April 30 EOL.
4. **Analytics count corrected**: 61 events (was reporting 53).
5. **New compliance gaps identified**: TOS needed before Feature #5, App Store privacy URL is dead link.
6. **Worktree test fix identified**: One-line addition to jest.config.js resolves phantom failures.

## Next Actions (Prioritized)
1. **IMMEDIATE**: Commit uncommitted work on `feat/coaching-quick-wins`
2. **TODAY**: Open PR for coaching-quick-wins to main, merge
3. **TODAY**: Rebase figma-redesign onto main, open PR, merge
4. **TODAY**: Add `.worktrees/` to testPathIgnorePatterns in jest.config.js
5. **THIS WEEK**: Rotate model ID to env var / Remote Config
6. **THIS WEEK**: Adam actions (Sentry, deploy, EAS build, social auth, alerting)
7. **NEXT SPRINT**: Feature #5 design doc + implementation
