# Feature #5 — AI Relationship Coach: Coaching Screen Design

**Date**: 2026-03-06
**Status**: Approved
**Gate**: Figma redesign merged (done)

## Overview

A dedicated coaching surface at `/(app)/coaching` that gives premium users a persistent home for their weekly AI-generated relationship insights, with pulse score context and action tracking.

## Screen Layout (top to bottom)

### 1. Header
- Screen title: "Coaching"
- Pulse tier pill badge beside title: "Thriving" / "Steady" / "Cooling" / "Needs attention"
- Pill color-coded: Thriving `#22c55e`, Steady `#ef5323`, Cooling `#f59e0b`, Needs attention `#ef4444`
- Tap pill to reveal tooltip with numeric score: "Your pulse score: 72"

### 2. Current Insight Card (prominent)
- Same card style as existing CoachingCard: borderRadius 20, shadow, 3px `#ef5323` accent bar
- Full coaching insight text (2-3 sentences)
- Action button with icon + label (goal / date_night / conversation / revisit / check_in)
- **Acted-on state**: button transforms to checkmark icon + "You did this on [day]" in `#a8a29e` muted text
- **Dismissed state**: card shows in muted/collapsed state

### 3. Past Insights Section
- Section header: "Past insights"
- Compact list: each row ~60px height with divider lines
  - Week date (e.g., "Feb 24") on left
  - One-line truncation of insight text in middle
  - Status icon on right: checkmark (acted), x (dismissed), dash (ignored)
- Tap to expand: reveals full insight text, action suggested, and outcome
- Ordered most recent first
- Paginated: load 10 at a time, "Load more" at bottom

### 4. Disclaimer Footer
- Fixed at bottom of scroll area (not screen-fixed)
- Small muted text (`#a8a29e`, 11px): "Stoke offers reflections, not therapy. For professional support, consult a licensed counselor."

## Access Points

- **From Today tab**: CoachingCard gains a "View coaching" link that navigates to `/(app)/coaching`
- **Premium gate**: screen checks subscription status, shows Paywall if not premium

## Data Layer

### New Hook: `useCoachingHistory`
- Fetches `/couples/{coupleId}/coaching_insights` ordered by `created_at` DESC
- Paginated: 10 per page
- Returns `{ insights, isLoading, fetchNextPage, hasNextPage }`
- Reuses existing Firestore collection (no schema changes)

### Existing Hooks (reused)
- `useCoachingInsight` — latest insight with `dismissInsight` and `markActedOn` mutations
- `useCouple` — provides `current_pulse_score` and `current_pulse_tier` from couple doc
- `useSubscription` — premium gate check

### No New Firestore Collections
All data already exists in `coaching_insights` subcollection and couple doc fields.

## Action Confirmation UX

1. User taps action button on current insight
2. `markActedOn` mutation fires (sets `acted_on` timestamp)
3. User routed to relevant screen (existing routing logic from today.tsx)
4. On return to coaching screen, card reflects "done" state
5. No animation, no toast — quiet state change

## Analytics

### New Events
- `coaching_screen_viewed` — properties: `pulse_tier`
- `coaching_action_confirmed` — properties: `action_type`, `pulse_tier`
- `pulse_score_viewed` — properties: `score`, `tier` (fires on pill tap)

### Enriched Events
- `coaching_insight_acted` — add `pulse_score` and `week_id` properties

## Visual Design

- Typography: Alexandria-SemiBold for headers, Inter for body
- Card style: borderRadius 20, shadow (0.06 opacity, radius 12), 3px `#ef5323` accent bar
- Animations: FadeIn on screen entry (400ms), FadeInUp on current insight card (500ms, 100ms delay)
- Past insight rows: Inter-Medium for dates, Inter-Regular for text, status icons from Icon component
- Disclaimer: Inter-Regular 11px `#a8a29e`

## Out of Scope

- Conversational chat with AI
- Per-dimension coaching breakdowns
- User-initiated "ask the coach" queries
- Push notifications with pulse scores
- Trend sparkline (future enhancement using pulse_scores collection)
