---
name: stoke-api
description: Build or modify Cloud Functions, Firestore queries, security rules, or API endpoints for the Stoke app backend.
argument-hint: [endpoint or function description]
---

You are working on the backend for **Stoke**, a Firebase-backed relationship app.

## Backend Location

- Cloud Functions: `functions/` directory (Node.js 20, TypeScript)
- Firestore rules: `firestore.rules` (project root)
- Firestore indexes: `firestore.indexes.json`
- Firebase config: `firebase.json`
- Type definitions: `../specs/types.ts` (canonical source of truth)

## Firestore Collections

```
/users/{userId}                    — User account and preferences
/couples/{coupleId}                — Relationship unit (2 member_ids)
/couple_invites/{inviteCode}       — 6-char invite codes (7-day TTL)
/prompts/{promptId}                — Master prompt library
/prompt_assignments/{assignmentId} — Daily prompt → couple mapping
/prompt_responses/{responseId}     — Individual user responses
/prompt_completions/{completionId} — Both partners responded
/memory_artifacts/{artifactId}     — Saved memories timeline
/events/{eventId}                  — Analytics events (90-day retention)
/experiments/{experimentId}        — Feature flags and A/B tests
/subscriptions/{subscriptionId}    — RevenueCat subscription data
/couples/{coupleId}/goals/{goalId} — Goal tracker items
/couples/{coupleId}/goals/{goalId}/completions/ — Goal completion records
/couples/{coupleId}/wishlist_items/{itemId}     — Shared wishlist
```

## API Conventions

- **Auth**: Bearer token (Firebase ID token) in Authorization header
- **Errors**: `{ error: { code: "SNAKE_CASE", message: "Human readable.", status: 404 } }`
- **Field naming**: snake_case in Firestore, camelCase in TypeScript app types
- **Timestamps**: Firebase `serverTimestamp()` for created_at/updated_at
- **Denormalization**: Prompt text denormalized into assignments, display names into memories

## Key Endpoints (existing)

- `POST /auth/register` — Create user doc (also via Auth onCreate trigger)
- `POST /auth/complete-onboarding` — Set preferences, mark onboarded
- `POST /couples/invite` / `POST /couples/accept-invite` — Partner linking
- `GET /prompts/today` — Today's assignment + responses
- `POST /prompts/respond` — Submit response (triggers completion detection)
- `POST /prompts/{id}/feedback` — Emotional feedback
- `GET /recap/weekly` — Weekly recap data
- `POST /memories` / `GET /memories` — Memory artifacts
- `GET /admin/metrics/wmeer` — WMEER dashboard metrics

## Scheduled Functions

- **Prompt delivery**: Every 15 minutes, matches notification_time by timezone
- **Weekly recap**: Sunday 6 PM per timezone
- **Metrics aggregation**: Daily 3 AM UTC
- **Invite cleanup**: Daily 4 AM UTC

## Prompt Selection Algorithm

1. Filter by status = 'active'
2. Exclude prompts assigned in last 30 days
3. Apply week_restriction (early weeks = surface only)
4. Apply max_per_week limits (conflict ≤ 1/week)
5. Weight by emotional_depth based on tone_calibration
6. Random selection from weighted pool

## Security Rules Pattern

- Users read/write own document only
- Couples: members can read, only Cloud Functions write
- Responses: user creates own, reads if in same couple
- Helper: `isCoupleMember(coupleId)` checks `member_ids` array

## WMEER (North Star Metric)

Percentage of active couples who complete ≥3 prompts/week AND report ≥1 positive emotional response.

Work on: $ARGUMENTS
