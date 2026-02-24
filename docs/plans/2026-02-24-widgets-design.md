# Home Screen Widgets — Design

**Goal:** Add iOS home screen widgets showing streak/days together, daily prompt status, and anniversary countdown — putting the relationship in the user's face without opening the app.

**Approach:** Native Swift WidgetKit extension with Expo config plugin. Data flows from React Native → shared UserDefaults (App Group) → Swift widget reads on timeline refresh. iOS only (current Expo SDK 50, no upgrade needed).

---

## Architecture

Three parts:
- **Widget Extension** — Native Swift/SwiftUI code rendering 3 widgets. Separate iOS target bundled with the app.
- **Shared Data Layer** — App Group (`group.com.stoke.app`) shared UserDefaults between main app and widget extension.
- **Data Bridge** — Expo module or `react-native-shared-group-preferences` letting React Native write widget data. Calls `WidgetCenter.shared.reloadAllTimelines()` after writes.

Data flow: React Native app → Shared UserDefaults → Swift Widget reads on timeline refresh.

## Widget 1: Streak + Days Together (systemSmall)

- Flame icon + streak count (large, `#c97454`)
- Heart + days together count
- Partner names at bottom ("Adam & Sarah")
- Background: `#fafaf9`, tap opens Today screen

## Widget 2: Daily Prompt Status (systemMedium)

- Stoke logo mark + status label ("Your turn", "Waiting for Sarah", "Both responded")
- Prompt text preview (2-line truncation)
- Streak + days together in footer row
- States: no prompt (gray), your turn (accent), waiting for partner, both done (green check)
- Tap opens Today screen

## Widget 3: Anniversary Countdown (systemSmall)

- Calendar icon + big day count in `#c97454`
- "days until your anniversary" subtitle
- On the day: "Happy Anniversary" with warm `#fef7f4` background
- No anniversary set: "Set your anniversary in Settings"

## Shared Data Shape

```json
{
  "currentStreak": 12,
  "daysAsCouple": 847,
  "userName": "Adam",
  "partnerName": "Sarah",
  "promptStatus": "your_turn",
  "promptText": "What's something your partner did recently...",
  "anniversaryDaysLeft": 23,
  "anniversaryIsToday": false,
  "lastUpdated": "2026-02-24T10:00:00Z"
}
```

## Data Update Triggers

- App foreground (Today screen mounts)
- After submitting a response
- After partner responds (onSnapshot)

## Files

- New: `ios/StokeWidget/` — Swift widget extension
- New: `src/services/widgetBridge.ts` — React Native → shared UserDefaults
- New: `plugins/withStokeWidget.js` — Expo config plugin (widget target + App Group entitlement)
- Modify: `app.json` — add config plugin
- Modify: `app/(app)/today.tsx` — call widget bridge on mount + state changes
