---
name: stoke-ui
description: Build or modify UI screens, components, and layouts for the Stoke app. Use for visual design, layout changes, new screens, or component work.
argument-hint: [screen or component description]
---

You are building UI for **Stoke**, a React Native relationship app.

## Navigation Structure

```
app/
├── _layout.tsx              # Root layout
├── index.tsx                # Entry redirect
├── (auth)/                  # Unauthenticated
│   ├── welcome.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (onboarding)/            # Authenticated, not onboarded
│   ├── invite-partner.tsx
│   ├── accept-invite.tsx
│   ├── preferences.tsx
│   ├── tone-calibration.tsx
│   └── ready.tsx
└── (app)/                   # Main app (tab bar)
    ├── _layout.tsx          # Tab navigator
    ├── today.tsx            # Home — prompt card, goals, wishlist
    ├── memories.tsx         # Saved memories timeline
    ├── insights.tsx         # Stats, milestones, love languages
    ├── settings.tsx         # Profile card, preferences, account
    └── wishlist.tsx         # Full wishlist (hidden tab, href: null)
```

## Design System

### Colors
- **Primary accent**: `#c97454` (warm rust) — accent bars, progress bars, active states
- **Secondary**: `#8b7355` (warm brown)
- **Success green**: `#22c55e` — completion states
- **Warm tint**: `#fef7f4` — active pill backgrounds, subtle highlights
- **Background**: white cards on light gray

### Cards
```javascript
{
  backgroundColor: '#fff',
  borderRadius: 20,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
  // 3px accent bar at top (via View with height: 3, backgroundColor: '#c97454', borderTopLeftRadius: 20, borderTopRightRadius: 20)
}
```

### Animations
- Library: `react-native-reanimated`
- Entry: `FadeIn` / `FadeInUp` (400-600ms duration)
- Cascading: 80-200ms delay increments between elements
- Modals: page-sheet presentation style

### Typography
- Clean, no emojis in system text
- Sentence case for all UI text
- No exclamation points ever

## Component Patterns

### Existing Components
- `ConnectionHeader` — User + partner avatars (72px) with initials fallback, passed `userPhotoUrl`/`partnerPhotoUrl`
- `GoalTracker` — Card with weekly challenge, goal rows, progress bars, checkboxes
- `WishlistCard` — Compact preview (3 items, count badge, "See all" link)
- `ProfileCard` — Avatar circles with camera overlay, editable names, email, anniversary, love language
- `InsightCard` — Reusable card wrapper with accent bar + staggered animations
- `StreakRing` — Circular progress indicator
- `AddGoalModal` / `AddWishlistModal` — Page-sheet modals with form inputs

### Modal Pattern
- Use `presentationStyle: 'pageSheet'` for modals
- Warm tint on active states (`#fef7f4` background)
- Pinned bottom buttons with consistent spacing
- Staggered entry animations

### Today Screen Integration
Cards appear in this order with cascading delays:
- ConnectionHeader → StreakRing → Prompt Card → GoalTracker → WishlistCard
- Delays vary by prompt state (no-prompt, waiting, complete)

## Brand Voice in UI

- **Warm, Quiet, Direct**
- "Prompt" not "exercise", "Memory" not "highlight"
- Empty states: helpful not apologetic ("Your saved memories will appear here")
- No periods on buttons or single-line labels
- Contractions: "You're" not "You are"
- Times: "7pm" not "7:00 PM"

Build: $ARGUMENTS
