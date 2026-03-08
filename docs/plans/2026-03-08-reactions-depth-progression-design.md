# Prompt Reactions + Depth Progression — Design Doc

**Goal:** Two improvements to the daily prompt experience: (1) let partners react to each other's responses with emotional reactions, creating a second touchpoint with push notification, and (2) intelligently ramp prompt depth from surface to deep based on each couple's engagement per prompt type.

**Approach:** Reactions stored on completion docs, depth progress tracked on couple doc. Both feed into existing prompt selection and completion flows with minimal new infrastructure.

---

## Feature A: Reactions

### Flow

1. Both partners respond — CompletionMoment shows
2. Below partner's response, a row of 4 reaction icons appears (muted/outline style)
3. User taps one — it fills/animates, haptic feedback, reaction saved
4. Tapping the same one again removes it (toggle). Tapping a different one switches.
5. One reaction per person per completion
6. Partner gets push notification: "[Name] reacted to your response" — tapping opens completion
7. Partner views the completion and sees the reaction icon below their response card

### Reaction Set (4)

- Heart — love/appreciation
- Fire — excited/impressed
- Laughing — humor/joy
- Teary-eyed — moved/vulnerable

### Data Model

Add to `prompt_completions` doc:

```
reactions: {
  [userId]: 'heart' | 'fire' | 'laughing' | 'teary' | null
}
```

No new collection needed.

### Notification

- Firestore trigger on completion doc change detects reaction field update
- Sends push to partner: "[Name] reacted to your response"
- No notification if partner has already reacted (avoids ping-pong)
- Deep-links to Today tab

### Analytics

- `prompt_reaction_added` with `{ reaction, prompt_type }`

---

## Feature B: Depth Progression

### How It Works

Each couple has a depth level per prompt type (6 types tracked independently). The selection algorithm filters prompts to the couple's current depth level for the chosen type.

### Progression Thresholds

- Start at `surface` for all 6 types
- Unlock `medium`: 3 completions at surface in that type
- Unlock `deep`: 3 completions at medium in that type AND couple is past week 4

### Time Floor

No deep prompts before week 4, regardless of completions. No floor on medium.

### Data Model

Add to `couples/{coupleId}` doc:

```
depth_progress: {
  [promptType]: {
    level: 'surface' | 'medium' | 'deep',
    surface_completions: number,
    medium_completions: number
  }
}
```

Initialized on first prompt delivery with all 6 types at `{ level: 'surface', surface_completions: 0, medium_completions: 0 }`.

### Selection Behavior

In `selectPromptForCouple`, after filtering by recency and pulse weights, also filter by `emotional_depth <= couple's current level for that type`. If no prompts match at the target depth, fall back to any available depth at or below.

### Advancement

After each completion, `onResponseSubmitted` trigger:
1. Looks up the prompt's type and depth
2. Increments the appropriate counter on the couple's `depth_progress`
3. If threshold met, bumps the level

### No Regression

Couples don't drop back. Once unlocked, it stays unlocked.

### Silent Progression

No push notification on depth unlock. Prompts just naturally get richer.

---

## New Files

- `src/hooks/useReaction.ts` — submit/remove reaction mutation
- `src/components/ReactionRow.tsx` — 4-icon row with toggle behavior

## Modified Files

- `src/components/CompletionMoment.tsx` — render ReactionRow below partner's response
- `functions/src/index.ts` — depth tracking in `onResponseSubmitted`, reaction notification trigger, depth filter in `selectPromptForCouple`
- `src/services/analytics.ts` — `prompt_reaction_added` event
- `src/hooks/usePrompt.ts` — expose reaction data from completion

## Not Changed

- Response flow, encryption, offline queue
- Prompt content or seed data
- Explore mode
- Weekly recap
- Feedback mechanism (`emotional_response` stays separate — it rates the prompt, reactions rate the partner's answer)

## Premium Gating

- None. Both features are free — they improve core engagement for all users.
