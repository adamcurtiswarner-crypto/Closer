# Test Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular seed script that populates Firebase with 12 weeks of realistic relationship data for end-to-end feature testing.

**Architecture:** CLI orchestrator (`seedSandbox.ts`) dispatches modular seed functions in dependency order. Each module writes to Firestore via batch operations. Shared `SandboxContext` carries IDs and config between modules. Supports emulator (default), production, backfill, and live AI modes via CLI flags.

**Tech Stack:** TypeScript, firebase-admin SDK, ts-node, Node.js CLI (process.argv)

**Spec:** `docs/superpowers/specs/2026-03-19-test-sandbox-design.md`

---

### Task 1: Scaffold config and types

**Files:**
- Create: `functions/src/scripts/sandbox/config.ts`

- [ ] **Step 1: Create the config file with all types and default values**

```typescript
import * as admin from 'firebase-admin';

export interface SandboxUserConfig {
  email: string;
  displayName: string;
  toneCalibration: string;
  loveLanguage: string;
}

export interface SandboxConfig {
  startWeeksAgo: number;
  users: {
    user1: SandboxUserConfig;
    user2: SandboxUserConfig;
    password: string;
  };
  engagementByWeek: number[];
  coachingTiers: string[];
  sentimentByEngagement: {
    high: { positive: number; neutral: number; negative: number };
    medium: { positive: number; neutral: number; negative: number };
    low: { positive: number; neutral: number; negative: number };
  };
  responseLengthByEngagement: {
    high: { min: number; max: number };
    medium: { min: number; max: number };
    low: { min: number; max: number };
  };
  chatMessagesPerDay: { min: number; max: number };
  goals: Array<{ name: string; createdWeek: number; completedWeek: number | null }>;
  wishlistItems: Array<{ text: string; toggled: boolean }>;
  photos: Array<{ imageUrl: string; caption: string; weekCreated: number }>;
  milestones: Array<{ title: string; category: string; description: string; date: string; weekCreated: number }>;
  reactionProbability: number;
  checkInScores: number[];
}

export interface AssignmentRecord {
  id: string;
  promptId: string;
  date: Date;
  weekIndex: number;
  engagement: number;
}

export interface ResponseRecord {
  assignmentId: string;
  user1Responded: boolean;
  user2Responded: boolean;
  user1ResponseTime: Date | null;
  user2ResponseTime: Date | null;
}

export interface SandboxContext {
  config: SandboxConfig;
  db: FirebaseFirestore.Firestore;
  auth?: admin.auth.Auth;
  user1Id: string;
  user2Id: string;
  coupleId: string;
  isProduction: boolean;
  isBackfill: boolean;
  isLive: boolean;
  dryRun: boolean;
  promptIds: string[];
  promptMap: Map<string, { text: string; hint: string | null; type: string; requires_conversation: boolean }>;
  // Cross-module data (populated by upstream modules)
  assignments: AssignmentRecord[];
  responses: ResponseRecord[];
}

export const DEFAULT_CONFIG: SandboxConfig = {
  startWeeksAgo: 12,
  users: {
    user1: {
      email: 'adam+stoke1@getstoke.io',
      displayName: 'Alex',
      toneCalibration: 'solid',
      loveLanguage: 'quality_time',
    },
    user2: {
      email: 'adam+stoke2@getstoke.io',
      displayName: 'Jordan',
      toneCalibration: 'solid',
      loveLanguage: 'words_of_affirmation',
    },
    password: 'TestStoke2026!',
  },
  engagementByWeek: [0.9, 0.85, 0.8, 0.75, 0.6, 0.55, 0.65, 0.75, 0.85, 0.9, 0.95, 1.0],
  coachingTiers: [
    'thriving', 'steady', 'steady', 'steady', 'cooling', 'cooling',
    'steady', 'steady', 'steady', 'thriving', 'thriving', 'thriving',
  ],
  sentimentByEngagement: {
    high: { positive: 0.7, neutral: 0.2, negative: 0.1 },
    medium: { positive: 0.5, neutral: 0.3, negative: 0.2 },
    low: { positive: 0.3, neutral: 0.4, negative: 0.3 },
  },
  responseLengthByEngagement: {
    high: { min: 80, max: 200 },
    medium: { min: 40, max: 100 },
    low: { min: 20, max: 60 },
  },
  chatMessagesPerDay: { min: 3, max: 8 },
  goals: [
    { name: 'Weekly date night', createdWeek: 1, completedWeek: 8 },
    { name: 'No phones at dinner', createdWeek: 2, completedWeek: 6 },
    { name: 'Morning check-in', createdWeek: 3, completedWeek: 10 },
    { name: 'Plan a trip', createdWeek: 4, completedWeek: null },
    { name: 'Try a new restaurant', createdWeek: 6, completedWeek: 11 },
    { name: 'Read together', createdWeek: 9, completedWeek: null },
  ],
  wishlistItems: [
    { text: 'Weekend getaway to the coast', toggled: true },
    { text: 'Cook a new recipe together', toggled: true },
    { text: 'Sunrise hike', toggled: false },
    { text: 'Pottery class', toggled: false },
    { text: 'Stargazing blanket', toggled: true },
    { text: 'Matching journals', toggled: false },
    { text: 'Concert tickets', toggled: false },
    { text: 'Photo book of our year', toggled: false },
  ],
  photos: [
    { imageUrl: '', caption: 'Our favorite coffee spot', weekCreated: 2 },
    { imageUrl: '', caption: 'Sunday afternoon walk', weekCreated: 4 },
    { imageUrl: '', caption: 'Trying that new restaurant', weekCreated: 7 },
    { imageUrl: '', caption: 'Rainy day indoors', weekCreated: 9 },
    { imageUrl: '', caption: 'Weekend morning', weekCreated: 11 },
  ],
  milestones: [
    { title: 'First trip together', category: 'trip', description: 'A long weekend at the coast', date: '', weekCreated: 3 },
    { title: 'Anniversary dinner', category: 'anniversary', description: 'Two years and counting', date: '', weekCreated: 8 },
  ],
  reactionProbability: 0.4,
  checkInScores: [4.5, 4.3, 4.0, 3.8, 3.2, 3.0, 3.5, 3.8, 4.2, 4.5, 4.7, 4.8],
};
```

- [ ] **Step 2: Add helper utilities at the bottom of config.ts**

```typescript
export function getWeekStart(weeksAgo: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - (weeksAgo * 7));
  // Roll back to Monday
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// dayOfWeek: 0 = Monday, 6 = Sunday
export function getDayDate(weeksAgo: number, dayOfWeek: number): Date {
  const weekStart = getWeekStart(weeksAgo);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pickWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function getEngagementLevel(engagement: number): 'high' | 'medium' | 'low' {
  if (engagement >= 0.8) return 'high';
  if (engagement >= 0.6) return 'medium';
  return 'low';
}

export function sandboxTag(): Record<string, unknown> {
  return {
    _sandbox: true,
    _sandbox_created_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd functions && npx tsc --noEmit src/scripts/sandbox/config.ts`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add functions/src/scripts/sandbox/config.ts
git commit -m "feat: add sandbox config and types"
```

---

### Task 2: Orchestrator and CLI

**Files:**
- Create: `functions/src/scripts/seedSandbox.ts`
- Modify: `functions/package.json`

- [ ] **Step 1: Create the orchestrator**

```typescript
import * as admin from 'firebase-admin';
import * as readline from 'readline';
import { DEFAULT_CONFIG, SandboxContext } from './sandbox/config';
import { seedUsers } from './sandbox/seedUsers';
import { seedCouple } from './sandbox/seedCouple';
import { seedPromptAssignments } from './sandbox/seedPromptAssignments';
import { seedResponses } from './sandbox/seedResponses';
import { seedCompletions } from './sandbox/seedCompletions';
import { seedCoaching } from './sandbox/seedCoaching';
import { seedPulseScores } from './sandbox/seedPulseScores';
import { seedChat } from './sandbox/seedChat';
import { seedGoals } from './sandbox/seedGoals';
import { seedWishlist } from './sandbox/seedWishlist';
import { seedPhotos } from './sandbox/seedPhotos';
import { seedStreaks } from './sandbox/seedStreaks';
import { seedCheckIns } from './sandbox/seedCheckIns';
import { clearSandbox } from './sandbox/clearSandbox';

// Note: _sandbox_manifest for faster production cleanup is deferred to a future iteration.

function parseArgs(argv: string[]): {
  production: boolean;
  backfill: string | null;
  live: boolean;
  clear: boolean;
  only: string[] | null;
  dryRun: boolean;
} {
  const args = argv.slice(2);
  return {
    production: args.includes('--production'),
    backfill: args.includes('--backfill')
      ? args[args.indexOf('--backfill') + 1] || null
      : null,
    live: args.includes('--live'),
    clear: args.includes('--clear'),
    only: args.includes('--only')
      ? (args[args.indexOf('--only') + 1] || '').split(',')
      : null,
    dryRun: args.includes('--dry-run'),
  };
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} Type 'yes' to continue: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv);

  // Initialize Firebase
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: 'closer-app-dev' });
    console.log('Connected to emulator');
  } else if (flags.production) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Connected to PRODUCTION');
  } else {
    console.error('No emulator detected and --production not set. Aborting.');
    process.exit(1);
  }

  const db = admin.firestore();
  const auth = admin.auth();

  // Safety confirmations
  if (flags.production) {
    const ok = await confirm(
      'You are about to write ~830 documents to PRODUCTION Firestore.'
    );
    if (!ok) { process.exit(0); }
  }
  if (flags.backfill) {
    const ok = await confirm(
      `This will add sandbox data to couple ${flags.backfill}. Existing data will NOT be deleted.`
    );
    if (!ok) { process.exit(0); }
  }

  // Clear mode
  if (flags.clear) {
    const coupleId = flags.backfill || 'sandbox-couple-001';
    await clearSandbox(db, coupleId, flags.production);
    console.log('Sandbox data cleared.');
    process.exit(0);
  }

  // Load available prompts
  const promptsSnap = await db.collection('prompts').get();
  if (promptsSnap.empty) {
    console.error('No prompts found. Run seed:emulator first.');
    process.exit(1);
  }
  const promptIds = promptsSnap.docs.map(d => d.id);
  const promptMap = new Map(
    promptsSnap.docs.map(d => [d.id, {
      text: d.data().text,
      hint: d.data().hint,
      type: d.data().type,
      requires_conversation: d.data().requires_conversation,
    }])
  );

  // Build context (users + couple created first, or loaded for backfill)
  let user1Id: string;
  let user2Id: string;
  let coupleId: string;

  if (flags.backfill) {
    coupleId = flags.backfill;
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) {
      console.error(`Couple ${coupleId} not found.`);
      process.exit(1);
    }
    const memberIds = coupleDoc.data()!.member_ids;
    user1Id = memberIds[0];
    user2Id = memberIds[1];
    console.log(`Backfill mode: couple=${coupleId}, users=${user1Id}, ${user2Id}`);
  } else {
    const users = await seedUsers(db, auth, DEFAULT_CONFIG);
    user1Id = users.user1Id;
    user2Id = users.user2Id;
    coupleId = 'sandbox-couple-001';
    await seedCouple(db, DEFAULT_CONFIG, coupleId, user1Id, user2Id);
  }

  const ctx: SandboxContext = {
    config: DEFAULT_CONFIG,
    db,
    auth,
    user1Id,
    user2Id,
    coupleId,
    isProduction: flags.production,
    isBackfill: !!flags.backfill,
    isLive: flags.live,
    dryRun: flags.dryRun,
    promptIds,
    promptMap,
    assignments: [],
    responses: [],
  };

  // Module registry
  const modules: Record<string, (ctx: SandboxContext) => Promise<void>> = {
    assignments: seedPromptAssignments,
    responses: seedResponses,
    completions: seedCompletions,
    streaks: seedStreaks,
    coaching: seedCoaching,
    pulseScores: seedPulseScores,
    chat: seedChat,
    goals: seedGoals,
    wishlist: seedWishlist,
    photos: seedPhotos,
    checkIns: seedCheckIns,
  };

  // Execution order
  const order = [
    'assignments', 'responses', 'completions', 'streaks',
    'coaching', 'pulseScores', 'chat', 'goals', 'wishlist', 'photos', 'checkIns',
  ];

  for (const name of order) {
    if (flags.only && !flags.only.includes(name)) continue;
    console.log(`\nSeeding ${name}...`);
    await modules[name](ctx);
    console.log(`  ${name} done.`);
  }

  console.log('\nSandbox seeding complete!');
  console.log(`  Couple: ${coupleId}`);
  console.log(`  User 1: ${user1Id} (${DEFAULT_CONFIG.users.user1.email})`);
  console.log(`  User 2: ${user2Id} (${DEFAULT_CONFIG.users.user2.email})`);
  console.log(`  Password: ${DEFAULT_CONFIG.users.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Sandbox seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to the `"scripts"` section of `functions/package.json`:

```json
"seed:sandbox": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts",
"seed:sandbox:production": "ts-node src/scripts/seedSandbox.ts --production",
"seed:sandbox:backfill": "ts-node src/scripts/seedSandbox.ts --production --backfill",
"seed:sandbox:clear": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts --clear",
"seed:sandbox:live": "FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 ts-node src/scripts/seedSandbox.ts --live"
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/scripts/seedSandbox.ts functions/package.json
git commit -m "feat: add sandbox orchestrator and npm scripts"
```

---

### Task 3: seedUsers and seedCouple

**Files:**
- Create: `functions/src/scripts/sandbox/seedUsers.ts`
- Create: `functions/src/scripts/sandbox/seedCouple.ts`

- [ ] **Step 1: Create seedUsers.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxConfig, getWeekStart, sandboxTag } from './config';

export async function seedUsers(
  db: FirebaseFirestore.Firestore,
  auth: admin.auth.Auth,
  config: SandboxConfig,
): Promise<{ user1Id: string; user2Id: string }> {
  const user1 = await getOrCreateUser(auth, config.users.user1.email, config.users.password, config.users.user1.displayName);
  const user2 = await getOrCreateUser(auth, config.users.user2.email, config.users.password, config.users.user2.displayName);

  const startDate = getWeekStart(config.startWeeksAgo);

  await db.collection('users').doc(user1.uid).set({
    id: user1.uid,
    email: config.users.user1.email,
    display_name: config.users.user1.displayName,
    partner_name: config.users.user2.displayName,
    couple_id: 'sandbox-couple-001',
    notification_time: '08:00',
    timezone: 'America/Los_Angeles',
    tone_calibration: config.users.user1.toneCalibration,
    is_onboarded: true,
    love_language: config.users.user1.loveLanguage,
    locale: 'en',
    photo_url: null,
    partner_photo_url: null,
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    ...sandboxTag(),
  });

  await db.collection('users').doc(user2.uid).set({
    id: user2.uid,
    email: config.users.user2.email,
    display_name: config.users.user2.displayName,
    partner_name: config.users.user1.displayName,
    couple_id: 'sandbox-couple-001',
    notification_time: '08:00',
    timezone: 'America/Los_Angeles',
    tone_calibration: config.users.user2.toneCalibration,
    is_onboarded: true,
    love_language: config.users.user2.loveLanguage,
    locale: 'en',
    photo_url: null,
    partner_photo_url: null,
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    ...sandboxTag(),
  });

  console.log(`  Users created: ${user1.uid}, ${user2.uid}`);
  return { user1Id: user1.uid, user2Id: user2.uid };
}

async function getOrCreateUser(
  auth: admin.auth.Auth,
  email: string,
  password: string,
  displayName: string,
): Promise<admin.auth.UserRecord> {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return await auth.createUser({ email, password, displayName });
  }
}
```

- [ ] **Step 2: Create seedCouple.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxConfig, getWeekStart, sandboxTag } from './config';

export async function seedCouple(
  db: FirebaseFirestore.Firestore,
  config: SandboxConfig,
  coupleId: string,
  user1Id: string,
  user2Id: string,
): Promise<void> {
  const startDate = getWeekStart(config.startWeeksAgo);
  const premiumUntil = new Date();
  premiumUntil.setMonth(premiumUntil.getMonth() + 6);

  await db.collection('couples').doc(coupleId).set({
    member_ids: [user1Id, user2Id],
    status: 'active',
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    premium_until: admin.firestore.Timestamp.fromDate(premiumUntil),
    current_pulse_score: 0,
    current_pulse_tier: 'steady',
    current_streak: 0,
    longest_streak: 0,
    last_streak_date: null,
    depth_progress: {
      surface: { completed: 0, threshold: 5 },
      medium: { completed: 0, threshold: 10, unlocked: false },
      deep: { completed: 0, threshold: 20, unlocked: false },
    },
    ...sandboxTag(),
  });

  console.log(`  Couple created: ${coupleId}`);
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd functions && npx tsc --noEmit`
Expected: no new errors from sandbox files

- [ ] **Step 4: Commit**

```bash
git add functions/src/scripts/sandbox/seedUsers.ts functions/src/scripts/sandbox/seedCouple.ts
git commit -m "feat: add sandbox user and couple seed modules"
```

---

### Task 4: seedPromptAssignments

**Files:**
- Create: `functions/src/scripts/sandbox/seedPromptAssignments.ts`

- [ ] **Step 1: Create the module**

This module creates 84 assignment docs (one per day for 12 weeks). It stores generated data on `ctx.assignments` for downstream modules.

```typescript
import * as admin from 'firebase-admin';
import { format } from 'date-fns';
import { SandboxContext, getDayDate, sandboxTag } from './config';

export async function seedPromptAssignments(ctx: SandboxContext): Promise<void> {
  ctx.assignments = [];
  const batch = ctx.db.batch();
  let promptIndex = 0;

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const engagement = ctx.config.engagementByWeek[week];

    for (let day = 0; day < 7; day++) {
      const date = getDayDate(weeksAgo, day);
      if (date > new Date()) continue;

      const promptId = ctx.promptIds[promptIndex % ctx.promptIds.length];
      const prompt = ctx.promptMap.get(promptId)!;
      promptIndex++;

      const ref = ctx.db.collection('prompt_assignments').doc();

      batch.set(ref, {
        couple_id: ctx.coupleId,
        prompt_id: promptId,
        prompt_text: prompt.text,
        prompt_hint: prompt.hint,
        prompt_type: prompt.type,
        requires_conversation: prompt.requires_conversation,
        assigned_date: format(date, 'yyyy-MM-dd'),
        source: 'sandbox',
        delivered_at: admin.firestore.Timestamp.fromDate(date),
        delivery_timezone: 'America/Los_Angeles',
        status: 'delivered',
        completed_at: null,
        response_count: 0,
        first_response_at: null,
        second_response_at: null,
        created_at: admin.firestore.Timestamp.fromDate(date),
        updated_at: admin.firestore.Timestamp.fromDate(date),
        ...sandboxTag(),
      });

      ctx.assignments.push({ id: ref.id, promptId, date, weekIndex: week, engagement });
    }
  }

  await batch.commit();
  console.log(`  ${ctx.assignments.length} assignments created`);
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/scripts/sandbox/seedPromptAssignments.ts
git commit -m "feat: add sandbox prompt assignments module"
```

---

### Task 5: seedResponses

**Files:**
- Create: `functions/src/scripts/sandbox/seedResponses.ts`
- Create: `functions/src/scripts/sandbox/responsePool.ts`

- [ ] **Step 1: Create response text pool**

```typescript
export const RESPONSE_POOL = {
  positive: [
    'I love how you always know when I need a quiet evening together.',
    'The way you laughed at dinner tonight reminded me why I fell for you.',
    'I noticed you made my coffee this morning without me asking. That meant a lot.',
    'Watching you with your friends today made me really proud to be with you.',
    'I keep thinking about what you said last night. You really see me.',
    'Today felt easy in the best way. Just being near you was enough.',
    'You have this way of making ordinary moments feel important.',
    'I felt really connected to you during our walk today.',
    'The way you held my hand during the movie made everything better.',
    'I appreciate how patient you were with me this morning.',
    'Your voice on the phone today made my whole afternoon lighter.',
    'I love that we can sit in silence and it still feels like a conversation.',
    'You asked me how I was feeling and actually waited for the real answer.',
    'Cooking together tonight felt like the best kind of teamwork.',
    'I caught myself smiling thinking about something you said yesterday.',
    'The way you remember small details about my day means more than you know.',
    'I felt safe telling you what was bothering me. Thank you for listening.',
    'You made a hard day so much better just by being you.',
    'I love how we can be silly together without any pretense.',
    'Falling asleep next to you is still my favorite part of every day.',
  ],
  neutral: [
    'We had a pretty normal day, nothing special but it was nice.',
    'I think we could try being more intentional about our evenings.',
    'We were both busy today so we did not get much time together.',
    'It was a regular day. We talked about plans for the weekend.',
    'We watched something together but I do not think either of us was fully present.',
    'I had a lot on my mind today and did not bring much energy home.',
    'We had a fine evening. Nothing stood out but nothing was wrong either.',
    'I think we are in a comfortable routine right now.',
    'We talked mostly about logistics today. Schedules, groceries, that sort of thing.',
    'I was tired and went to bed early. We will catch up tomorrow.',
    'We spent the evening doing our own things in the same room.',
    'It was one of those days where we were both just getting through it.',
    'We made plans to do something fun this weekend. Looking forward to it.',
    'I realized we have not really checked in with each other in a few days.',
    'We had dinner together but the conversation stayed pretty surface level.',
    'I wanted to talk about something but the timing did not feel right.',
    'We are both adjusting to the new schedule. It will settle eventually.',
    'Today was fine. Not great, not bad. Just a Tuesday.',
    'We laughed at something on TV. Small moment but it was nice.',
    'I think we both need a reset. Maybe this weekend.',
  ],
  negative: [
    'I felt a bit disconnected today, like we were just going through motions.',
    'I wish we had more time to actually talk instead of just logistics.',
    'Something felt off between us today and I am not sure what it was.',
    'I wanted to bring something up but I was worried about how it would land.',
    'We snapped at each other over something small. It is not about the dishes.',
    'I felt like I was not being heard when I tried to share my day.',
    'There is a distance between us lately that I do not know how to name.',
    'I went to bed feeling like we left something unresolved.',
    'I miss the way we used to check in with each other more often.',
    'Today was hard. I needed more from you and I did not know how to ask.',
    'We had a disagreement and neither of us handled it well.',
    'I felt alone even though we were in the same room.',
    'I think we are both stressed and it is coming out sideways.',
    'I keep replaying our conversation and wishing I had said it differently.',
    'We need to talk about something but I keep putting it off.',
    'I noticed I was walking on eggshells today and that is not like us.',
    'I felt dismissed when I brought up how I was feeling.',
    'We are out of sync right now. I hope we can find our way back.',
    'I am frustrated but I also know this is temporary.',
    'Today was a reminder that we have to keep showing up even when it is hard.',
  ],
};
```

- [ ] **Step 2: Create seedResponses.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getEngagementLevel, randomBetween, sandboxTag } from './config';
import { RESPONSE_POOL } from './responsePool';

export async function seedResponses(ctx: SandboxContext): Promise<void> {
  if (ctx.assignments.length === 0) {
    throw new Error('No assignments found. Run assignments module first.');
  }
  ctx.responses = [];
  let batch = ctx.db.batch();
  let batchCount = 0;
  const assignmentUpdates = new Map<string, Record<string, unknown>>();

  for (const assignment of ctx.assignments) {
    const engagement = assignment.engagement;
    const level = getEngagementLevel(engagement);
    const sentimentDist = ctx.config.sentimentByEngagement[level];
    const lengthRange = ctx.config.responseLengthByEngagement[level];

    const user1Responds = Math.random() < engagement;
    const user2Responds = Math.random() < engagement;

    const record: ResponseRecord = {
      assignmentId: assignment.id,
      user1Responded: user1Responds,
      user2Responded: user2Responds,
      user1ResponseTime: null,
      user2ResponseTime: null,
    };

    const respondents: Array<{ userId: string; key: 'user1ResponseTime' | 'user2ResponseTime' }> = [];
    if (user1Responds) respondents.push({ userId: ctx.user1Id, key: 'user1ResponseTime' });
    if (user2Responds) respondents.push({ userId: ctx.user2Id, key: 'user2ResponseTime' });

    let responseCount = 0;
    let firstResponseAt: Date | null = null;
    let secondResponseAt: Date | null = null;

    for (const { userId, key } of respondents) {
      const hoursLater = randomBetween(1, 14);
      const responseTime = new Date(assignment.date.getTime() + hoursLater * 60 * 60 * 1000);
      record[key] = responseTime;

      const sentiment = pickSentiment(sentimentDist);
      const text = pickResponseText(sentiment);
      const responseLength = text.length;

      const ref = ctx.db.collection('prompt_responses').doc();
      batch.set(ref, {
        couple_id: ctx.coupleId,
        prompt_id: assignment.promptId,
        assignment_id: assignment.id,
        user_id: userId,
        response_text: '[encrypted]',
        response_text_encrypted: text,
        status: 'submitted',
        emotional_response: sentiment,
        talked_about_it: sentiment === 'positive' && Math.random() < 0.6,
        image_url: null,
        response_length: responseLength,
        time_to_respond_seconds: randomBetween(120, 7200),
        submitted_at: admin.firestore.Timestamp.fromDate(responseTime),
        created_at: admin.firestore.Timestamp.fromDate(responseTime),
        ...sandboxTag(),
      });
      batchCount++;

      responseCount++;
      if (responseCount === 1) firstResponseAt = responseTime;
      if (responseCount === 2) secondResponseAt = responseTime;

      if (batchCount >= 490) {
        await batch.commit();
        batch = ctx.db.batch();
        batchCount = 0;
      }
    }

    // Track assignment updates
    const status = responseCount === 2 ? 'completed' : responseCount === 1 ? 'partial' : 'expired';
    assignmentUpdates.set(assignment.id, {
      status,
      response_count: responseCount,
      first_response_at: firstResponseAt ? admin.firestore.Timestamp.fromDate(firstResponseAt) : null,
      second_response_at: secondResponseAt ? admin.firestore.Timestamp.fromDate(secondResponseAt) : null,
      completed_at: status === 'completed' && secondResponseAt
        ? admin.firestore.Timestamp.fromDate(secondResponseAt) : null,
      updated_at: admin.firestore.Timestamp.fromDate(
        secondResponseAt || firstResponseAt || assignment.date
      ),
    });

    ctx.responses.push(record);
  }

  if (batchCount > 0) await batch.commit();

  // Update assignments with response counts
  let updateBatch = ctx.db.batch();
  let updateCount = 0;
  for (const [id, data] of assignmentUpdates) {
    updateBatch.update(ctx.db.collection('prompt_assignments').doc(id), data);
    updateCount++;
    if (updateCount >= 490) {
      await updateBatch.commit();
      updateBatch = ctx.db.batch();
      updateCount = 0;
    }
  }
  if (updateCount > 0) await updateBatch.commit();

  const total = ctx.responses.filter(r => r.user1Responded).length
    + ctx.responses.filter(r => r.user2Responded).length;
  console.log(`  ${total} responses created`);
}

function pickSentiment(dist: { positive: number; neutral: number; negative: number }): 'positive' | 'neutral' | 'negative' {
  const r = Math.random();
  if (r < dist.positive) return 'positive';
  if (r < dist.positive + dist.neutral) return 'neutral';
  return 'negative';
}

function pickResponseText(sentiment: 'positive' | 'neutral' | 'negative'): string {
  const pool = RESPONSE_POOL[sentiment];
  return pool[Math.floor(Math.random() * pool.length)];
}
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/scripts/sandbox/responsePool.ts functions/src/scripts/sandbox/seedResponses.ts
git commit -m "feat: add sandbox responses module with text pool"
```

---

### Task 6: seedCompletions (with reactions)

**Files:**
- Create: `functions/src/scripts/sandbox/seedCompletions.ts`

- [ ] **Step 1: Create the module**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekId, pickWeighted, sandboxTag } from './config';

export async function seedCompletions(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let count = 0;
  let batchCount = 0;

  for (let i = 0; i < ctx.assignments.length; i++) {
    const assignment = ctx.assignments[i];
    const response = ctx.responses[i];

    if (!response.user1Responded || !response.user2Responded) continue;

    const completedAt = response.user2ResponseTime! > response.user1ResponseTime!
      ? response.user2ResponseTime! : response.user1ResponseTime!;
    const timeToComplete = Math.abs(
      (response.user2ResponseTime!.getTime() - response.user1ResponseTime!.getTime()) / 1000
    );

    const completionData: Record<string, unknown> = {
      assignment_id: assignment.id,
      couple_id: ctx.coupleId,
      prompt_id: assignment.promptId,
      responses: [
        {
          user_id: ctx.user1Id,
          response_text: '[encrypted]',
          response_text_encrypted: 'sandbox response',
          image_url: null,
          submitted_at: admin.firestore.Timestamp.fromDate(response.user1ResponseTime!),
        },
        {
          user_id: ctx.user2Id,
          response_text: '[encrypted]',
          response_text_encrypted: 'sandbox response',
          image_url: null,
          submitted_at: admin.firestore.Timestamp.fromDate(response.user2ResponseTime!),
        },
      ],
      time_to_complete_seconds: Math.round(timeToComplete),
      total_response_length: 0,
      emotional_responses: [],
      talked_about_it: false,
      week: getWeekId(completedAt),
      is_memory_saved: false,
      completed_at: admin.firestore.Timestamp.fromDate(completedAt),
      created_at: admin.firestore.Timestamp.fromDate(completedAt),
      ...sandboxTag(),
    };

    // Add reaction (40% chance)
    if (Math.random() < ctx.config.reactionProbability) {
      const reactorId = Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id;
      const reactionType = pickWeighted([
        { value: 'heart', weight: 55 },
        { value: 'thoughtful', weight: 25 },
        { value: 'laugh', weight: 12 },
        { value: 'teary', weight: 8 },
      ]);
      completionData.reactions = { [reactorId]: reactionType };
    }

    // Doc ID = assignment ID (matches production behavior)
    const ref = ctx.db.collection('prompt_completions').doc(assignment.id);
    batch.set(ref, completionData);
    count++;
    batchCount++;

    if (batchCount >= 490) {
      await batch.commit();
      batch = ctx.db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`  ${count} completions created`);
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/scripts/sandbox/seedCompletions.ts
git commit -m "feat: add sandbox completions module with reactions"
```

---

### Task 7: seedStreaks

**Files:**
- Create: `functions/src/scripts/sandbox/seedStreaks.ts`

- [ ] **Step 1: Create the module**

```typescript
import { format, subDays } from 'date-fns';
import { SandboxContext } from './config';

export async function seedStreaks(ctx: SandboxContext): Promise<void> {
  // Build sorted list of completed dates
  const completedDates: string[] = [];
  for (let i = 0; i < ctx.assignments.length; i++) {
    const response = ctx.responses[i];
    if (response && response.user1Responded && response.user2Responded) {
      completedDates.push(format(ctx.assignments[i].date, 'yyyy-MM-dd'));
    }
  }

  completedDates.sort();

  // Calculate current streak (counting back from today)
  const today = format(new Date(), 'yyyy-MM-dd');
  let currentStreak = 0;
  let checkDate = today;

  while (completedDates.includes(checkDate)) {
    currentStreak++;
    checkDate = format(subDays(new Date(checkDate), 1), 'yyyy-MM-dd');
  }

  // Calculate longest streak
  let longestStreak = 0;
  let runningStreak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = new Date(completedDates[i - 1]);
    const curr = new Date(completedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      runningStreak++;
    } else {
      longestStreak = Math.max(longestStreak, runningStreak);
      runningStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runningStreak);

  const lastStreakDate = completedDates.length > 0 ? completedDates[completedDates.length - 1] : null;

  await ctx.db.collection('couples').doc(ctx.coupleId).update({
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_streak_date: lastStreakDate,
  });

  console.log(`  Streak: current=${currentStreak}, longest=${longestStreak}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/scripts/sandbox/seedStreaks.ts
git commit -m "feat: add sandbox streaks module"
```

---

### Task 8: seedPulseScores and seedCoaching

**Files:**
- Create: `functions/src/scripts/sandbox/seedPulseScores.ts`
- Create: `functions/src/scripts/sandbox/seedCoaching.ts`
- Create: `functions/src/scripts/sandbox/coachingInsights.ts`

- [ ] **Step 1: Create seedPulseScores.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, getWeekId, sandboxTag } from './config';

export async function seedPulseScores(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    const weekId = getWeekId(date);
    const engagement = ctx.config.engagementByWeek[week];
    const tier = ctx.config.coachingTiers[week];
    const score = Math.round(engagement * 100);
    const checkInScore = ctx.config.checkInScores[week];

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('pulse_scores').doc(weekId);

    batch.set(ref, {
      score,
      tier,
      breakdown: {
        emotion_positive: Math.round(engagement * 7),
        emotion_negative: Math.round((1 - engagement) * 3),
        emotion_total: 10,
        completion_rate: engagement,
        one_sided_days: Math.round((1 - engagement) * 7),
        avg_response_length: Math.round(engagement * 120),
        avg_check_in: checkInScore,
      },
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
  }

  // Update couple doc with latest scores
  const lastWeek = ctx.config.startWeeksAgo - 1;
  const lastEngagement = ctx.config.engagementByWeek[lastWeek];
  await ctx.db.collection('couples').doc(ctx.coupleId).update({
    current_pulse_score: Math.round(lastEngagement * 100),
    current_pulse_tier: ctx.config.coachingTiers[lastWeek],
  });

  await batch.commit();
  console.log(`  ${ctx.config.startWeeksAgo} pulse scores created`);
}
```

- [ ] **Step 2: Create static coaching insights data**

```typescript
// coachingInsights.ts
export interface StaticInsight {
  tier: string;
  insightText: string;
  actionType: string;
  actionText: string;
  outcome: 'acted' | 'dismissed' | 'untouched';
}

export const STATIC_INSIGHTS: StaticInsight[] = [
  {
    tier: 'thriving',
    insightText: 'You two have been showing up for each other consistently this week. Your responses show genuine curiosity about each other\'s inner world.',
    actionType: 'conversation',
    actionText: 'Ask about a dream your partner mentioned recently',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'Your rhythm together is solid. You are both responding regularly, which builds trust over time even when the topics feel ordinary.',
    actionType: 'date_night',
    actionText: 'Plan an evening where you try something neither of you has done before',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'This week had a mix of light and deeper moments. That balance is healthy. Consider leaning into the deeper ones when they come.',
    actionType: 'revisit',
    actionText: 'Look back at a response from last week that surprised you',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'You have maintained a steady pace. Sometimes consistency is the most loving thing. Your partner notices when you keep showing up.',
    actionType: 'goal',
    actionText: 'Set a small goal together for the coming week',
    outcome: 'acted',
  },
  {
    tier: 'cooling',
    insightText: 'Things have been quieter between you two this week. That happens. Sometimes a small gesture can shift the energy without forcing a big conversation.',
    actionType: 'goal',
    actionText: 'Set a 5-minute no-phones check-in before bed tonight',
    outcome: 'untouched',
  },
  {
    tier: 'cooling',
    insightText: 'We noticed fewer responses this week. Life gets busy. One small step can reconnect you when words feel hard to find.',
    actionType: 'conversation',
    actionText: 'Share one thing you appreciated about your partner today, even if it was small',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'There are signs of you two finding your way back to each other. The effort shows, even in brief responses.',
    actionType: 'check_in',
    actionText: 'Take a moment to ask how your partner is really doing',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'Your engagement is building again. The responses this week show more warmth and openness than last week.',
    actionType: 'date_night',
    actionText: 'Revisit a place that holds a good memory for both of you',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'You are both bringing more of yourselves to the prompts. That vulnerability is what makes this work.',
    actionType: 'revisit',
    actionText: 'Read through your earliest responses together and notice how you have grown',
    outcome: 'acted',
  },
  {
    tier: 'thriving',
    insightText: 'This has been a strong week. Your responses are longer, more thoughtful, and show real emotional investment.',
    actionType: 'conversation',
    actionText: 'Tell your partner what you admire most about how they have been showing up lately',
    outcome: 'untouched',
  },
  {
    tier: 'thriving',
    insightText: 'The connection between you two is palpable in your responses. You are not just answering prompts, you are having a conversation across time.',
    actionType: 'goal',
    actionText: 'Dream together about something you want to do in the next three months',
    outcome: 'untouched',
  },
  {
    tier: 'thriving',
    insightText: 'Your engagement this week has been remarkable. The depth of your responses shows real emotional investment in each other.',
    actionType: 'date_night',
    actionText: 'Celebrate this momentum with an intentional evening together',
    outcome: 'untouched',
  },
];
```

- [ ] **Step 3: Create seedCoaching.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, getWeekId, randomBetween, sandboxTag } from './config';
import { STATIC_INSIGHTS } from './coachingInsights';

export async function seedCoaching(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    const weekId = getWeekId(date);
    const insight = STATIC_INSIGHTS[week];
    const engagement = ctx.config.engagementByWeek[week];
    const score = Math.round(engagement * 100);

    let dismissedAt: admin.firestore.Timestamp | null = null;
    let actedOn: admin.firestore.Timestamp | null = null;

    if (insight.outcome === 'acted') {
      const daysLater = randomBetween(1, 3);
      const actedDate = new Date(date.getTime() + daysLater * 24 * 60 * 60 * 1000);
      actedOn = admin.firestore.Timestamp.fromDate(actedDate);
    } else if (insight.outcome === 'dismissed') {
      const daysLater = randomBetween(1, 5);
      const dismissedDate = new Date(date.getTime() + daysLater * 24 * 60 * 60 * 1000);
      dismissedAt = admin.firestore.Timestamp.fromDate(dismissedDate);
    }

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('coaching_insights').doc(weekId);

    batch.set(ref, {
      pulse_score: score,
      insight_text: insight.insightText,
      action_type: insight.actionType,
      action_text: insight.actionText,
      created_at: admin.firestore.Timestamp.fromDate(date),
      dismissed_at: dismissedAt,
      acted_on: actedOn,
      ...sandboxTag(),
    });
  }

  await batch.commit();
  console.log(`  ${ctx.config.startWeeksAgo} coaching insights created`);
}
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/scripts/sandbox/seedPulseScores.ts functions/src/scripts/sandbox/coachingInsights.ts functions/src/scripts/sandbox/seedCoaching.ts
git commit -m "feat: add sandbox pulse scores and coaching modules"
```

---

### Task 9: seedChat

**Files:**
- Create: `functions/src/scripts/sandbox/seedChat.ts`
- Create: `functions/src/scripts/sandbox/chatPool.ts`

- [ ] **Step 1: Create chat message pool**

```typescript
export const CHAT_POOL = {
  short: [
    'miss you', 'on my way', 'love you', 'good morning', 'how was it',
    'sounds good', 'almost there', 'perfect', 'same', 'be right back',
    'haha', 'ok deal', 'heading out', 'home soon', 'sleep well',
    'good night', 'running late', 'thank you', 'you up?', 'cute',
    'just saw this', 'yep', 'nice', 'absolutely', 'cannot wait',
    'thinking of you', 'so tired', 'hungry?', 'hello', 'finally',
  ],
  medium: [
    'want to try that new place for dinner?',
    'just thinking about our conversation last night',
    'how is your day going so far?',
    'do we need anything from the store?',
    'that made me think of you',
    'can we talk about something later tonight?',
    'I had the weirdest dream last night',
    'just finished that show you recommended',
    'what do you want to do this weekend?',
    'I told my coworker about us and they thought it was sweet',
    'reminder that you are wonderful',
    'check your email I sent you something',
    'should we invite them over on Saturday?',
    'the weather is so nice right now',
    'I cannot stop thinking about what you said',
    'what are you in the mood for tonight?',
    'my meeting got cancelled so I am free early',
    'did you see the thing I left on the counter?',
    'we should plan something for next month',
    'how did your thing go today?',
  ],
  long: [
    'I had the best lunch today and it reminded me of that cafe we found on vacation last summer',
    'I was telling my friend about the conversation we had and they said we sounded really in sync',
    'I know things have been hectic but I want you to know I appreciate everything you do around here',
    'I saw this couple at the park today and they reminded me of us when we first started dating',
    'I have been thinking about what we talked about and I think you were right about all of it',
    'Just wanted to say that waking up next to you this morning was the highlight of my whole week so far',
    'I found that old photo of us from the trip and it made me smile so hard my coworker asked what was funny',
    'I think we should start that thing we talked about because I really think it would be good for us',
    'Sorry I was distracted earlier I was dealing with something at work but I am fully here now',
    'I overheard the sweetest thing today and immediately wanted to come home and tell you about it',
  ],
};
```

- [ ] **Step 2: Create seedChat.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getDayDate, randomBetween, sandboxTag } from './config';
import { CHAT_POOL } from './chatPool';

export async function seedChat(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let count = 0;
  let batchCount = 0;
  let lastMessageTime: Date | null = null;

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const engagement = ctx.config.engagementByWeek[week];

    for (let day = 0; day < 7; day++) {
      const date = getDayDate(weeksAgo, day);
      if (date > new Date()) continue;

      const { min, max } = ctx.config.chatMessagesPerDay;
      const msgCount = Math.round(min + (max - min) * engagement);

      for (let m = 0; m < msgCount; m++) {
        // Distribute between 7am and 11pm, weighted toward evening
        const hour = 7 + Math.round(Math.random() * Math.random() * 16);
        const minute = randomBetween(0, 59);
        const msgTime = new Date(date);
        msgTime.setHours(hour, minute, 0, 0);

        const senderId = Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id;
        const text = pickChatMessage();

        const ref = ctx.db.collection('couples').doc(ctx.coupleId)
          .collection('messages').doc();

        batch.set(ref, {
          sender_id: senderId,
          text,
          created_at: admin.firestore.Timestamp.fromDate(msgTime),
          ...sandboxTag(),
        });

        count++;
        batchCount++;
        lastMessageTime = msgTime;

        if (batchCount >= 490) {
          await batch.commit();
          batch = ctx.db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) await batch.commit();

  // Set read cursors (2-3 messages behind for unread state)
  if (lastMessageTime) {
    const cursorTime = new Date(lastMessageTime.getTime() - 3 * 60 * 60 * 1000);
    const cursorBatch = ctx.db.batch();
    const cursorsRef = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('chat_read_cursors');

    cursorBatch.set(cursorsRef.doc(ctx.user1Id), {
      last_read_at: admin.firestore.Timestamp.fromDate(cursorTime),
      ...sandboxTag(),
    });
    cursorBatch.set(cursorsRef.doc(ctx.user2Id), {
      last_read_at: admin.firestore.Timestamp.fromDate(cursorTime),
      ...sandboxTag(),
    });
    await cursorBatch.commit();
  }

  console.log(`  ${count} chat messages created`);
}

function pickChatMessage(): string {
  const r = Math.random();
  if (r < 0.4) {
    return CHAT_POOL.short[Math.floor(Math.random() * CHAT_POOL.short.length)];
  } else if (r < 0.85) {
    return CHAT_POOL.medium[Math.floor(Math.random() * CHAT_POOL.medium.length)];
  } else {
    return CHAT_POOL.long[Math.floor(Math.random() * CHAT_POOL.long.length)];
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/scripts/sandbox/chatPool.ts functions/src/scripts/sandbox/seedChat.ts
git commit -m "feat: add sandbox chat module with message pool"
```

---

### Task 10: seedGoals, seedWishlist, seedPhotos, seedCheckIns

**Files:**
- Create: `functions/src/scripts/sandbox/seedGoals.ts`
- Create: `functions/src/scripts/sandbox/seedWishlist.ts`
- Create: `functions/src/scripts/sandbox/seedPhotos.ts`
- Create: `functions/src/scripts/sandbox/seedCheckIns.ts`

- [ ] **Step 1: Create seedGoals.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, randomBetween, sandboxTag } from './config';

export async function seedGoals(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let batchCount = 0;
  let goalCount = 0;
  let completionCount = 0;

  for (const goal of ctx.config.goals) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - goal.createdWeek);
    const goalRef = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('goals').doc();

    const isArchived = goal.completedWeek !== null;
    const archivedAt = isArchived
      ? getWeekStart(ctx.config.startWeeksAgo - goal.completedWeek!)
      : null;

    batch.set(goalRef, {
      name: goal.name,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      archived: isArchived,
      archived_at: archivedAt ? admin.firestore.Timestamp.fromDate(archivedAt) : null,
      ...sandboxTag(),
    });
    goalCount++;
    batchCount++;

    // Add completion records (2-4 per week between creation and archive/now)
    const endWeek = goal.completedWeek ?? ctx.config.startWeeksAgo;
    for (let w = goal.createdWeek; w < endWeek; w++) {
      const completionsThisWeek = randomBetween(2, 4);
      for (let c = 0; c < completionsThisWeek; c++) {
        const completionDate = getWeekStart(ctx.config.startWeeksAgo - w);
        completionDate.setDate(completionDate.getDate() + randomBetween(0, 6));

        const compRef = goalRef.collection('completions').doc();
        batch.set(compRef, {
          completed_by: Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id,
          completed_at: admin.firestore.Timestamp.fromDate(completionDate),
          ...sandboxTag(),
        });
        completionCount++;
        batchCount++;

        if (batchCount >= 490) {
          await batch.commit();
          batch = ctx.db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`  ${goalCount} goals, ${completionCount} completions created`);
}
```

- [ ] **Step 2: Create seedWishlist.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, randomBetween, sandboxTag } from './config';

export async function seedWishlist(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  ctx.config.wishlistItems.forEach((item, i) => {
    const weekCreated = randomBetween(1, ctx.config.startWeeksAgo);
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - weekCreated);
    const createdBy = i % 2 === 0 ? ctx.user1Id : ctx.user2Id;

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('wishlist_items').doc();

    const completedAt = item.toggled
      ? new Date(createdAt.getTime() + randomBetween(7, 30) * 24 * 60 * 60 * 1000)
      : null;

    batch.set(ref, {
      text: item.text,
      created_by: createdBy,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      is_completed: item.toggled,
      completed_at: completedAt ? admin.firestore.Timestamp.fromDate(completedAt) : null,
      ...sandboxTag(),
    });
  });

  await batch.commit();
  console.log(`  ${ctx.config.wishlistItems.length} wishlist items created`);
}
```

- [ ] **Step 3: Create seedPhotos.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, sandboxTag } from './config';

export async function seedPhotos(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (const [i, photo] of ctx.config.photos.entries()) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - photo.weekCreated);
    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('photos').doc();

    batch.set(ref, {
      image_url: photo.imageUrl,
      caption: photo.caption,
      uploaded_by: i % 2 === 0 ? ctx.user1Id : ctx.user2Id,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      ...sandboxTag(),
    });
  }

  for (const milestone of ctx.config.milestones) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - milestone.weekCreated);
    const milestoneDate = milestone.date || createdAt.toISOString().split('T')[0];
    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('milestones').doc();

    batch.set(ref, {
      title: milestone.title,
      category: milestone.category,
      description: milestone.description,
      image_url: null,
      date: milestoneDate,
      created_by: ctx.user1Id,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      ...sandboxTag(),
    });
  }

  await batch.commit();
  console.log(`  ${ctx.config.photos.length} photos, ${ctx.config.milestones.length} milestones created`);
}
```

- [ ] **Step 4: Create seedCheckIns.ts**

```typescript
import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, sandboxTag } from './config';

export async function seedCheckIns(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();
  let count = 0;

  for (let week = 0; week < ctx.config.checkInScores.length; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    // Check-ins happen on Sunday
    date.setDate(date.getDate() + 6);

    const score = ctx.config.checkInScores[week];
    const variance = (Math.random() - 0.5) * 0.6; // +/- 0.3
    const user2Score = Math.round((score + variance) * 10) / 10;

    // Create one doc per user (matches production query pattern: .where('user_id', '==', memberId))
    const ref1 = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('check_ins').doc();
    batch.set(ref1, {
      user_id: ctx.user1Id,
      responses: [{ user_id: ctx.user1Id, score }],
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
    count++;

    const ref2 = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('check_ins').doc();
    batch.set(ref2, {
      user_id: ctx.user2Id,
      responses: [{ user_id: ctx.user2Id, score: user2Score }],
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} check-ins created`);
}
```

- [ ] **Step 5: Commit**

```bash
git add functions/src/scripts/sandbox/seedGoals.ts functions/src/scripts/sandbox/seedWishlist.ts functions/src/scripts/sandbox/seedPhotos.ts functions/src/scripts/sandbox/seedCheckIns.ts
git commit -m "feat: add sandbox goals, wishlist, photos, and check-ins modules"
```

---

### Task 11: clearSandbox

**Files:**
- Create: `functions/src/scripts/sandbox/clearSandbox.ts`

- [ ] **Step 1: Create the module**

```typescript
import * as admin from 'firebase-admin';

export async function clearSandbox(
  db: FirebaseFirestore.Firestore,
  coupleId: string,
  isProduction: boolean,
): Promise<void> {
  console.log(`Clearing sandbox data for couple ${coupleId}...`);

  // Top-level collections
  const topLevelCollections = ['users', 'prompt_assignments', 'prompt_responses', 'prompt_completions'];
  for (const collection of topLevelCollections) {
    await deleteSandboxDocs(db, collection);
  }

  // Couple subcollections
  const subcollections = [
    'coaching_insights', 'pulse_scores', 'messages', 'chat_read_cursors',
    'goals', 'wishlist_items', 'photos', 'milestones', 'check_ins',
  ];

  for (const sub of subcollections) {
    const subRef = db.collection('couples').doc(coupleId).collection(sub);
    const snap = await subRef.where('_sandbox', '==', true).get();

    if (snap.empty) continue;

    // For goals, also delete their completions subcollections
    if (sub === 'goals') {
      for (const doc of snap.docs) {
        const completions = await doc.ref.collection('completions')
          .where('_sandbox', '==', true).get();
        if (!completions.empty) {
          const batch = db.batch();
          completions.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }

    // Chunk subcollection deletes (may exceed 500 for chat messages)
    const subChunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
    for (let i = 0; i < snap.docs.length; i += 500) {
      subChunks.push(snap.docs.slice(i, i + 500));
    }
    for (const chunk of subChunks) {
      const batch = db.batch();
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`  Cleared ${snap.size} docs from ${sub}`);
  }

  // Delete couple doc itself (only if sandbox-tagged and not backfill)
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (coupleDoc.exists && coupleDoc.data()?._sandbox) {
    await coupleDoc.ref.delete();
    console.log('  Deleted couple doc');
  }
}

async function deleteSandboxDocs(db: FirebaseFirestore.Firestore, collection: string): Promise<void> {
  const snap = await db.collection(collection).where('_sandbox', '==', true).get();
  if (snap.empty) return;

  // Batch in chunks of 500
  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < snap.docs.length; i += 500) {
    chunks.push(snap.docs.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log(`  Cleared ${snap.size} docs from ${collection}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/scripts/sandbox/clearSandbox.ts
git commit -m "feat: add sandbox cleanup module"
```

---

### Task 12: Integration test — compile, run against emulator

- [ ] **Step 1: Verify the full project compiles**

Run: `cd functions && npm run build`
Expected: clean compile, no errors

- [ ] **Step 2: Fix any compilation errors**

Address any TypeScript errors from the build.

- [ ] **Step 3: Start emulator and seed prompts**

Run: `firebase emulators:start` (Terminal 1)
Run: `cd functions && npm run seed:emulator` (Terminal 2)
Expected: "Seed complete!" with 162 prompts

- [ ] **Step 4: Run the sandbox seed**

Run: `cd functions && npm run seed:sandbox`
Expected: Output showing each module completing with counts:
```
Connected to emulator
Seeding assignments...
  84 assignments created
Seeding responses...
  ~130 responses created
Seeding completions...
  ~55 completions created
...
Sandbox seeding complete!
```

- [ ] **Step 5: Run the sandbox clear**

Run: `cd functions && npm run seed:sandbox:clear`
Expected: "Sandbox data cleared." with per-collection counts

- [ ] **Step 6: Commit any fixes**

```bash
git add -A functions/src/scripts/sandbox/
git commit -m "fix: resolve sandbox compilation and runtime issues"
```

---

### Task 13: Final verification and commit

- [ ] **Step 1: Run existing tests to verify no regressions**

Run: `cd .. && npm test`
Expected: 25 suites, 147 tests passing

- [ ] **Step 2: Run functions build**

Run: `cd functions && npm run build`
Expected: clean compile

- [ ] **Step 3: Final commit with all sandbox files**

```bash
git add .
git commit -m "feat: complete test sandbox system with 12-week data seeding"
```
