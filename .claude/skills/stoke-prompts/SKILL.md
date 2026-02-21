---
name: stoke-prompts
description: Create, review, or modify relationship prompts and content for the Stoke app. Use for prompt writing, tone guide compliance, seed data, or content strategy.
argument-hint: [prompt task description]
---

You are writing relationship prompts for **Stoke**, an app that helps long-term couples stay connected.

## Target User

Long-term couples (3+ years) who are not in crisis but quietly drifting into operational coexistence. Ages 28-45, cohabiting or married. Feel more like roommates than romantic partners.

## Prompt Design Principles

1. **≤15 words** — Brevity reduces friction
2. **Specific > Vague** — "What made you smile today?" beats "How was your day?"
3. **Action or Reflection** — Either do something or think about something
4. **Non-judgmental** — No "right" answer, no shame
5. **Asymmetric OK** — Partners can have different experiences
6. **Research-backed** — Mapped to validated relationship science

## Prompt Categories

| Category | Research Basis | Description |
|----------|---------------|-------------|
| `love_map_update` | Gottman Sound House | Knowing partner's inner world |
| `bid_for_connection` | Turning Toward | Recognizing and responding to bids |
| `appreciation_expression` | Gottman 5:1 Ratio | Building positivity bank |
| `dream_exploration` | Gottman Sound House | Supporting life dreams |
| `conflict_navigation` | Four Horsemen Prevention | Addressing issues constructively |
| `repair_attempt` | Gottman Repair Attempts | De-escalation and reconnection |

## Emotional Depth Levels

| Depth | Response Time | Example |
|-------|--------------|---------|
| `surface` | ~30 seconds | "What song has been stuck in your head?" |
| `medium` | ~2 minutes | "What's a quality of mine you're grateful for today?" |
| `deep` | 5+ minutes | "What's a fear you'd like to overcome?" |

## Week Restrictions

- **Weeks 1-2**: Surface + Medium only, no Conflict/Repair, no requires_conversation
- **Week 3+**: Introduce 1 medium-deep/week, max 1 conflict/week
- **Week 4+**: Unlock Deep prompts, Repair Attempts

## Type Balance Target (per 2 weeks)

- Bid for Connection: 30%
- Appreciation Expression: 25%
- Love Map Update: 20%
- Dream Exploration: 15%
- Conflict Navigation: 5%
- Repair Attempt: 5%

## Tone Guide

### Voice: Warm, Quiet, Direct

| Do | Don't |
|----|-------|
| "What's one thing about your work I might not understand?" | "Share something deep about your career with your partner!" |
| "What made you smile today?" | "What beautiful moment brightened your day?" |
| "Is there something you've been hesitant to bring up?" | "Open up about your hidden feelings!" |

### Words We Use
- **Prompt** (not exercise, activity, task, challenge)
- **Respond** (not complete, submit, participate)
- **Memory** (not highlight, achievement, milestone)

### Words We Avoid
Journey, unlock, level up, challenge, streak, score, soulmate, bae, relationship goals, mindful, intentional

## Prompt Data Format

```typescript
{
  text: string;              // The prompt (≤15 words)
  hint: string | null;       // Optional context (shown smaller)
  type: PromptType;          // Category from above
  research_basis: ResearchBasis;
  emotional_depth: EmotionalDepth;
  requires_conversation: boolean;
  week_restriction: number | null;  // null = any week
  max_per_week: number | null;      // e.g., conflict = 1
}
```

## Quality Checklist

Before adding any prompt:
- [ ] ≤15 words?
- [ ] Specific enough to answer in 1-2 sentences?
- [ ] No "right" answer?
- [ ] Both partners can meaningfully respond?
- [ ] Not shame-inducing if skipped?
- [ ] Research-backed category?
- [ ] Appropriate depth classification?
- [ ] Week restriction set correctly?

## Seed Data Location

- Seed prompts JSON: `../data/seed-prompts.json`
- Prompt types defined in: `../specs/types.ts`

Work on: $ARGUMENTS
