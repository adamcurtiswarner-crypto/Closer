# Test Sandbox Design

## Overview

A modular seed script system that populates Firebase (emulator or production) with 12 weeks of realistic relationship data for a fully engaged couple. Enables end-to-end feature testing, TestFlight demos, and real-account backfilling without waiting for organic usage.

## Goals

1. See every Stoke feature in its fully engaged state from the moment the app opens
2. Exercise edge cases: streak recovery, coaching tone shifts, engagement dips, empty-to-full transitions
3. Work against both the emulator (development) and production (TestFlight demos)
4. Support backfilling a real account with sandbox data
5. Pre-generate coaching insights statically, with an option to generate live via Claude API

## Non-Goals

- Automated UI testing (this seeds data, not interactions)
- Load testing or performance benchmarking
- Multi-couple scenarios (single couple is sufficient for now)

---

## Architecture

### File Structure

```
functions/src/scripts/
├── seedSandbox.ts              # CLI entry point + orchestrator
└── sandbox/
    ├── config.ts               # Scenario profile + types
    ├── seedUsers.ts            # Create 2 test users + auth accounts
    ├── seedCouple.ts           # Create couple doc, link users
    ├── seedPromptAssignments.ts # Daily assignments across 12 weeks
    ├── seedResponses.ts        # Responses with sentiment variety
    ├── seedCompletions.ts      # Completion records (+ reactions as map field)
    ├── seedCoaching.ts         # 12 weekly coaching insights (static or live)
    ├── seedPulseScores.ts      # Weekly pulse score history
    ├── seedChat.ts             # Chat messages between partners
    ├── seedGoals.ts            # Goals with completions
    ├── seedWishlist.ts         # Wishlist items
    ├── seedPhotos.ts           # Photo album entries + milestones
    ├── seedStreaks.ts          # Streak state derived from completions
    └── seedCheckIns.ts         # Weekly check-in scores
```

### Orchestrator

`seedSandbox.ts` parses CLI flags, builds a `SandboxContext`, and runs modules in dependency order:

```
users -> couple -> promptAssignments -> responses -> completions (includes reactions) -> streaks
                                     -> coaching + pulseScores (depends on responses for --live mode)
                                     -> chat
                                     -> goals
                                     -> wishlist
                                     -> photos
                                     -> checkIns
```

Each module receives `SandboxContext`:

```typescript
interface SandboxContext {
  config: SandboxConfig;
  db: FirebaseFirestore.Firestore;
  auth?: admin.auth.Auth;        // null in backfill mode
  user1Id: string;
  user2Id: string;
  coupleId: string;
  isProduction: boolean;
  isBackfill: boolean;
  isLive: boolean;
  promptIds: string[];           // Available prompt IDs from Firestore
}
```

### CLI Interface

```bash
# Emulator (default)
npm run seed:sandbox

# Production test accounts
npm run seed:sandbox:production

# Backfill real account
npm run seed:sandbox:backfill -- --backfill <coupleId>

# Live AI coaching generation
npm run seed:sandbox:live

# Seed specific domains only
npm run seed:sandbox -- --only coaching,chat

# Clear all sandbox data
npm run seed:sandbox -- --clear
```

**NPM scripts in `functions/package.json`:**

```json
"seed:sandbox": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts",
"seed:sandbox:production": "ts-node src/scripts/seedSandbox.ts --production",
"seed:sandbox:backfill": "ts-node src/scripts/seedSandbox.ts --production --backfill",
"seed:sandbox:clear": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts --clear",
"seed:sandbox:live": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts --live"
```

---

## Scenario Config

The config defines simulation parameters. All dates computed relative to "now."

```typescript
interface SandboxConfig {
  startWeeksAgo: number;  // 12

  users: {
    user1: {
      email: string;        // 'adam+stoke1@getstoke.io'
      displayName: string;  // 'Alex'
      toneCalibration: string;  // 'solid'
      loveLanguage: string;     // 'quality_time'
    };
    user2: {
      email: string;        // 'adam+stoke2@getstoke.io'
      displayName: string;  // 'Jordan'
      toneCalibration: string;  // 'solid'
      loveLanguage: string;     // 'words_of_affirmation'
    };
    password: string;  // 'TestStoke2026!'
  };

  // Per-week engagement probability (index 0 = week 1)
  // Models: strong start, dip at weeks 5-6, recovery
  engagementByWeek: number[];
  // [0.9, 0.85, 0.8, 0.75, 0.6, 0.55, 0.65, 0.75, 0.85, 0.9, 0.95, 1.0]

  // Coaching pulse tiers per week (derived from engagement)
  coachingTiers: string[];
  // ['thriving', 'steady', 'steady', 'steady', 'cooling', 'cooling',
  //  'steady', 'steady', 'steady', 'thriving', 'thriving', 'thriving']

  // Sentiment distribution thresholds
  sentimentByEngagement: {
    high: { positive: 0.7, neutral: 0.2, negative: 0.1 };   // engagement >= 0.8
    medium: { positive: 0.5, neutral: 0.3, negative: 0.2 };  // engagement >= 0.6
    low: { positive: 0.3, neutral: 0.4, negative: 0.3 };     // engagement < 0.6
  };

  // Response length ranges (characters)
  responseLengthByEngagement: {
    high: { min: 80, max: 200 };
    medium: { min: 40, max: 100 };
    low: { min: 20, max: 60 };
  };

  // Chat messages per day range, scaled by engagement
  chatMessagesPerDay: { min: 3, max: 8 };

  // Goals
  goals: Array<{ name: string; createdWeek: number; completedWeek: number | null }>;
  // [
  //   { name: 'Weekly date night', createdWeek: 1, completedWeek: 8 },
  //   { name: 'No phones at dinner', createdWeek: 2, completedWeek: 6 },
  //   { name: 'Morning check-in', createdWeek: 3, completedWeek: 10 },
  //   { name: 'Plan a trip', createdWeek: 4, completedWeek: null },
  //   { name: 'Try a new restaurant', createdWeek: 6, completedWeek: 11 },
  //   { name: 'Read together', createdWeek: 9, completedWeek: null },
  // ]

  // Wishlist items
  wishlistItems: Array<{ text: string; toggled: boolean }>;
  // [
  //   { text: 'Weekend getaway to the coast', toggled: true },
  //   { text: 'Cook a new recipe together', toggled: true },
  //   { text: 'Sunrise hike', toggled: false },
  //   { text: 'Pottery class', toggled: false },
  //   { text: 'Stargazing blanket', toggled: true },
  //   { text: 'Matching journals', toggled: false },
  //   { text: 'Concert tickets', toggled: false },
  //   { text: 'Photo book of our year', toggled: false },
  // ]

  // Photos and milestones
  photos: Array<{ imageUrl: string; caption: string; weekCreated: number }>;
  milestones: Array<{ title: string; category: string; description: string; date: string; weekCreated: number }>;

  // Reaction probability on completed prompts
  reactionProbability: number;  // 0.4

  // Check-in scores per week (1-5 scale, mirrors engagement)
  checkInScores: number[];
  // [4.5, 4.3, 4.0, 3.8, 3.2, 3.0, 3.5, 3.8, 4.2, 4.5, 4.7, 4.8]
}
```

The engagement curve tells a story: an active couple hits a rough patch around weeks 5-6 (fewer responses, shorter text, more negative sentiment, pulse drops to "cooling") and then recovers. This exercises the full range of coaching tones and tier states.

---

## Data Generation Details

### Users + Couple (`seedUsers.ts`, `seedCouple.ts`)

**Emulator mode:**
- Creates auth accounts via `admin.auth().createUser()` with email/password
- Creates user docs in `/users/{userId}` with all fields

**Production mode (`--production`):**
- Creates auth accounts in production Firebase Auth
- Creates user docs in production Firestore

**Backfill mode (`--backfill <coupleId>`):**
- Reads existing couple doc to get `member_ids`
- Skips user/couple creation entirely
- Uses real IDs for all subsequent seeding

**User doc fields:**
```
id, email, display_name, partner_name, couple_id,
notification_time: '08:00', timezone: 'America/Los_Angeles',
tone_calibration, is_onboarded: true, love_language, locale: 'en',
photo_url: null, partner_photo_url: null,
created_at: <12 weeks ago>
```

**Couple doc fields:**
```
member_ids: [user1Id, user2Id], status: 'active',
created_at: <12 weeks ago>, premium_until: <6 months from now>,
current_pulse_score: <latest week score>,
current_pulse_tier: <latest week tier>
```

**Couple ID:** Deterministic `sandbox-couple-001` in non-backfill mode.

### Prompt Assignments + Responses (`seedPromptAssignments.ts`, `seedResponses.ts`)

For each day in the 12-week window (84 days):
1. Select a prompt from the seeded prompt library (round-robin through available IDs)
2. Create a prompt assignment doc in `/prompt_assignments/`
3. Determine engagement for this day's week
4. Roll engagement probability for each user independently:
   - Both respond: create 2 response docs + 1 completion doc
   - One responds: create 1 response doc (partial assignment)
   - Neither responds: assignment only (missed)

**Assignment doc (matches `deliverDailyPrompts` schema):**
```
couple_id, prompt_id, prompt_text, prompt_hint, prompt_type,
requires_conversation: <from prompt>,
assigned_date: <'YYYY-MM-DD' string>,
source: 'sandbox',
delivered_at: <timestamp>,
delivery_timezone: 'America/Los_Angeles',
status: 'completed' | 'partial' | 'expired',
completed_at: <timestamp or null>,
response_count: 0 | 1 | 2,
first_response_at: <timestamp or null>,
second_response_at: <timestamp or null>,
created_at: <timestamp>,
updated_at: <timestamp>
```

**Response doc (matches `onResponseSubmitted` schema):**
```
couple_id, prompt_id, assignment_id, user_id,
response_text: '[encrypted]',
response_text_encrypted: <realistic text from phrase pool>,
status: 'submitted',
emotional_response: 'positive' | 'neutral' | 'negative',
talked_about_it: <boolean, true for ~60% of high-engagement weeks>,
image_url: null,
response_length: <character count>,
time_to_respond_seconds: <random 120-7200>,
submitted_at: <day timestamp + random 1-14 hour offset>,
created_at: <same as submitted_at>
```

`emotional_response` distribution is determined by the engagement-based sentiment config for that week.

**Response text pool:** ~40 realistic phrases per sentiment bucket:
- Positive: "I love how you always know when I need a quiet evening", "The way you laughed at dinner tonight reminded me why I fell for you", etc.
- Neutral: "We had a pretty normal day, nothing special but it was nice", "I think we could try being more intentional about our evenings", etc.
- Negative: "I felt a bit disconnected today, like we were just going through motions", "I wish we had more time to actually talk instead of just logistics", etc.

Response length follows the `responseLengthByEngagement` config.

### Completions + Reactions (`seedCompletions.ts`)

Completion doc ID is the `assignment_id`. For each day where both users responded:
```
assignment_id, couple_id, prompt_id,
responses: [
  { user_id, response_text: '[encrypted]', response_text_encrypted, image_url: null, submitted_at },
  { user_id, response_text: '[encrypted]', response_text_encrypted, image_url: null, submitted_at }
],
time_to_complete_seconds: <diff between first and second response>,
total_response_length: <sum of both response lengths>,
emotional_responses: [],
talked_about_it: <boolean>,
week: <'YYYY-WNN' string>,
is_memory_saved: false,
completed_at: <later of the two response timestamps>,
created_at: <same as completed_at>
```

**Reactions** are stored as a map field on the completion doc (not a separate collection):
```
reactions: { [userId]: 'heart' | 'thoughtful' | 'laugh' | 'teary' }
```

For ~40% of completions, the partner who did NOT write the later response adds a reaction.
Reaction type weights: heart (55%), thoughtful (25%), laugh (12%), teary (8%).

### Streaks (`seedStreaks.ts`)

Computed from the completion records:
- Count consecutive completed days up to today
- Store in couple doc: `current_streak`, `longest_streak`, `last_streak_date` (string `'YYYY-MM-DD'`)
- The engagement dip at weeks 5-6 creates a streak break and recovery

### Pulse Scores (`seedPulseScores.ts`)

12 weekly pulse score docs in `/couples/{coupleId}/pulse_scores/{weekId}`:
```
score: <numeric score derived from engagement curve>,
tier: 'thriving' | 'steady' | 'cooling' | 'needs_attention',
breakdown: {
  emotion_positive: N, emotion_negative: N, emotion_total: N,
  completion_rate: <float 0-1>, one_sided_days: N,
  avg_response_length: N, avg_check_in: <float 1-5>
},
created_at: <Monday of that week>
```

Doc ID is `weekId` (e.g., `2026-W02`). Also updates couple doc `current_pulse_score` and `current_pulse_tier` with the latest week's values.

### Coaching Insights (`seedCoaching.ts`)

**Static mode (default):**

12 pre-written insights in `/couples/{coupleId}/coaching_insights/{weekId}`. Doc ID is `weekId` (e.g., `2026-W02`). Each has:
```
pulse_score: <from pulse score for that week>,
insight_text: <2-3 sentences, tone-matched to tier>,
action_type: <distributed across goal, conversation, date_night, revisit, check_in>,
action_text: <specific actionable suggestion>,
created_at: <Monday of that week>,
dismissed_at: <timestamp or null>,
acted_on: <timestamp or null>
```

Distribution of outcomes across 12 weeks:
- 5 acted on (with `acted_on` timestamp 1-3 days after creation)
- 3 dismissed (with `dismissed_at` timestamp)
- 4 untouched (both null — includes recent weeks)

Sample insights by tier:
- **Thriving (week 1):** "You two have been showing up for each other consistently this week. Your responses show genuine curiosity about each other's inner world." Action: `conversation` / "Ask about a dream your partner mentioned recently"
- **Cooling (week 5):** "Things have been quieter between you two this week. That happens. Sometimes a small gesture can shift the energy." Action: `goal` / "Set a 5-minute no-phones check-in before bed tonight"
- **Thriving (week 12):** "Your engagement this week has been remarkable. The depth of your responses shows real emotional investment." Action: `date_night` / "Celebrate this momentum with an intentional evening together"

**Live mode (`--live`):**

Seeds response data first, then calls `computePulseForCouple()` for each week (adjusting timestamps). Requires Anthropic API key configured. Generates real coaching text via Claude.

### Chat Messages (`seedChat.ts`)

~400 messages total across 12 weeks:
- Messages per day: 3-8, scaled by that week's engagement
- Mix of message lengths: short (1-5 words, 40%), medium (6-20 words, 45%), long (21-50 words, 15%)
- Distributed throughout the day (7am-11pm, weighted toward evening)
- Both users send roughly equally
- Read cursors: set to 2-3 messages behind for the most recent day (creates unread state)

**Message text pool:** ~30 messages per length category:
- Short: "miss you", "on my way", "love you", "good morning", "how was it"
- Medium: "want to try that new place for dinner?", "just thinking about our conversation last night"
- Long: "I had the best lunch today and it reminded me of that cafe we found on vacation"

### Goals (`seedGoals.ts`)

6 goals created at staggered weeks per config. Stored in `/couples/{coupleId}/goals/{goalId}`:
```
name, created_at: <week timestamp>, archived: <true if completedWeek set>,
archived_at: <completedWeek timestamp or null>
```

Completion records in `/couples/{coupleId}/goals/{goalId}/completions/`:
- For active goals, 2-4 completion records per week between creation and now
- For archived goals, completions between creation and archive date

### Wishlist (`seedWishlist.ts`)

8 items in `/couples/{coupleId}/wishlist_items/{itemId}`:
```
text, created_by: <alternating user1/user2>,
created_at: <staggered across weeks>,
is_completed: <per config>,
completed_at: <timestamp or null>
```

### Photos + Milestones (`seedPhotos.ts`)

5 photos in `/couples/{coupleId}/photos/{photoId}`:
```
image_url: <placeholder URL or empty string>,
caption, uploaded_by: <alternating>,
created_at: <per weekCreated>
```

2 milestones in `/couples/{coupleId}/milestones/{milestoneId}`:
```
title, category: <'anniversary' | 'trip' | 'first_date' | etc.>,
description: <short text>,
image_url: null,
date: <date string>,
created_by: <user id>,
created_at: <timestamp>
```

Photo URLs use placeholder strings since actual image files are not needed for UI testing of the grid/viewer.

### Check-Ins (`seedCheckIns.ts`)

12 weekly check-in records in `/couples/{coupleId}/check_ins/{checkInId}`:
```
responses: [
  { user_id: <user1Id>, score: <per checkInScores config> },
  { user_id: <user2Id>, score: <per checkInScores config +/- 0.3 variance> }
],
created_at: <Sunday of each week>
```

Scores follow the engagement curve: 4.5 -> 3.0 (dip) -> 4.8 (recovery).

### Couple Doc Additional Fields

Beyond `current_pulse_score`, `current_pulse_tier`, `current_streak`, `longest_streak`, `last_streak_date`, the couple doc also needs:
- `depth_progress`: initialized depth progression structure (tracks prompt depth unlocking)

---

## Production Safety

### Confirmation Prompts

- `--production` triggers interactive confirmation: "You are about to write ~3,000 documents to PRODUCTION Firestore. Type 'yes' to continue."
- `--backfill` adds a second confirmation: "This will add sandbox data to couple <coupleId>. Existing data will NOT be deleted."

### Sandbox Tagging

Every document created by the script includes:
```
_sandbox: true,
_sandbox_created_at: <ISO timestamp>
```

These fields enable:
- `--clear` deletes only `_sandbox: true` docs, never organic data
- Visual identification in Firestore console
- Production cleanup: `npm run seed:sandbox:production -- --clear`

### Backfill Isolation

- Backfill mode never modifies existing documents
- Only creates new documents with sandbox tags
- Existing prompt assignments, responses, etc. are untouched

### Test Account Isolation

- Test emails use `+stoke1`/`+stoke2` pattern for easy identification
- Couple ID is deterministic: `sandbox-couple-001` (unless backfill)
- No overlap with organic user IDs

### No Destructive Defaults

- Without `--production`: all writes go to emulator (localhost)
- Without `--clear`: nothing is deleted
- Without `--backfill`: no real accounts are touched

### Cleanup Implementation

`--clear` must handle subcollections explicitly since Firestore does not auto-delete subcollection docs when a parent is deleted:
1. Query all top-level collections for `_sandbox: true` docs
2. For each sandbox couple doc, iterate all subcollections (coaching_insights, pulse_scores, messages, chat_read_cursors, goals + completions, wishlist_items, photos, milestones, check_ins)
3. Delete subcollection docs first, then parent docs
4. In production, a `_sandbox_manifest` doc records all created IDs for faster cleanup

### Dry Run

`--dry-run` flag logs all operations without committing to Firestore. Useful for validating data shape before production writes.

---

## Estimated Data Volume

| Collection | Documents | Notes |
|-----------|-----------|-------|
| users | 2 | Test accounts |
| couples | 1 | With pulse, streak, depth fields |
| prompt_assignments | 84 | 1 per day for 12 weeks |
| prompt_responses | ~130 | Based on engagement curve |
| prompt_completions | ~55 | Includes reactions map field |
| couples/.../coaching_insights | 12 | Subcollection, weekId doc IDs |
| couples/.../pulse_scores | 12 | Subcollection, weekId doc IDs |
| couples/.../messages | ~400 | 3-8 per day |
| couples/.../chat_read_cursors | 2 | 1 per user |
| couples/.../goals | 6 | Plus ~50 completion subdocs |
| couples/.../wishlist_items | 8 | |
| couples/.../photos | 5 | |
| couples/.../milestones | 2 | |
| couples/.../check_ins | 12 | |
| **Total** | **~830** | Plus ~50 goal completion subdocs |

Batch writes (500 docs per batch) keep this to ~2 Firestore batch commits.

---

## Usage Workflow

### Local Development

```bash
# Terminal 1
firebase emulators:start

# Terminal 2
cd functions
npm run seed:emulator          # seed prompts
npm run seed:sandbox           # seed 12-week sandbox

# Terminal 3
cd .. && npm start
# Sign in: adam+stoke1@getstoke.io / TestStoke2026!
```

### TestFlight Demo

```bash
cd functions
npm run seed:sandbox:production
# On device: sign in as adam+stoke1@getstoke.io
```

### Backfill Real Account

```bash
cd functions
npm run seed:sandbox:backfill -- --backfill YOUR_COUPLE_ID
# Open app normally — sandbox data appears alongside real data
```

### Cleanup

```bash
# Emulator
npm run seed:sandbox:clear

# Production
npm run seed:sandbox:production -- --clear
```
