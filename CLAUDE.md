# Stoke App

Relationship app helping long-term couples stay connected through daily prompts.

## Quick Start

```bash
npm start              # Expo dev server
npm test               # Jest tests
npm run typecheck      # TypeScript checking
npm run lint           # ESLint

# Cloud Functions (from functions/ directory)
cd functions && npm run build         # Compile
cd functions && npm run seed:emulator # Seed prompts to local Firestore
cd functions && npm test              # Function tests

# Firebase emulators
firebase emulators:start              # Auth :9099, Firestore :8080, Functions :5001, Storage :9199
```

## Architecture

- **Client**: React Native + Expo SDK 50 + Expo Router (file-based routing)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, FCM, Storage)
- **State**: React Query (server) + Zustand (local) + `useAuth()` hook
- **Styling**: StyleSheet — no Tailwind in main app (NativeWind disabled, see babel.config.js)
- **Language**: TypeScript (strict mode)

## Project Structure

```
app/                          # Expo Router file-based routes
├── (auth)/                   # Login, signup, forgot password
├── (onboarding)/             # Partner linking, preferences, calibration
└── (app)/                    # Tab bar: today, memories, insights, settings
    └── wishlist.tsx          # Hidden tab (href: null), accessed via router.push
src/
├── components/               # UI components (barrel export via index.ts)
├── hooks/                    # React Query hooks + custom hooks
├── config/                   # Static config (firebase, milestones, challenges, categories)
├── services/                 # analytics, encryption, imageUpload, notifications
├── types/                    # App-level TypeScript types
└── utils/                    # authErrors, logger
functions/                    # Cloud Functions (Node.js 20, TypeScript)
├── src/index.ts              # Function exports
└── src/scripts/              # Seed scripts
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

### Analytics
- `logEvent(name, properties)` from `src/services/analytics.ts`
- Event names: `snake_case` (e.g., `prompt_completed`, `goal_created`)

### Components
- Barrel export: import from `@components` for common components
- Cards: borderRadius 20, shadow (opacity 0.06, radius 12), 3px `#c97454` accent bar
- Animations: FadeIn/FadeInUp from reanimated, 400-600ms, cascading 80-200ms delays
- Modals: presentationStyle `pageSheet`, warm tint `#fef7f4` on active states

### Hooks
All server-state hooks use React Query. Create new hooks in `src/hooks/` following existing patterns.

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
```

## Testing

- Framework: Jest + React Native Testing Library
- Tests live in `src/__tests__/`
- Mocks in `src/__mocks__/` (react-native-purchases, netinfo, async-storage)
- Run: `npm test`

## Environment

- Firebase config via `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`)
- Never commit `.env` — it's gitignored
- EAS build profiles: `development` (simulator), `preview` (internal), `production`

## Documentation

Full specs live in `../docs/`:
- `01-PRD.md` — Product requirements, wedge user, success metrics (WMEER)
- `02-UX-FLOWS.md` — Screen specs, navigation, state transitions
- `03-ARCHITECTURE.md` — Tech stack decisions, security, scaling
- `04-DATA-MODEL.md` — All Firestore schemas with TypeScript interfaces
- `05-API-DESIGN.md` — Cloud Function endpoints, request/response formats
- `06-ANALYTICS.md` — Event taxonomy, WMEER calculation, retention queries
- `08-SEED-PROMPTS.md` — 40 prompts, design principles, rotation algorithm
- `09-CONTENT-TONE-GUIDE.md` — Brand voice, microcopy, words to use/avoid
- `10-VALIDATION-PLAN.md` — Alpha/beta gates, interview protocols
- `12-TWENTY-WEEK-PLAN.md` — Build phases, milestones, gate criteria
