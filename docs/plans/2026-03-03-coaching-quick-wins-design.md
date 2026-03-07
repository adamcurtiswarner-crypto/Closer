# Coaching Quick Wins Design

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Three targeted improvements to the existing coaching infrastructure

---

## Quick Win 1: Coaching Analytics Events

### Problem
Zero coaching events exist in the analytics system. `CoachingCard`, `EngagementCards`, and `useCoachingInsight` fire no events. There is no way to measure coaching feature engagement.

### Solution
Add 3 events to `AnalyticsEvent` type and fire them from existing components.

| Event | Fired from | Properties |
|-------|-----------|------------|
| `coaching_insight_viewed` | `EngagementCards` via `useEffect` | `pulse_tier`, `action_type` |
| `coaching_insight_acted` | `handleCoachingAction` in `today.tsx` | `pulse_tier`, `action_type` |
| `coaching_insight_dismissed` | dismiss handler in `today.tsx` | `pulse_tier` |

Impression dedup: track viewed insight ID in a `useRef` to fire `coaching_insight_viewed` once per insight per session.

### Files
- `src/services/analytics.ts` — add 3 event names to union type
- `src/components/EngagementCards.tsx` — add viewed event with useEffect
- `app/(app)/today.tsx` — add acted + dismissed events in handlers

---

## Quick Win 2: Conversation Starter Modal

### Problem
The `conversation` action type in `handleCoachingAction` (today.tsx) is an empty `break` statement. The button renders with "Start a conversation" label, user taps it, insight is marked as acted-on in Firestore, but nothing happens in the UI.

### Solution
New `ConversationStarterModal` component that displays the coaching insight's `actionText` as a conversation starter prompt.

### Component: ConversationStarterModal
- `pageSheet` modal (consistent with `AddGoalModal` pattern)
- Displays heading: "Start a conversation"
- The coaching `actionText` shown prominently as the starter
- "Copy to clipboard" button with haptic feedback
- "Go to chat" text link navigating to `/(app)/chat`
- Warm tint background (`#fef7f4`), rounded card, accent bar

### Wiring in today.tsx
- New state: `showConversationModal` (boolean) + `conversationStarterText` (string)
- `conversation` case in `handleCoachingAction` sets both and opens the modal
- No new AI call — the `actionText` IS the conversation starter

### Files
- `src/components/ConversationStarterModal.tsx` — new component
- `src/components/index.ts` — barrel export
- `app/(app)/today.tsx` — state, modal rendering, action handler wiring

---

## Quick Win 3: Tone Calibration in Coaching Prompt

### Problem
`buildCoachingPrompt` in `functions/src/index.ts` does not use `tone_calibration` from user docs. The coaching AI has no awareness of whether the couple self-identified as solid, distant, or struggling during onboarding.

### Solution
Pass `tone_calibration` into `buildCoachingPrompt` and adjust the prompt's tone instruction.

### Tone variations

| Calibration | Tone instruction |
|------------|-----------------|
| `solid` | Current default: "Warm, quiet, direct." |
| `distant` | "This couple has acknowledged feeling distant. Be gently encouraging. Emphasize small reconnection moments. Frame suggestions as easy first steps." |
| `struggling` | "This couple has acknowledged struggling to connect. Be especially gentle and validating. Acknowledge that showing up matters. Suggest the smallest possible action — lower the bar, not raise it." |

### Implementation
1. `computePulseForCouple` already fetches member docs for tone data. Extract `tone_calibration` values.
2. Use existing `getEffectiveTone` function to resolve mixed calibrations.
3. Add `toneCalibration` parameter to `buildCoachingPrompt`.
4. Append tone-specific instruction to the Claude prompt.

### Files
- `functions/src/index.ts` — modify `buildCoachingPrompt` signature + prompt text, modify `computePulseForCouple` to pass tone
