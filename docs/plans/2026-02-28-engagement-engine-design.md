# Engagement Engine: Adaptive Algo + AI Coaching

**Date:** 2026-02-28
**Approach:** Cloud Function Pipeline (weekly batch)
**Inspiration:** Paired's best patterns + AI-powered differentiation

## Problem

Stoke has solid architecture and warm UX, but engagement is passive. Prompts are delivered without adaptation, insights are display-only, and there's no mechanism to detect when a couple is struggling and intervene. The app observes but doesn't act.

## Goals

1. Adopt Paired's 5 proven engagement patterns (locked answers, shared premium, 5-min framing, partner notifications, stage collection)
2. Build an adaptive algo that reads couple signals and adjusts engagement strategy weekly
3. Use Claude API to generate personalized coaching insights with actionable suggestions
4. Close the guidance loop — every insight leads to a concrete action, every action feeds back into the algo

---

## 1. Locked-Answer Mechanic

**Frontend-only change.** The data model already tracks `response_count` and `status` on assignments.

**New behavior:**
- Partner A submits → sees a sealed card: "Your answer is saved. Waiting for [partner name]..." with lock icon
- Partner B submits → BOTH responses reveal simultaneously with staggered FadeInUp animation
- `today.tsx` "waiting" mode: hide response text, show locked state
- `today.tsx` "complete" mode: reveal animation — cards start blurred/hidden and unblur together
- `CompletionMoment`: staggered reveal (your response first, partner's 200ms later)

**Files:** `app/(app)/today.tsx`, `src/components/CompletionMoment.tsx`

---

## 2. Partner-Answered Notification + "5 Minutes a Day" Framing

**Smarter notification copy:**
- First responder triggers: "[Partner] answered today's prompt. Your turn — it takes 2 minutes."
- Completion triggers: "[Partner] answered too. Tap to reveal both responses."

**"5 minutes a day" copy sweep:**
- Onboarding: new value prop screen — "Stay connected in just 5 minutes a day"
- Today screen empty state: "Today's 5-minute connection"
- Push notifications: always reference brevity
- App Store description update

**Files:** `functions/src/index.ts` (onResponseSubmitted notification templates), `app/(app)/today.tsx`, new onboarding screen

---

## 3. Relationship Stage Collection

**Collect now, personalize later.**

- New field: `users/{userId}.relationship_stage` — `'dating' | 'engaged' | 'married' | 'long_distance' | null`
- New onboarding screen after tone calibration: card selection with icons (Heart/Star/Handshake/MapPin)
- Existing users: one-time prompt on Today screen, dismisses permanently after selection
- Stored on user doc (not couple doc — partners may perceive differently)
- No content personalization yet — the adaptive algo will consume this in future iterations

**Files:** New onboarding screen, `app/(app)/today.tsx` (existing user prompt), Firestore user doc schema

---

## 4. Shared Premium (RevenueCat)

**Couple-level entitlement:**
- RevenueCat SDK (`react-native-purchases`) — already has a mock in the project
- Entitlement: `"premium"`
- On purchase: Cloud Function writes `premium_until` + `premium_source` (purchaser's user ID) to couple doc
- Access check: `useSubscription` hook reads couple doc's `premium_until`. If `> now`, both partners have Premium.

**Subscription tiers** (RevenueCat dashboard):
- Monthly: $9.99/mo
- Annual: $49.99/yr (7-day free trial)

**Cloud Function `onSubscriptionEvent`:**
- RevenueCat webhook listener
- On purchase/renewal: update couple doc `premium_until`
- On cancellation: let lapse naturally

**Paywall placement:**
- After onboarding completion
- Gate before AI coaching insights
- Free users keep: daily prompts, streaks, basic insights

**Premium-gated features:**
- AI coaching insights + actionable suggestions
- Periodic check-ins
- Extended insights (emotional journey trends, communication analytics)
- Future: guided journeys, expert content, question packs

**Files:** `src/hooks/useSubscription.ts` (extend), `src/components/Paywall.tsx` (update), new Cloud Function `onSubscriptionEvent`, couple doc schema update

---

## 5. Periodic Check-Ins

**Private 3-question pulse survey, every 2 weeks per partner.**

**3 dimensions, rotating from a bank of ~15 questions:**
1. **Connection** — "How connected have you felt to [partner] this past week?" (1-5)
2. **Communication** — "How easy has it been to talk openly?" (1-5)
3. **Satisfaction** — "How are you feeling about your relationship right now?" (1-5)

**Privacy:** Check-in scores are NEVER shown to the partner. Only the algo consumes them.

**Data model:**
- Collection: `couples/{coupleId}/check_ins/{checkInId}`
- Fields: `user_id`, `responses: [{question_id, dimension, score}]`, `created_at`

**Delivery:**
- Scheduled Cloud Function `deliverCheckIn` (weekly, Sundays)
- Sets `pending_check_in` flag on user doc if 14+ days since last check-in
- Today screen shows check-in card when flag is set
- Dismissable, re-surfaces next day if skipped
- Completing clears the flag

**Files:** New Cloud Function `deliverCheckIn`, new check-in UI component, `app/(app)/today.tsx`, new hook `useCheckIn`

---

## 6. Adaptive Engagement Algo

**Weekly Cloud Function `computeRelationshipPulse` — runs Monday 3AM PT.**

### Signal Inputs

| Signal | Source | Weight |
|--------|--------|--------|
| Emotion feedback | `prompt_responses.emotional_response` | High |
| Check-in scores | `check_ins` subcollection | High |
| Response length trend | `prompt_responses.response_length` | Medium |
| Time-to-respond | `prompt_responses.time_to_respond_seconds` | Low |
| Skipped days | Assignment-completion gaps | Medium |
| One-sided engagement | One partner responds, other doesn't | High |
| Talked-about-it rate | `prompt_completions.talked_about_it` | Medium |

### Pulse Score (0-100)

| Range | Tier | Meaning |
|-------|------|---------|
| 80-100 | Thriving | Engaged, positive, consistent |
| 60-79 | Steady | Healthy but room for growth |
| 40-59 | Cooling | Declining engagement or rising negativity |
| 0-39 | Needs attention | Significant disengagement or distress |

**Storage:** `couples/{coupleId}/pulse_scores/{weekId}` — score, breakdown, contributing factors

### Prompt Selection Adaptation

Pulse score replaces crude tone-calibration weighting in `selectPromptForCouple`:

- **Thriving**: Standard mix, includes deeper/challenging prompts
- **Steady**: Lean toward appreciation and connection
- **Cooling**: Shift to warmth — fun, nostalgia, gratitude. Avoid conflict.
- **Needs attention**: Exclusively gentle, low-pressure. Add optional "skip today" affordance.

---

## 7. AI Coaching (Claude API)

**Triggered by `computeRelationshipPulse` when score < 80 OR drops 15+ points week-over-week.**

### Claude API Prompt (server-side)

```
You are a warm, non-judgmental relationship coach. Based on this
couple's engagement data from the past week, write a brief (2-3
sentence) personalized insight and one specific, actionable suggestion.

Data:
- Pulse score: {score} (was {lastWeekScore})
- Emotion trend: {positiveCount} warm, {neutralCount} okay, {negativeCount} hard
- Avg response length: {avgLength} words (was {lastWeekLength})
- Days active: {daysActive}/7
- Check-in scores: connection {x}/5, communication {y}/5, satisfaction {z}/5
- One-sided days: {count} (partner A responded but B didn't)
- Last week's suggestion: {action} — {actedOn ? 'completed' : 'not taken'}

Tone: Warm, quiet, direct. No exclamation points. No emojis.
Never blame either partner. Focus on the relationship, not individuals.
```

### Output

Coaching card with:
- `insight_text` — the observation (2-3 sentences)
- `action_type` — one of: `goal`, `date_night`, `conversation`, `revisit`, `check_in`
- `action_text` — the specific suggestion

### Storage

`couples/{coupleId}/coaching_insights/{weekId}`:
- `pulse_score`, `insight_text`, `action_type`, `action_text`, `action_data`
- `created_at`, `dismissed_at`, `acted_on`

### Premium gate

AI coaching is Premium-only. Free users see pulse tier on insights but not personalized coaching.

---

## 8. Actionable Guidance Loop

**Every insight leads to a concrete action. Every action feeds back.**

### Action Resolution

| Action Type | On Tap | Completion Signal |
|-------------|--------|-------------------|
| `goal` | Pre-fills AddGoalModal with suggested text | Goal marked complete |
| `date_night` | Opens DateNightCard with suggestion | Date night completed |
| `conversation` | Queues specific prompt for tomorrow | Both partners respond |
| `revisit` | Opens referenced memory artifact | Viewed (`acted_on` timestamp) |
| `check_in` | Triggers early check-in | Check-in completed |

### Follow-up Continuity

Next week's Claude prompt includes whether last week's action was taken:
- Acted on: "Last week we suggested phone-free dinners. You both responded more warmly — that connection is showing."
- Not taken: "The conversation starter didn't get picked up. No pressure — here's something lighter."

### Insights Screen Enhancements

- New "Relationship Pulse" section at top — current tier + 4-week trend line
- Pulse history: expandable weekly scores over time
- Coaching history: scrollable past insights with status (acted on / dismissed / pending)
- Progress narrative: "Your pulse improved 12 points this month" (computed from trend, no AI)

### Notifications

- Monday morning: "Your weekly relationship insight is ready"
- Cooling/Needs attention: "We put together something for you two this week"

### Privacy

- Coaching insights visible to BOTH partners
- Never reveals individual check-in scores
- Language: "we noticed" / "your relationship" / "you two" — never attributes blame

---

## New Firestore Collections

```
couples/{coupleId}/check_ins/{checkInId}
couples/{coupleId}/pulse_scores/{weekId}
couples/{coupleId}/coaching_insights/{weekId}
```

## New/Modified Cloud Functions

- `computeRelationshipPulse` (scheduled, Monday 3AM PT)
- `deliverCheckIn` (scheduled, Sunday)
- `onSubscriptionEvent` (RevenueCat webhook)
- Modified: `selectPromptForCouple` (pulse-based weighting)
- Modified: `onResponseSubmitted` (smarter notification copy)

## New/Modified Hooks

- `useSubscription` (extend for couple-level Premium)
- `useCheckIn` (new)
- `usePulseScore` (new)
- `useCoachingInsight` (new)

## New Components

- `CoachingCard` — Today screen card for AI insights
- `CheckInCard` — Today screen card for periodic check-ins
- `PulseIndicator` — Insights screen pulse tier + trend
- `LockedResponseCard` — Sealed response in waiting mode
- Onboarding: `RelationshipStageScreen`, `ValuePropScreen`

## Out of Scope

- Content personalization by relationship stage (collect data now, use later)
- Real-time alert triggers (start with weekly batch, add later if needed)
- Guided journeys / expert content (future Premium content)
- Partner-specific coaching (always couple-level, never individual)
