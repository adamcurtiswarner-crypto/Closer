---
name: stoke-analytics
description: Add, modify, or review analytics events, metrics, and tracking for the Stoke app. Use for instrumenting new events, WMEER calculations, retention queries, or dashboard metrics.
argument-hint: [analytics task description]
---

You are working on analytics for **Stoke**, a relationship app tracking couple engagement.

## Analytics Implementation

- **Client**: `logEvent(name, properties)` from `src/services/analytics.ts`
- **Server**: `logServerEvent(name, userId, properties)` in Cloud Functions
- **Storage**: Firestore `/events/{eventId}` collection (90-day retention, export to BigQuery)

## Base Event Schema

```typescript
interface BaseEvent {
  event_name: string;
  timestamp: string;           // ISO 8601
  user_id: string;
  couple_id: string | null;
  session_id: string;
  platform: 'ios' | 'android';
  app_version: string;
  properties: Record<string, any>;
}
```

## Existing Events (25 total)

### Core Prompt Flow (6)
| Event | Trigger |
|-------|---------|
| `prompt_viewed` | User sees today's prompt card |
| `prompt_started` | User taps "Respond" |
| `prompt_response_submitted` | User submits response |
| `partner_notified` | Push sent to partner |
| `prompt_completed` | Both partners responded |
| `emotional_response_submitted` | User submits feedback |

### Lifecycle (4)
| Event | Trigger |
|-------|---------|
| `onboarding_completed` | User finishes onboarding |
| `couple_linked` | Partner accepts invite |
| `session_started` | App opened |
| `notification_opened` | Push notification tapped |

### Features (11)
| Event | Trigger |
|-------|---------|
| `recap_viewed` | User views weekly recap |
| `memory_saved` | User saves memory |
| `churn_risk_flagged` | Automated churn detection |
| `goal_created` | New goal added |
| `goal_completed` | Goal checkbox toggled |
| `goal_archived` | Goal archived |
| `weekly_challenge_activated` | Challenge accepted |
| `weekly_challenge_completed` | All challenge goals done |
| `profile_photo_uploaded` | Photo uploaded |
| `profile_updated` | Name/settings changed |
| `insights_viewed` | Insights tab opened |

### Content (4)
| Event | Trigger |
|-------|---------|
| `anniversary_date_set` | Date picker used |
| `love_language_set` | Language selected |
| `wishlist_item_added` | New wishlist item |
| `wishlist_item_completed` | Item checked off |
| `wishlist_item_deleted` | Item removed |
| `wishlist_viewed` | Wishlist screen opened |

## North Star: WMEER

**Weekly Meaningful Engagement and Emotional Response**

```
WMEER = (Couples with ≥3 completions AND ≥1 positive response) / Active Couples × 100
```

Where Active Couples = couples with ≥1 `prompt_completed` event in the week.

## Supporting Metrics

| Metric | Definition |
|--------|------------|
| Weekly Active Couples | ≥1 completion in 7 days |
| Prompt Completion Rate | Both partners respond / assigned |
| D1 Retention | Return day after signup |
| D7 Retention | Return 7 days after signup |
| W4/W12 Retention | Active in week 4/12 |
| Positive Response Rate | % positive emotional feedback |

## Prompt Kill Rules

| Completion Rate | Action (after 4 weeks in testing) |
|----------------|-----------------------------------|
| <30% | Auto-retire |
| 30-50% | Flag for rewrite |
| 50-75% | Keep testing |
| >75% | Graduate to active |

## Conventions

- Event names: `snake_case`
- Properties: include `assignment_id`, `prompt_id`, `prompt_type` where relevant
- Always include timing properties (`seconds_to_respond`, `hours_since_delivery`)
- Churn risk levels: `low` (3-4 missed), `medium` (5-6), `high` (7+)

Work on: $ARGUMENTS
