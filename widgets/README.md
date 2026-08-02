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

## EAS credentials (verified 2026-08-02)

Checked via `eas credentials` against the production profile:

- `extra.eas.build.experimental.ios.appExtensions` in app.json declares the
  `StokeWidgets` target / `io.getstoke.app.StokeWidgets` bundle id with the
  App Group entitlement. (The Feb config pointed at a target named
  "widgets" and the pre-rename bundle id — a third reason it never built.)
- An ACTIVE provisioning profile already exists for
  `io.getstoke.app.StokeWidgets` (portal ID MMXNJM227L, expires 2027-02-25),
  alongside the valid distribution cert.
- An App Store Connect API key with ADMIN role is stored with EAS, so the
  next `eas build --non-interactive` can re-validate/regenerate the profile
  (including the App Group capability) without any interactive Apple login.

Remaining build-time caveats:

- If the stored profile lacks the `group.io.getstoke.app` capability, EAS
  will fix it automatically at build time via the ASC key — nothing manual.
- `react-native-shared-group-preferences` is unmaintained and untested on
  the New Architecture (expo-doctor exclusion documented in package.json).
  If the first device build misbehaves, the fallback is a 20-line custom
  Expo module writing to App Group UserDefaults.
