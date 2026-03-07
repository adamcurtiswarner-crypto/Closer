# Home Screen Redesign — Design Doc

**Goal:** Add a new Home tab as the app's primary landing screen — an editorial discovery surface with a daily conversation starter and personalized recommendations.

**Approach:** Progressive build. Full new screen with static seed data for conversation starters. Backend auto-generation wired up later.

---

## Screen Layout (top to bottom)

1. **Greeting header** — "Good Morning, [Name]" (Alexandria-SemiBold 28px), subtitle "We hope you have a good day" (Inter-Regular, muted). Top-right: chat/send icon shortcut.

2. **Relationship stage pill** — Rounded badge showing the user's relationship stage in its assigned color. Tapping navigates to settings.

3. **Daily Thought card** — Full-width colored card:
   - "Daily Thought" label + "ACTIVITY · 3-10 MIN" overline
   - Conversation topic text
   - Play/start button opens ConversationStarterModal
   - Background color rotates from a warm palette

4. **Recommended for you** — Horizontal FlatList of colored cards. Smart mix of category entry points and specific activities:
   - 2 category cards (from promptCategories config)
   - 3 activity cards (from explore prompts, date night ideas)
   - Rotates weekly based on relationship stage
   - Category tap → Explore filtered, Activity tap → opens directly

5. **Tab bar** — 5 tabs: Home (flame/house icon), Today, Memories, Insights, Settings

## Color Palette (card backgrounds)

Pastel/muted tones matching Figma: lavender, peach, sage, coral, butter yellow. Defined as `CARD_COLORS` array in config.

## Data & State

### Conversation Starters
- Static config: `src/config/conversationStarters.ts` — ~20 starters with `{ id, topic, description, durationMinutes, category }`
- Daily selection: deterministic hash of date + coupleId so both partners see the same one
- No Firestore needed yet — pure client-side

### Recommended Cards
- Categories from existing `promptCategories` config
- Activities from existing explore prompts
- Mix logic: 2 categories + 3 activities, shuffled, rotated weekly by relationship stage

### Hooks
- `useConversationStarter()` — picks today's starter deterministically

## New Files

- `app/(app)/home.tsx` — screen
- `src/components/ConversationStarterCard.tsx` — Daily Thought card
- `src/components/ConversationStarterModal.tsx` — modal with timer (3/5/10 min), countdown, done
- `src/components/RecommendedCard.tsx` — colored card for horizontal scroll
- `src/config/conversationStarters.ts` — static seed data (~20 starters)
- `src/hooks/useConversationStarter.ts` — daily selection logic

## Modified Files

- `app/(app)/_layout.tsx` — add Home as first visible tab, reorder tabs
- `src/components/index.ts` — barrel exports

## Not Changed

- Today screen (stays exactly as-is)
- Existing hooks or backend
- Existing components

## Future Work

- Backend Cloud Function to auto-generate conversation starters
- Analytics events for home screen engagement
- Personalized recommendation algorithm
