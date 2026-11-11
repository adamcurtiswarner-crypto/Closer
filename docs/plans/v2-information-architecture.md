# Stoke v2 Information Architecture

*CEO directive: November 11, 2026. Scoring becomes the foundation. Hearth and Us consolidate. Explore gets a real taxonomy.*

---

## The Vision

Three tabs. Three clear jobs.

| Tab | Job | Icon |
|---|---|---|
| **Today** | Answer today's question together | flame |
| **Us** | Understand your relationship (the merged Hearth + Us) | heart-half |
| **Explore** | Discover or revisit questions | compass |
| Profile | Settings, account, subscription | gear |

---

## Tab 1: Today (unchanged)

Each partner answers independently. Sealed until both respond. Reveal. Follow-ups trigger from scores. Try This daily action card. Small moves while waiting.

No changes to the core loop.

---

## Tab 2: Us (merged Hearth + Us)

### What it replaces
- The current Hearth tab (ember grid, couch queue, reveal sheets, sparklines)
- The current Us tab (alignment grid, love language tips, reaction signals)

### What it becomes

**Overview section (top):**
- Couple header (names, days together, photos)
- 12-dimension tile grid (the UsGrid we built) — each tile shows both scores, status badge, score bars
- Tile sort: most interesting first (biggest gaps, then lowest combined)

**Dimension detail (tap a tile):**
- Both partners' scores over time (sparkline with two lines, not just average)
- Relevant answered prompts for this dimension (pulled from completions)
- Areas of agreement vs difference (highlighted)
- Suggested action from the daily action pool
- "Keep it for the couch" queue items for this dimension

**What you tended section:**
- Count of repair/divergence conversations marked "we talked" this month

**Love language section:**
- Side-by-side comparison + 25-combination pairing tips

**What lands differently:**
- Reaction pattern outliers

### Architecture note — scoring dimensions vs explore collections

The 12 dimensions are the SCORING backbone. They never change for the user. Every answered question feeds one or more dimensions. The user sees their relationship health across these 12 areas, regardless of which explore collection the question came from.

The 12 scoring dimensions:
1. Communication
2. Intimacy
3. Affection
4. Money
5. Family
6. Friends
7. Fun and play
8. Future dreams
9. Everyday life
10. Conflict and repair
11. Appreciation and trust
12. Growth and independence

---

## Tab 3: Explore (renamed from Categories)

### What changes
- Renamed from "Categories" to "Explore"
- The 12 scoring dimensions are NOT the explore collections
- Explore has ~6 user-facing collections (how users engage)
- Each question maps to: one explore collection + multiple scoring dimension tags + intensity level

### User-facing explore collections (~6)

| Collection | What it covers | Maps to scoring dimensions |
|---|---|---|
| **Get to Know You** | Discovery, curiosity, learning your person | Communication, Growth |
| **Love and Appreciation** | Gratitude, affection, being seen | Affection, Appreciation/Trust, Intimacy |
| **Talk It Through** | Hard conversations, repairs, conflict | Conflict/Repair, Communication |
| **Dream Together** | Future, goals, ambitions, shared vision | Future Dreams, Growth |
| **Life Together** | Money, family, daily logistics, friends | Money, Family, Friends, Everyday Life |
| **Fun and Play** | Lightness, humor, novelty, adventure | Fun/Play, Intimacy |

### Behind the scenes — question metadata

Each prompt gets enriched metadata:

```typescript
interface EnrichedPrompt {
  id: string;
  text: string;

  // User-facing
  explore_collection: ExploreCollection; // one of 6
  intensity: 'light' | 'reflective' | 'sensitive';

  // Scoring (hidden from user)
  scoring_dimensions: string[];  // 1-3 of the 12 dimensions
  scoring_rules: {
    primary: string;     // main dimension this scores
    secondary?: string;  // optional secondary
  };

  // Engagement tracking
  status: 'active' | 'graduated' | 'retired';
  response_format: 'scale' | 'text';

  // Existing fields
  category: string;          // legacy, maps to primary scoring dimension
  emotional_depth: string;   // maps to intensity
  week_restriction: number | null;
}

type ExploreCollection =
  | 'get_to_know_you'
  | 'love_and_appreciation'
  | 'talk_it_through'
  | 'dream_together'
  | 'life_together'
  | 'fun_and_play';
```

### Two clear functions in Explore

**Discover:** Browse collections, find new questions, send to partner.
- Collection cards at top
- Questions sorted by: unanswered first, then by intensity (light → sensitive)
- Tag chips showing which dimensions this question scores

**Revisit:** Questions you have already answered, with both responses visible.
- Filter by collection or dimension
- Sort by date, score, or dimension
- Tappable to see the full reveal + reactions + clarify

---

## Migration plan

### Phase 1: Tab restructure (can ship now)

1. Rename "Categories" tab to "Explore" (title + icon change)
2. Merge Hearth into Us tab:
   - Us tab shows: couple header → UsGrid tiles → tended count → love language tips
   - Tapping a tile opens the existing HearthCategoryDetail
   - Couch queue accessible via a "Conversations waiting" card at the top if any exist
3. Remove Hearth as a separate tab (hide it)
4. Tab bar becomes: Today | Explore | Us | Profile (4 tabs, down from 5)

### Phase 2: Explore taxonomy (can ship with or after Phase 1)

1. Add `explore_collection` field to the prompt schema
2. Map all 345 prompts to one of 6 collections
3. Add `intensity` field (derived from `emotional_depth`: surface→light, medium→reflective, deep→sensitive)
4. Update explore.tsx to show 6 collections instead of 12 categories
5. Add "Revisit" section below "Discover"

### Phase 3: Multi-dimension scoring (future)

1. Add `scoring_dimensions` array to prompts (currently each prompt scores exactly one dimension via `category`)
2. Update follow-up trigger logic to check primary dimension
3. Update the Us grid to show scores from multi-dimension prompts
4. Enable the recommendation engine: suggest questions based on which dimensions have the least data or the biggest gaps

---

## What does NOT change

- The 12 scoring dimensions stay exactly as they are
- The follow-up engine (deepener/repair/divergence) stays the same
- The daily prompt delivery stays the same
- The reveal mechanic stays the same
- Premium gates stay the same
- The underlying Firestore schema stays backward-compatible

---

## Implementation priority

**Ship Phase 1 first.** It is a tab rename + merge, no schema changes, no new data. The app goes from 5 tabs to 4, Hearth content moves into Us, and Categories becomes Explore. This can be done in one session and OTA'd.

Phase 2 (explore taxonomy) requires a data migration (adding `explore_collection` to 345 prompts) and new UI for the collection cards. Ship after Phase 1 is validated.

Phase 3 (multi-dimension scoring) is the foundation for the recommendation engine and can wait until post-launch data validates the model.
