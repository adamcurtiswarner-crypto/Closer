# Date Night Planner — Design Document

*Date: 2026-03-01*
*Status: Approved*
*Feature #3 on the Stoke Roadmap*

## Overview

A shared planning tool that helps couples move from "we should do something" to actually doing it. Curated date ideas, shared queue, scheduling with calendar sync, and post-date reflection.

## User Story

As a couple using Stoke, we want a low-friction way to discover, save, and plan date nights together, so we actually follow through on spending intentional time together.

## Architecture

- New Firestore subcollection: `couples/{coupleId}/date_nights/{dateNightId}`
- Static idea library: `src/config/dateNightIdeas.ts` (~50 ideas, 6 categories)
- Hidden tab screen: `app/(app)/date-nights.tsx`
- Data-driven Today card replacing the static DateNightCard
- React Query hooks following the Wishlist CRUD pattern
- Calendar integration via existing `src/services/calendar.ts`
- Push notification for partner when a date is scheduled

## Data Model

### Firestore Document (snake_case)

```
couples/{coupleId}/date_nights/{dateNightId}
  title: string
  description: string
  category: string          // 'at_home' | 'out_about' | 'adventure' | 'creative' | 'food_drink' | 'free_budget' | 'custom'
  cost_tier: string         // 'free' | '$' | '$$' | '$$$'
  duration_minutes: number | null
  source: string            // 'library' | 'custom'
  source_id: string | null  // static config ID if from library
  status: string            // 'saved' | 'scheduled' | 'completed' | 'skipped'
  added_by: string          // userId
  scheduled_date: Timestamp | null
  scheduled_time: string | null  // "19:00" format
  completed_at: Timestamp | null
  reflection_rating: string | null  // 'warm' | 'okay' | 'not_great'
  reflection_note: string | null
  is_archived: boolean
  created_at: Timestamp
  updated_at: Timestamp
```

### App Type (camelCase)

```typescript
export interface DateNight {
  id: string;
  title: string;
  description: string;
  category: DateNightCategory;
  costTier: 'free' | '$' | '$$' | '$$$';
  durationMinutes: number | null;
  source: 'library' | 'custom';
  sourceId: string | null;
  status: 'saved' | 'scheduled' | 'completed' | 'skipped';
  addedBy: string;
  scheduledDate: Date | null;
  scheduledTime: string | null;
  completedAt: Date | null;
  reflectionRating: 'warm' | 'okay' | 'not_great' | null;
  reflectionNote: string | null;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type DateNightCategory =
  | 'at_home' | 'out_about' | 'adventure'
  | 'creative' | 'food_drink' | 'free_budget' | 'custom';
```

## Navigation

- **Entry point**: DateNightCard on Today screen (data-driven, replaces static card)
- **Full screen**: `/(app)/date-nights` as hidden tab (`href: null` in `_layout.tsx`)
- **Modals**: AddDateNightModal (pageSheet), CompleteDateNightModal (pageSheet)

## Screen Flow

### 1. DateNightCard on Today (rewritten)
- **Empty state**: Warm icon, "Plan something together", "Browse ideas" link
- **Upcoming**: Next scheduled date night with title + date, "See all" link
- **Past-due**: "How was [title]?" nudge if scheduled date has passed

### 2. Date Nights Hub (hidden tab screen)
- Header: back arrow, "Date Nights" title
- Section: Upcoming (scheduled, sorted by date)
- Section: Ideas (browsable, filterable by category chips)
- Section: Past (completed, collapsible)
- FAB or header button: "Add" to create custom idea

### 3. AddDateNightModal (pageSheet)
- Title field (pre-filled from idea or free text)
- Category pill selector
- Optional date picker
- Optional time picker
- Optional notes
- "Save" (to queue) or "Plan it" (with date) button

### 4. CompleteDateNightModal (pageSheet)
- "How was it?" header
- Three-option rating: warm / okay / not great
- Optional one-line note
- "Done" button

## Static Idea Library

~50 ideas across 6 categories in `src/config/dateNightIdeas.ts`:

- **At Home**: "Cook a meal from a country neither of you has visited", "Build a blanket fort and watch your first-date movie"
- **Out & About**: "Take a walk with no destination", "Find a coffee shop neither of you has been to"
- **Adventure**: "Drive somewhere new within 30 minutes of home", "Try a sport neither of you has played"
- **Creative**: "Draw portraits of each other", "Write letters to your future selves"
- **Food & Drink**: "Pick a cuisine neither of you has tried", "Cook the same recipe separately and compare"
- **Free/Budget**: "Stargazing with a blanket", "Sunrise walk"

Each idea: `id`, `title`, `description`, `category`, `costTier`, `durationMinutes`.

## Brand Voice

- Card header: "Date Nights" (not "Date Night Planner")
- Empty state: "Plan something together" (not "Time for a date night!")
- Confirmation: "Planned. [Partner] will see it too."
- Completion prompt: "How was it?"
- No exclamation points. No emojis. Phosphor icons only.
- Stay within warm palette: `#c97454`, `#8b7355`, `#fef7f4`. No per-category colors.

## Two-Partner Dynamic

- Either partner can save, schedule, or complete a date night
- Plans are shared immediately via Firestore
- Partner gets push notification when a date is scheduled
- No voting/approval flow — one partner plans, both see it
- No negotiation UI — the app captures the decision, not the deliberation

## Integration Points

| Feature | Integration |
|---------|------------|
| Today screen | Rewritten DateNightCard shows upcoming/empty/past-due state |
| Calendar sync | `addDateNightEvent()` in `calendar.ts` |
| Notifications | Partner notification on schedule, day-of reminder |
| CoachingCard | `date_night` action type opens the planner |
| Analytics | 6 new events: viewed, saved, scheduled, completed, reflected, skipped |

## Firestore Security Rules

```
match /couples/{coupleId}/date_nights/{dateNightId} {
  allow read: if isCoupleMember(coupleId);
  allow create: if isCoupleMember(coupleId);
  allow update: if isCoupleMember(coupleId);
  allow delete: if false;
}
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Adoption | 30% of active couples save an idea in first 2 weeks |
| Scheduling rate | 50% of saved dates get scheduled |
| Completion rate | 60% of scheduled dates marked complete |
| Reflection rate | 40% of completed dates include a rating |
| Retention impact | 10% improvement in D30 for planner users |

## Out of Scope (v1)

- AI-generated personalized ideas
- Location-aware suggestions
- Reservation/booking integrations
- Photo album per date (deferred to Feature #7)
- Recurring date nights
- Budget tracking beyond cost tier tags

## Phasing

- **Phase 1**: Types, config, hooks, Today card, hub screen, add modal, Firestore rules, analytics
- **Phase 2**: Completion modal, calendar sync, notification routing
- **Phase 3**: Cloud Function reminder, tests, i18n keys
