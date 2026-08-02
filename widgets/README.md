# StokeWidgets — iOS home-screen widget extension

Restored 2026-08-02 (Hooked audit; founder approval). Originally added
2026-02-24 (PR #5), disabled 2026-02-25 to unblock the first TestFlight
build, and stubbed the next day. The restoration fixed three defects that
meant the original never actually worked:

1. The plugin requires `Module.swift` / `Attributes.swift` / `Info.plist`
   in this folder — none existed, so `expo prebuild` failed outright.
2. The old bridge imported `reloadAllTimelines` from
   `react-native-widget-extension`, whose JS API (v0.2.0) has no such
   export — only Live Activity functions. Our `Module.swift` now defines
   it natively; the bridge reaches it via `requireNativeModule`.
3. App group was still `group.com.stoke.app` (pre-rename bundle id).
   Everything now uses `group.io.getstoke.app`.

## What ships

- **PromptWidget** (systemMedium) — today's question, status (your turn /
  waiting for {partner} / both answered), days together.
- **AnniversaryWidget** (systemSmall) — countdown, quiet today state, or
  set-in-Settings hint.
- **No StreakWidget** — deliberately deleted. Streaks are hidden in v1 and
  the anti-guilt doctrine bans streak surfaces. Do not re-add without a
  founder decision.

Brand: `StokeBrand.swift` mirrors `src/config/theme.ts` (the only truth);
copy follows the brand voice — no emoji, no exclamation points, prompt
text unquoted.

## Data flow

`app/(app)/today.tsx` → `buildWidgetData()` / `updateWidgetData()`
(`src/services/widgetBridge.ts`) → App Group UserDefaults
(`group.io.getstoke.app`, key `widgetData`) → `WidgetData.load()` (Swift)
→ 30-minute timeline. The bridge's JSON shape and the Swift `WidgetData`
struct must change together. `currentStreak` is written but never rendered.

## Verified locally (2026-08-02)

- `npx expo prebuild --platform ios --clean` generates the `StokeWidgets`
  target (bundle id `io.getstoke.app.StokeWidgets`).
- `xcodebuild -scheme StokeWidgets CODE_SIGNING_ALLOWED=NO` compiles the
  .appex.
- `xcodebuild -project Pods/Pods.xcodeproj -target
  ReactNativeWidgetExtension` compiles `Module.swift` against
  ExpoModulesCore.

## Before the next EAS build (founder checklist)

- The extension target needs its own provisioning: run
  `eas credentials` (iOS) and confirm a profile exists for
  `io.getstoke.app.StokeWidgets` with the App Group capability — this is
  the exact step that broke the first TestFlight build in February.
- App Store Connect: the app group `group.io.getstoke.app` must be
  registered to the team (7F8CUS39VP) and enabled on BOTH identifiers.
- `react-native-shared-group-preferences` is unmaintained and untested on
  the New Architecture (expo-doctor exclusion documented in package.json).
  If the first device build misbehaves, the fallback is a 20-line custom
  Expo module writing to App Group UserDefaults.
