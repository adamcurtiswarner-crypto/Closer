# Games & Quizzes — Design

**Goal:** Add 3 local/same-device game modes (Would You Rather, How Well Do You Know Me, Truth or Dare) to broaden Stoke from "daily check-in" to "date night activity."

**Approach:** Entirely client-side. Static question config, no Firestore sync. DateNightCard on Today screen links to a hidden tab game launcher. Each game mode is a self-contained component with local state.

---

## Architecture

- Game questions stored as static config files (like weeklyChallenges.ts)
- No server sync — local/same-device play, pass the phone back and forth
- DateNightCard on Today screen → hidden tab `games.tsx` → game mode components

## Navigation

- `DateNightCard` on Today screen — CTA card with game mode icons
- `app/(app)/games.tsx` — hidden tab (`href: null`), game launcher with 3 mode cards
- Each mode opens a full-screen game flow within the games screen

## Game Mode 1: Would You Rather

Two options, both partners pick independently (pass phone), then reveal together.

Flow: Show question → Partner 1 picks → Pass phone → Partner 2 picks → Reveal side-by-side → Next

Content: ~50 relationship-themed questions. Categories: fun, deep, spicy.

## Game Mode 2: How Well Do You Know Me

One partner answers about themselves, the other guesses.

Flow: Show question → Answerer types real answer → Pass phone → Guesser types guess → Reveal → Self-score (honor system) → Next

Content: ~50 questions. Mix of personality, preferences, memories.

## Game Mode 3: Truth or Dare

Pick truth or dare, complete it, alternate turns.

Flow: Partner 1 picks truth/dare → Show prompt → Done → Partner 2's turn → Alternate

Content: ~30 truths, ~30 dares. Warm and relationship-appropriate.

## Shared UI Patterns

- Round counter ("Question 3 of 10")
- Pass-the-phone transition — full screen "Pass to Sarah" overlay
- Score/progress tracking — local state only, resets each session
- Exit confirmation — "End game? Progress won't be saved"
- Completion screen — round summary with warm message

## Content Config

Single file `src/config/gameQuestions.ts` with:
- `wouldYouRather[]` — `{ id, optionA, optionB, category }`
- `howWellDoYouKnowMe[]` — `{ id, question, category }`
- `truthOrDare[]` — `{ id, type: 'truth'|'dare', prompt, category }`

## Visual Design

- Game launcher: rounded-20 cards, warm tint backgrounds, game-specific emoji icons
- In-game: clean, centered layout, large text for couch readability
- Pass phone: full-screen `#fef7f4` with partner name large and centered
- Reveal: side-by-side cards (like CompletionMoment)
- Animations: FadeInUp entrance, spring on button presses

## Files

- New: `src/config/gameQuestions.ts`
- New: `src/components/DateNightCard.tsx`
- New: `src/components/GameLauncher.tsx`
- New: `src/components/WouldYouRather.tsx`
- New: `src/components/HowWellDoYouKnowMe.tsx`
- New: `src/components/TruthOrDare.tsx`
- New: `src/components/PassPhone.tsx`
- New: `src/components/GameComplete.tsx`
- New: `app/(app)/games.tsx`
- Modify: `app/(app)/today.tsx`
- Modify: `src/components/index.ts`
