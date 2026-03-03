# Stoke Studio Status
*Last updated: 2026-03-02 — Social Auth (Google + Apple) implementation complete*

## Current Sprint
- **Focus**: Social Auth + Deploy Date Night Planner + Sentry Integration + Codebase Cleanup
- **Sprint goal**: Ship Feature #3 to production, establish crash reporting, add social sign-in, prepare for Feature #6
- **Status**: COMPLETE — all tasks done

## Active Initiatives
| Initiative | Department | Status | Owner Agent | Blockers |
|-----------|-----------|--------|-------------|----------|
| Deploy Date Night Planner (rules + function) | Operations | DONE | infrastructure-maintainer | — |
| Sentry crash reporting integration | Operations + Engineering | DONE | frontend-developer | — |
| Codebase cleanup (package name, firebase.json) | Engineering | DONE | frontend-developer | — |
| Decompose today.tsx (1351→852 lines) | Engineering | DONE | frontend-developer | — |
| Social Auth (Google + Apple Sign-In) | Engineering | DONE (code) | frontend-developer | Firebase Console: enable providers |
| Feature #6 — Weekly Check-ins | All | Queued | — | Social auth |
| Feature #5 — AI Relationship Coach | Engineering | Backlog | ai-engineer | Feature #6 |
| Feature #7 — Shared Photo Album | Engineering | Backlog | — | Feature #5 |
| Feature #4 — Relationship Courses | All | Backlog | — | Content strategy |

## Key Metrics
- Test suites: 22/22 passing (117 tests), runtime 9.3s
- TypeScript errors (src/): 0
- Analytics events: 53 tracked
- Components: 25+ in barrel export
- Hooks: 30+ custom hooks
- Cloud Functions: 30 exported
- i18n keys: ~220

## Roadmap Resequence Decision (2026-03-02)

**Old order**: #4 Courses → #5 AI Coach → #6 Check-ins → #7 Photo Album
**New order**: #6 Check-ins → #5 AI Coach → #7 Photo Album → #4 Courses

**Rationale**: All three department heads independently converged on this:
- Feature #6 (Check-ins) is 80% scaffolded — hooks, components, config already exist. Effort: S-M.
- Feature #4 (Courses) has zero scaffolding, requires content authoring, and is the largest build. Effort: L.
- Check-ins address the #1 retention risk (partner dormancy breaking the shared loop).
- Check-in data feeds directly into AI Coach insights, creating a natural pipeline.
- Courses require a content strategy that is currently undefined — pushing it later allows content production to happen in parallel with engineering on other features.

## Engineering Health
- **Tests**: All green (22/117)
- **Types**: Clean in src/ (admin/ has pre-existing isolated issues)
- **Tech debt (low severity)**:
  - `today.tsx` reduced from 1,351→852 lines (5 components extracted)
  - `ProfileCard.tsx` at 700 lines — decomposition candidate but not urgent
  - `useCouple.ts` at 439 lines — overloaded but stable
  - 21 `as any` casts in src/ — modest, none in hot paths
- **Feature #6 scaffolding already exists**: `useCheckIn.ts`, `CheckInCard`, `checkInQuestions.ts` (15 questions, 3 dimensions), `usePulseScore.ts`

## Operational Concerns
- **MODERATE**: No `expo-updates` — any client bug fix requires full EAS build + App Store review (24-48h)
- **MODERATE**: Social auth requires Firebase Console setup (enable Apple + Google providers) + EAS build for native modules
- **LOW**: Sentry integrated but needs DSN configured in `.env` + Sentry project created
- **LOW**: Node 20 EOL April 2026 — plan Node 22 upgrade within 6 weeks
- **LOW**: Anthropic model ID hardcoded in functions/src/index.ts (not configurable)

## Decisions Made This Session
1. **Roadmap resequenced**: #6 → #5 → #7 → #4 (unanimous across Product, Engineering, Operations)
2. **Sentry before new features**: Crash reporting integrated before social auth
3. **Cleanup sprint**: Package rename, today.tsx decomposition, firebase.json storage emulator
4. **Deploy Date Night first**: Rules + function deployed to production
5. **Social auth added**: Google + Apple Sign-In alongside existing email/password

## Next Actions (Prioritized)
1. **Firebase Console setup** — Enable Apple and Google sign-in providers in Firebase Console (manual)
2. **Create Sentry project** — Get DSN from sentry.io and add to `.env`
3. **EAS preview build** — Required to test social auth (native modules) on real device
4. **QA social auth** — Test Google + Apple + email flows on iOS device
5. **Begin Feature #6 (Weekly Check-ins)** — write `triggerWeeklyCheckIn` Cloud Function, connect existing scaffolding, build pulse score computation
6. **QA Date Night on device** — add idea, schedule, complete, calendar sync, push notification
