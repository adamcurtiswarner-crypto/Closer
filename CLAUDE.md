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
npx tsc --noEmit         # TypeScript checking
npx expo-doctor          # Check dependency health

# Cloud Functions (from functions/ directory)
cd functions && npm run build            # Compile TypeScript
cd functions && npm test                 # Function tests
cd functions && npm run seed:emulator    # Seed prompts to local Firestore
cd functions && npm run seed:emulator:clear  # Clear + reseed

# Firebase
firebase emulators:start                 # Auth :9099, Firestore :8080, Functions :5001, Storage :9199
firebase deploy --only functions --project stoke-5f762
firebase deploy --only firestore:rules --project stoke-5f762
firebase deploy --only firestore:indexes --project stoke-5f762
firebase functions:log --project stoke-5f762 -n 20  # View recent logs

# Local device builds (via Xcode — no EAS credits needed)
npx expo prebuild --platform ios --clean  # Generate ios/ directory
open ios/Stoke.xcworkspace                # Open in Xcode, hit Play
# For simulator: npx expo run:ios

# EAS builds (uses build credits)
eas build --profile production --platform ios --non-interactive
eas submit --platform ios --id <build-id> --non-interactive

# Admin dashboard (from admin/ directory)
cd admin && npm run dev                  # Next.js dev server
```

## Architecture

- **Client**: React Native 0.83.6 + Expo SDK 55 + Expo Router v4 (file-based routing)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions Node.js 22, FCM, Storage)
- **State**: React Query v5 (server) + Zustand v4 (local) + `useAuth()` hook
- **Styling**: StyleSheet only — NativeWind is DISABLED. Do not use `className`.
- **Language**: TypeScript (strict mode)
- **Build**: EAS Build with Xcode 26.0, iOS 26 SDK
- **Admin**: Next.js dashboard in `admin/` (separate app, own package.json)
- **Firebase SDK**: firebase@12.13.0 (web SDK, NOT @react-native-firebase)

## Project Structure

```
app/                          # Expo Router file-based routes
├── (auth)/                   # Login, signup, forgot password, terms, privacy
├── (onboarding)/             # Partner linking, preferences, calibration
└── (app)/                    # v1 tab bar: today (landing), explore ("Categories"), settings
    ├── home.tsx              # Hidden for v1 via src/config/features.ts flags (href: null).
    ├── memories.tsx          # All hidden features are flagged off, not deleted —
    ├── insights.tsx          # flip the flag in features.ts to restore post-launch.
    ├── wishlist.tsx
    ├── games.tsx
    ├── date-nights.tsx
    ├── coaching.tsx
    └── resources.tsx
src/
├── components/               # UI components (barrel export via index.ts)
│   ├── LoveLanguageModal.tsx  # Extracted from ProfileCard
│   └── AnniversaryPicker.tsx  # Extracted from ProfileCard
├── hooks/                    # React Query hooks + custom hooks
├── config/                   # firebase, theme, milestones, challenges, categories
│   └── theme.ts              # Design tokens: colors, spacing, radius, shadow, typography
├── services/                 # analytics, calendar, imageUpload, notifications
├── types/                    # App-level TypeScript types
├── utils/                    # authErrors, logger, haptics
├── i18n/                     # i18next config + locales/en.json (~206 keys)
└── __tests__/                # Jest tests + __mocks__/
functions/                    # Cloud Functions (Node.js 22, TypeScript)
├── src/                      # 7 domain modules (prompts, triggers, users, coaching, admin, notifications, analytics)
├── src/index.ts              # Thin re-export barrel (7 lines)
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
- **Firebase Auth**: uses `firebase/auth` web SDK (firebase@12). Older versions (v10) crash with "Component auth has not been registered yet" on SDK 55.
- Emulators connect only when `EXPO_PUBLIC_USE_EMULATORS=true` (not automatic in dev)

### Data Conventions
- Firestore fields: `snake_case` (e.g., `couple_id`, `photo_url`)
- App TypeScript types: `camelCase` (e.g., `coupleId`, `photoUrl`)
- Canonical type definitions: `../specs/types.ts` (outside app directory)
- Analytics event names: `snake_case`

### Real-time & Offline
- `useTodayPrompt` uses Firestore `onSnapshot` driving React Query cache (no polling)
- `useChat` also uses `onSnapshot` for real-time messages
- Offline: `useSubmitResponse` queues to AsyncStorage, flushes on reconnect via NetInfo listener
- Presence/typing: `/presence/{coupleId}/members/{userId}` with typing context `'chat' | 'prompt' | null`
- Today screen auto-triggers prompt delivery if no assignment exists (no button tap needed)

### Components
- Barrel export: import from `@components` for common components
- Cards: borderRadius 20, shadow (opacity 0.06, radius 12), 3px `#c97454` accent bar
- Animations: FadeIn/FadeInUp from reanimated, 400-600ms, cascading 80-200ms delays
- Modals: presentationStyle `pageSheet`, warm tint `#fef7f4` on active states
- Touch targets: minimum 44px (enforced across all components)
- Button: has `accessibilityRole="button"`

### Design Tokens (src/config/theme.ts)
- Colors: `colors.accent.primary`, `colors.surface.background`, `colors.text.primary`, etc.
- Spacing: `spacing.xs(4)` through `spacing.xxl(48)`
- Radius: `radius.sm(8)`, `radius.md(12)`, `radius.lg(16)`, `radius.xl(20)`
- Shadows: `shadow.card`, `shadow.cardSubtle`, `shadow.accent`
- Card presets: `card.container`, `card.accentBar`

### i18n
- `i18next` + `react-i18next` initialized in `src/i18n/index.ts`, imported in root layout
- Keys in `src/i18n/locales/en.json` — auth + home screens fully converted, others incremental
- Use `useTranslation()` hook in all screens

## Design

### Colors
- Primary accent: `#c97454` (warm rust)
- Secondary: `#8b7355` (warm brown)
- Success: `#22c55e`
- Warm tint: `#fef7f4`
- Brand purple: `#490f5f` (goals only)

### Brand Voice
- **Warm, Quiet, Direct** — never cute, clinical, or urgent
- No exclamation points, no emojis in system text
- No ALL CAPS text — use sentence case
- Vocabulary: "Prompt" not "exercise", "Memory" not "highlight", "Respond" not "complete"
- Celebrate quietly: "Another moment saved" not "Great job!"

### Typography
- Headings: `Alexandria-SemiBold` with `fontWeight: '600'`
- Body: `Inter-Regular` with `fontWeight: '400'`
- Labels: `Inter-Medium` with `fontWeight: '500'`
- Emphasis: `Inter-SemiBold` with `fontWeight: '600'`
- CRITICAL: fontWeight must match fontFamily (e.g., SemiBold = '600', not '700' or 'bold')

## Firestore Collections

```
/users/{userId}
/couples/{coupleId}
/couple_invites/{inviteCode}
/prompts/{promptId}
/prompt_assignments/{assignmentId}
/prompt_responses/{responseId}
/prompt_completions/{completionId}
/follow_up_templates/{templateId}   # category-level follow-up questions (deepener/repair/divergence)
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

v1 scope: several scheduled push functions are disabled in the export barrel (`functions/src/index.ts`) because their features are hidden — see `functions/V1-SCOPE.md` for the list and the deploy-time `functions:delete` commands. The follow-up trigger system lives in `functions/src/followUps.ts` (branch logic: divergence > repair > deepener) wired into `onResponseSubmitted`.

- **Scheduled**: `deliverDailyPrompts` (every 15 min), `sendWeeklyRecaps` (Sun 6PM PT), `sendResponseReminders` (hourly), `deliverCheckIn` (Sun 10AM PT), `dateNightReminder` (daily 9AM PT), `computeRelationshipPulse` (Mon 3AM PT), `autoGeneratePrompts` (Mon 2AM PT), `checkStreakBreaks` (daily 4:30AM PT), `expireStalePrompts` (daily 4AM PT), `cleanupDeletedAccounts` (daily 3AM PT), `exportEventsToBigQuery` (daily 4AM PT), `detectChurnRisk`, `aggregateWeeklyMetrics`, `cleanupCoachingInsights`, `graduatePrompts`
- **Callable**: `deleteAccount`, `exportUserData`, `anonymizeMyResponses`, `generateAIPrompts`, `triggerBigQueryExport`, `triggerPromptDelivery`, `generateCoachingInsight`, `triggerPulseComputation`, `managePrompt`, `getPromptPerformance`, `createExperiment`, `assignExperimentVariant`, `getDashboardMetrics`, `revenueCatWebhook`
- **Triggers**: `onResponseSubmitted`, `onReactionAdded`, `onCheckInSubmitted`, `onChatMessageCreated`
- AI generation uses `claude-sonnet-4-5-20250929` via Anthropic API

## Testing

- Framework: Jest + React Native Testing Library
- Preset: `@react-native/jest-preset` (not `react-native` — changed in RN 0.85)
- Tests: `src/__tests__/` (24 suites, 140 tests), `functions/__tests__/`
- Mocks: `src/__mocks__/` (react-native-purchases, netinfo, async-storage, react-native-reanimated, react-native-worklets, sentry, google-signin, expo-apple-authentication)
- `babel-jest` transform; `ts-jest` for functions

## Environment

- Firebase config via `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`)
- Never commit `.env` — it's gitignored
- `GoogleService-Info.plist` is committed (iOS Firebase config)
- EAS build profiles: `development` (simulator), `preview` (internal), `production`
- `babel.config.js`: `react-native-reanimated/plugin` must be last
- `.easignore` excludes `ios/`, `android/`, `node_modules/`, `.playwright-cli/`
- `.npmrc` has `legacy-peer-deps=true` for SDK 55 compatibility

---

## Development Rules

### 1. Context Window Discipline
- Break work into focused modules before generating code
- One task per subagent for focused execution
- If output starts contradicting earlier work, stop and re-read the source files
- Never generate more than one file's worth of changes without verifying

### 2. Error Handling is Mandatory
- Every Cloud Function callable must have try/catch with user-facing error messages
- Every Firestore write in client code must have catch with Alert feedback
- Every API call must handle failure — no naked calls
- Validate at system boundaries: user input, API responses, deep link params

### 3. No Duplicate Logic
- Check existing hooks, utils, and services before creating new ones
- Search the codebase (grep/glob) before writing any utility function
- Theme tokens exist in `src/config/theme.ts` — use them, don't hardcode
- One source of truth for types, colors, spacing, shadows

### 4. Types First
- Write TypeScript interfaces before implementation
- No `any` types except in test mocks and third-party interop
- Firestore data always typed at read boundary (snake_case → camelCase)
- Run `npx tsc --noEmit` after every change

### 5. Verify Dependencies
- Run `npx expo-doctor` after installing or upgrading packages
- Check actual installed version: `node -e "console.log(require('pkg/package.json').version)"`
- Never assume a package API — check the .d.ts or docs
- Known issue: Firebase web SDK v10 breaks on SDK 55. Must use v12+.

### 6. Security Checklist (Before Every Deploy)
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] All Cloud Functions check `context.auth`
- [ ] Admin functions check `/admins/{uid}` collection
- [ ] Rate limiting on data export (1/24hr)
- [ ] Error messages don't leak sensitive data
- [ ] `ITSAppUsesNonExemptEncryption` is accurate in app.json

---

## Workflow

### Plan First
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan — don't keep pushing

### Verify Before Done
- Never mark a task complete without proving it works
- Run `npx tsc --noEmit` + `npm test` after every change
- For Cloud Functions: `cd functions && npm run build` to verify
- Ask yourself: "Would a staff engineer approve this?"

### Autonomous Bug Fixing
- When given a bug report: check logs first (`firebase functions:log`), then fix
- Point at the actual error, not the symptom
- Test the fix, don't just reason about it

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary.

## Known Issues / Gotchas

- **iOS 26 + Release builds**: React Native 0.83 TurboModule crash on physical devices. Debug builds work. Tracked at facebook/react-native#54859.
- **Firebase Auth on SDK 55**: Must use firebase@12+. Older versions throw "Component auth has not been registered yet".
- **Firestore indexes**: Queries with composite filters need indexes deployed. Check `firebase functions:log` for "FAILED_PRECONDITION" errors and create missing indexes.
- **expo-updates**: `runtimeVersion` must change when native code changes (SDK upgrades). Use static version string, not `appVersion` policy.
- **Font weight/family**: Always match — `Alexandria-SemiBold` = `'600'`, `Inter-Medium` = `'500'`. Mismatches cause inconsistent rendering.
