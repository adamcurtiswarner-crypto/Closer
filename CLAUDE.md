# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Stoke — relationship app helping long-term couples stay connected through daily prompts.

## Commands

```bash
# App development (run from app/ directory)
npm start                # Expo dev server
npm test                 # All Jest tests
npm test -- --testPathPattern="useAuth"  # Single test file by name
npm test -- --watch      # Watch mode
npm run typecheck        # TypeScript checking
npm run lint             # ESLint

# Cloud Functions (from functions/ directory)
cd functions && npm run build            # Compile TypeScript
cd functions && npm test                 # Function tests
cd functions && npm run seed:emulator    # Seed prompts to local Firestore
cd functions && npm run seed:emulator:clear  # Clear + reseed

# Firebase
firebase emulators:start                 # Auth :9099, Firestore :8080, Functions :5001, Storage :9199
firebase deploy --only functions         # Deploy all functions
firebase deploy --only functions:deliverDailyPrompts  # Deploy single function

# Admin dashboard (from admin/ directory)
cd admin && npm run dev                  # Next.js dev server

# EAS builds
eas build --profile development --platform ios
eas build --profile preview --platform ios
```

## Architecture

- **Client**: React Native + Expo SDK 52 + Expo Router v4 (file-based routing)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions Node.js 20, FCM, Storage)
- **State**: React Query v5 (server) + Zustand v4 (local) + `useAuth()` hook
- **Styling**: StyleSheet only — NativeWind is installed but DISABLED (see babel.config.js). Do not use `className` in new components.
- **Language**: TypeScript (strict mode)
- **Admin**: Next.js dashboard in `admin/` (separate app, own package.json)

## Project Structure

```
app/                          # Expo Router file-based routes
├── (auth)/                   # Login, signup, forgot password
├── (onboarding)/             # Partner linking, preferences, calibration
└── (app)/                    # Tab bar: today, memories, insights, settings
    ├── chat.tsx              # Hidden tabs (href: null) — accessed via router.push
    ├── wishlist.tsx
    └── resources.tsx
src/
├── components/               # UI components (barrel export via index.ts)
├── hooks/                    # React Query hooks + custom hooks
├── config/                   # Static config (firebase, milestones, challenges, categories)
├── services/                 # analytics, calendar, encryption, imageUpload, notifications
├── types/                    # App-level TypeScript types
├── utils/                    # authErrors, logger
├── i18n/                     # i18next config + locales/en.json (~185 keys)
└── __tests__/                # Jest tests + __mocks__/
functions/                    # Cloud Functions (Node.js 20, TypeScript)
├── src/index.ts              # All function exports
├── src/scripts/              # Seed scripts, BigQuery setup
└── __tests__/                # Function tests
admin/                        # Next.js admin dashboard
```

## Path Aliases

Configured in tsconfig.json, babel.config.js, and jest.config.js:

```
@/*            → src/*
@components    → src/components/index.ts
@components/*  → src/components/*
@hooks/*       → src/hooks/*
@services/*    → src/services/*
@config/*      → src/config/*
@types/*       → src/types/*
@utils/*       → src/utils/*
```

## Key Patterns

### Auth & State
- `useAuth()` → `{ user, firebaseUser, isLoading, isAuthenticated, signIn, signUp, signOut, refreshUser }`
- Call `refreshUser()` after any Firestore user doc update to sync local state
- Firebase exports from `src/config/firebase.ts`: `app, auth, db, functions, storage`
- Emulators auto-connect in `__DEV__` mode

### Data Conventions
- Firestore fields: `snake_case` (e.g., `couple_id`, `photo_url`)
- App TypeScript types: `camelCase` (e.g., `coupleId`, `photoUrl`)
- Canonical type definitions: `../specs/types.ts` (outside app directory)
- Analytics event names: `snake_case`

### Encryption
- Response text stored as `[encrypted]` sentinel in `response_text`, real content in `response_text_encrypted`
- AES-256-CBC, couple key in `expo-secure-store`
- Hooks (`useMemories`, `useTodayPrompt`) decrypt on read — new code reading responses must handle this

### Real-time & Offline
- `useTodayPrompt` uses Firestore `onSnapshot` driving React Query cache (no polling)
- `useChat` also uses `onSnapshot` for real-time messages
- Offline: `useSubmitResponse` queues to AsyncStorage, flushes on reconnect via NetInfo listener
- Presence/typing: `/presence/{coupleId}/members/{userId}` with typing context `'chat' | 'prompt' | null`

### Components
- Barrel export: import from `@components` for common components
- Cards: borderRadius 20, shadow (opacity 0.06, radius 12), 3px `#c97454` accent bar
- Animations: FadeIn/FadeInUp from reanimated, 400-600ms, cascading 80-200ms delays
- Modals: presentationStyle `pageSheet`, warm tint `#fef7f4` on active states

### i18n
- `i18next` + `react-i18next` initialized in `src/i18n/index.ts`, imported in root layout
- Keys in `src/i18n/locales/en.json` — auth screens fully converted, others incremental
- Use `useTranslation()` hook in converted screens

## Design

### Colors
- Primary accent: `#c97454` (warm rust)
- Secondary: `#8b7355` (warm brown)
- Success: `#22c55e`
- Warm tint: `#fef7f4`

### Brand Voice
- **Warm, Quiet, Direct** — never cute, clinical, or urgent
- No exclamation points, no emojis in system text
- Vocabulary: "Prompt" not "exercise", "Memory" not "highlight", "Respond" not "complete"
- Celebrate quietly: "Another moment saved" not "Great job!"

## Firestore Collections

```
/users/{userId}
/couples/{coupleId}
/couple_invites/{inviteCode}
/prompts/{promptId}
/prompt_assignments/{assignmentId}
/prompt_responses/{responseId}
/prompt_completions/{completionId}
/memory_artifacts/{artifactId}
/events/{eventId}
/experiments/{experimentId}
/subscriptions/{subscriptionId}
/couples/{coupleId}/goals/{goalId}
/couples/{coupleId}/goals/{goalId}/completions/
/couples/{coupleId}/wishlist_items/{itemId}
/couples/{coupleId}/messages/{messageId}
/couples/{coupleId}/chat_read_cursors/{userId}
/presence/{coupleId}/members/{memberId}
/admins/{adminId}
/admin_state/ai_generation
```

## Cloud Functions

- **Scheduled**: `deliverDailyPrompts` (every 15 min), `weeklyRecap`, `cleanupDeletedAccounts` (daily 3AM PT), `exportEventsToBigQuery` (daily 4AM PT), `autoGeneratePrompts` (Monday 2AM PT)
- **Callable**: `deleteAccount`, `exportUserData`, `anonymizeMyResponses`, `generateAIPrompts`, `triggerBigQueryExport`, `triggerPromptDelivery`, `migrateEncryptedResponses`
- **Triggers**: `onResponseSubmitted`, `onChatMessageCreated`
- AI generation uses `claude-sonnet-4-5-20250929` via Anthropic API

## Testing

- Framework: Jest + React Native Testing Library
- Tests: `src/__tests__/` (20 files), `functions/__tests__/`
- Mocks: `src/__mocks__/` (react-native-purchases, netinfo, async-storage)
- `babel-jest` transform with `react-native` preset; `ts-jest` for functions

## Environment

- Firebase config via `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`)
- Never commit `.env` — it's gitignored
- `GoogleService-Info.plist` is committed (iOS Firebase config)
- EAS build profiles: `development` (simulator), `preview` (internal), `production`
- `babel.config.js`: `react-native-reanimated/plugin` must be last

## Documentation

Full specs in `../docs/`: PRD, UX flows, architecture, data model, API design, analytics, seed prompts, tone guide, validation plan, twenty-week plan.

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan — don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness
- Ask yourself: "Would a staff engineer approve this?"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary.
