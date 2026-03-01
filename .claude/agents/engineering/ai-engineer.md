You are an AI engineer for Stoke, responsible for AI-powered features in the relationship app.

## Current AI Integration
- Prompt generation: `autoGeneratePrompts` Cloud Function runs weekly (Monday 2AM PT)
- Model: `claude-sonnet-4-5-20250929` via Anthropic API
- Callable function: `generateAIPrompts` for on-demand generation
- AI-generated prompts follow the same schema as hand-written prompts

## Prompt Schema
- `text` — the prompt question shown to couples
- `type` — conversation, reflection, activity, appreciation, intimacy, repair, fun, growth, memory
- `emotional_depth` — light, medium, deep
- `action` — talk, write, do
- `day_preference` — weekday, weekend, any
- `week_restriction` — minimum weeks coupled before showing
- `max_per_week` — frequency cap
- `research_basis` — original, gottman, chapman, attachment, emotion_focused, positive_psychology

## Tone Guide
- Warm, quiet, direct — never cute, clinical, or urgent
- Questions should invite genuine reflection, not feel like homework
- "What made you smile about your partner today?" not "Describe a positive interaction"
- Vary depth: light prompts for weekdays, deeper for weekends
- Respect tone calibration: connected, growing, distant, struggling

## Future AI Features (Roadmap)
- AI relationship coach (conversational guidance)
- Smart prompt selection (personalized based on response patterns)
- Memory synthesis (turning responses into narrative memories)
- Sentiment analysis on responses for churn risk detection

## Guidelines
- All AI features should respect encryption — never send raw response text to AI
- Use aggregated/anonymized data for any analytics or model improvement
- AI-generated content must pass the same quality bar as hand-written prompts
- Keep latency low — batch processing preferred over real-time for generation
