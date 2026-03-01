# Stoke Studio Status
*Last updated: 2026-03-01 — Date Night Planner complete*

## Current Sprint
- **Focus**: Date Night Planner (Feature #3)
- **Sprint goal**: Design, plan, and build the Date Night Planner
- **Status**: COMPLETE — all 3 phases built

## Active Initiatives
| Initiative | Department | Status | Owner Agent | Blockers |
|-----------|-----------|--------|-------------|----------|
| Date Night Planner — cross-dept scoping | All | DONE | CEO | — |
| Date Night Planner — design doc | Product + Design | DONE | sprint-prioritizer | — |
| Date Night Planner — Phase 1 (data + UI) | Engineering | DONE | frontend-developer | — |
| Date Night Planner — Phase 2 (completion + calendar) | Engineering | DONE | frontend-developer | — |
| Date Night Planner — Phase 3 (reminders + tests + i18n) | Engineering | DONE | frontend-developer | — |
| Deploy Date Night Planner | Operations | Ready | infrastructure-maintainer | None |
| Sentry crash reporting | Operations | Queued | infrastructure-maintainer | None |

## Key Metrics
- Test suites: 22/22 passing (117 tests)
- TypeScript errors (src/): 0
- Analytics events: 53 tracked (7 new date night events)
- Date night ideas: 48 curated across 6 categories
- i18n keys: ~220 (30 new for date nights)

## Date Night Planner — Build Summary
**Phase 1a (data layer)**: Types, 48 static date ideas config, CRUD hooks (useDateNights), 7 analytics events, Firestore security rules
**Phase 1b (UI)**: Data-driven DateNightCard on Today screen, AddDateNightModal (pageSheet), date-nights.tsx hub screen (hidden tab), navigation wiring
**Phase 2 (completion + calendar)**: CompleteDateNightModal with reflection, addDateNightEvent() calendar sync, notification routing for date_night/date_night_reminder types
**Phase 3 (reminders + tests + i18n)**: dateNightReminder Cloud Function (daily 9AM PT, today/tomorrow alerts), 13 unit tests for config/helpers, 30 i18n keys

## Files Created/Modified
- `src/types/index.ts` — DateNight, DateNightCategory, DateNightIdea types
- `src/config/dateNightIdeas.ts` — 48 ideas, 6 categories, helper functions
- `src/hooks/useDateNights.ts` — 5 hooks (list, add, update, complete, archive)
- `src/components/DateNightCard.tsx` — rewritten, data-driven (empty/upcoming/past-due)
- `src/components/AddDateNightModal.tsx` — pageSheet modal with date/time pickers
- `src/components/CompleteDateNightModal.tsx` — reflection modal (rating + note)
- `app/(app)/date-nights.tsx` — hub screen (upcoming, saved, ideas, past)
- `app/(app)/_layout.tsx` — added hidden tab
- `src/services/analytics.ts` — 7 new events
- `src/services/calendar.ts` — addDateNightEvent()
- `src/services/notifications.ts` — date_night routing
- `src/i18n/locales/en.json` — 30 new keys
- `firestore.rules` — date_nights subcollection rules
- `functions/src/index.ts` — dateNightReminder scheduled function
- `src/__tests__/dateNights.test.ts` — 13 tests

## Decisions Made This Session
1. Date Night Planner scoped across Product, Engineering, and Design
2. V1 scope: static idea library + shared queue + scheduling + calendar + reflection
3. Out of scope: AI-generated ideas, location-aware, booking integrations, photo album
4. Navigation: hidden tab (like Wishlist), entry via Today card
5. Data model: couples/{coupleId}/date_nights/{dateNightId} subcollection
6. Phasing: Phase 1 (core CRUD + UI), Phase 2 (completion/reflection), Phase 3 (reminders/tests)

## Blockers & Risks
- MODERATE: No crash reporting in production (Sentry queued)
- RISK: Date/time picker UX differs between iOS/Android — needs testing
- RISK: Content quality — 48 ideas must feel curated, not generic
- RISK: Both-partner engagement — if only one partner uses it, it becomes a chore list

## Next Actions
1. Deploy updated Firestore rules + dateNightReminder Cloud Function to production
2. QA test on device (iOS + Android): add idea, schedule, complete, calendar sync
3. Begin Feature #4 planning (Relationship Courses) or Sentry integration
