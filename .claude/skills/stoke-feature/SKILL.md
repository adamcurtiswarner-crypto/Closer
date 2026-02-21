---
name: stoke-feature
description: Plan and build a new feature for the Stoke relationship app. Use when adding new functionality, screens, hooks, or components.
argument-hint: [feature description]
---

You are building a feature for **Stoke**, a React Native relationship app that helps long-term couples stay connected through daily prompts.

## Project Structure

```
app/
├── app/              # Expo Router file-based routes
│   ├── (auth)/       # Login, signup, forgot password
│   ├── (onboarding)/ # Partner linking, preferences, tone calibration
│   └── (app)/        # Main tabs: today, memories, insights, settings, wishlist
├── src/
│   ├── components/   # Reusable components (cards, modals, headers)
│   ├── hooks/        # React Query + custom hooks
│   ├── config/       # Static config (milestones, challenges, categories)
│   ├── services/     # Firebase services (analytics, imageUpload)
│   ├── types/        # TypeScript types
│   └── utils/        # Utilities
├── functions/        # Firebase Cloud Functions (Node.js, TypeScript)
└── specs/types.ts    # Canonical Firestore type definitions (in parent dir)
```

## Architecture

- **Framework**: React Native + Expo Router (file-based routing)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, FCM, Storage)
- **State**: React Query (server state) + Zustand (local state) + `useAuth()` hook
- **Styling**: StyleSheet (no Tailwind in RN) — primary accent `#c97454`, secondary `#8b7355`

## Key Patterns

- `useAuth()` returns `{ user, firebaseUser, isLoading, isAuthenticated, signIn, signUp, signOut, refreshUser }`
- Call `refreshUser()` after any Firestore user doc update to sync local state
- Firebase config at `src/config/firebase.ts` — exports `app, auth, db, functions, storage`
- User doc fields: snake_case in Firestore, camelCase in app types
- Analytics: `logEvent(name, properties)` from `src/services/analytics.ts`

## Design System

- Cards: borderRadius 20, shadow (0.06 opacity, radius 12), 3px `#c97454` accent bar at top
- Animations: FadeIn/FadeInUp from react-native-reanimated, 400-600ms duration, cascading 80-200ms delays
- Modals: page-sheet presentation, warm tint `#fef7f4` on active elements
- Typography: clean, no emojis in system text

## Brand Voice

- **Warm, Quiet, Direct** — never cute, clinical, or urgent
- No exclamation points, no emojis in UI
- "Prompt" not "exercise", "Memory" not "highlight", "Respond" not "complete"
- Celebrate quietly: "Another moment saved" not "Great job!"

## When Building a Feature

1. Read existing code in `src/hooks/`, `src/components/`, and relevant `app/` routes first
2. Create hooks in `src/hooks/` using React Query for Firestore data
3. Create components in `src/components/` following the card/accent bar pattern
4. Add routes in `app/(app)/` for new screens
5. Add analytics events via `logEvent()` for key user actions
6. Follow existing naming conventions — check similar files for patterns

## Existing Hooks

`useStreak`, `useNetworkStatus`, `useSubscription`, `useExperiment`, `useFeatureFlag`, `useUpdatePromptFrequency`, `useGoals`, `useCreateGoal`, `useToggleGoalCompletion`, `useArchiveGoal`, `useActivateWeeklyChallenge`, `useWeeklyChallenge`, `useInsights`, `useCouple`, `useUpdateAnniversaryDate`, `useWishlistItems`, `useAddWishlistItem`, `useToggleWishlistItem`, `useDeleteWishlistItem`

## Existing Components

`Paywall`, `OfflineBanner`, `ConnectionHeader`, `StreakRing`, `GoalTracker`, `AddGoalModal`, `ProfileCard`, `InsightCard`, `WishlistCard`, `AddWishlistModal`

Build the feature described in: $ARGUMENTS
