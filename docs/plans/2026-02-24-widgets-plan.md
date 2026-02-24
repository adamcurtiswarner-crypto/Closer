# Home Screen Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 iOS home screen widgets (Streak, Prompt Status, Anniversary) that read data from the React Native app via shared UserDefaults.

**Architecture:** `react-native-widget-extension` Expo config plugin adds the widget extension target and App Group entitlement. `react-native-shared-group-preferences` writes data from React Native to shared UserDefaults. Swift WidgetKit code reads from UserDefaults on a 30-minute timeline refresh. `reloadAllTimelines()` forces a refresh after data writes.

**Tech Stack:** Swift/SwiftUI (WidgetKit), react-native-widget-extension, react-native-shared-group-preferences, Expo config plugin

---

### Task 1: Install dependencies and configure app.json

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app.json`

**Implementation:**

1. Install the two packages:

```bash
npm install react-native-widget-extension react-native-shared-group-preferences
```

2. Update `app.json` to add the config plugin, App Group entitlement, and EAS extension config. Add `react-native-widget-extension` to the plugins array with `groupIdentifier` and `widgetsFolder` options. Add App Group entitlement to the main app's iOS config. Add the EAS experimental app extension config:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.stoke.app",
      "buildNumber": "1",
      "googleServicesFile": "./GoogleService-Info.plist",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.stoke.app"
        ]
      },
      "infoPlist": {
        "UIBackgroundModes": [
          "remote-notification",
          "remote-notification"
        ],
        "ITSAppUsesNonExemptEncryption": false
      },
      "associatedDomains": [
        "applinks:stoke.app",
        "applinks:stoke.app"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./src/assets/notification-icon.png",
          "color": "#ffffff"
        }
      ],
      "expo-localization",
      [
        "react-native-widget-extension",
        {
          "widgetsFolder": "widgets",
          "groupIdentifier": "group.com.stoke.app",
          "deploymentTarget": "16.0"
        }
      ]
    ],
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "ed4dbe48-8597-4a51-8580-3402ea568d2f",
        "build": {
          "experimental": {
            "ios": {
              "appExtensions": [
                {
                  "targetName": "widgets",
                  "bundleIdentifier": "com.stoke.app.widgets",
                  "entitlements": {
                    "com.apple.security.application-groups": [
                      "group.com.stoke.app"
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

The key changes to `app.json`:
- Added `ios.entitlements` with App Group
- Added `react-native-widget-extension` plugin to plugins array
- Added `extra.eas.build.experimental.ios.appExtensions` for EAS credential management

**Verify:** `npm ls react-native-widget-extension react-native-shared-group-preferences` shows both installed.

**Commit:** `git add package.json package-lock.json app.json && git commit -m "feat: install widget dependencies and configure app.json"`

---

### Task 2: Create widget data bridge service

**Files:**
- Create: `src/services/widgetBridge.ts`

**Context:** This service writes widget data to the shared App Group UserDefaults so the Swift widget can read it. It also calls `reloadAllTimelines()` to force the widget to refresh immediately after a data write.

**Implementation:**

Create `src/services/widgetBridge.ts`:

```typescript
import { Platform } from 'react-native';

// Types for widget data
interface WidgetData {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
  lastUpdated: string;
}

const APP_GROUP = 'group.com.stoke.app';
const STORAGE_KEY = 'widgetData';

/**
 * Update the iOS home screen widget data.
 * Writes to shared UserDefaults and triggers a widget timeline reload.
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    // Dynamic imports to avoid crashes on Android or when native modules aren't linked
    const SharedGroupPreferences = (await import('react-native-shared-group-preferences')).default;
    await SharedGroupPreferences.setItem(STORAGE_KEY, data, APP_GROUP);

    // Force widget to refresh immediately
    const { reloadAllTimelines } = await import('react-native-widget-extension');
    reloadAllTimelines();
  } catch (error) {
    // Widget bridge failures should never crash the app
    console.warn('[WidgetBridge] Failed to update widget data:', error);
  }
}

/**
 * Build widget data from app state.
 * Call this on Today screen mount and after state changes.
 */
export function buildWidgetData({
  currentStreak,
  daysAsCouple,
  userName,
  partnerName,
  promptStatus,
  promptText,
  anniversaryDaysLeft,
  anniversaryIsToday,
}: {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
}): WidgetData {
  return {
    currentStreak,
    daysAsCouple,
    userName,
    partnerName,
    promptStatus,
    promptText,
    anniversaryDaysLeft,
    anniversaryIsToday,
    lastUpdated: new Date().toISOString(),
  };
}
```

**Verify:** Run `npm run typecheck` — no new errors. (Note: `react-native-shared-group-preferences` and `react-native-widget-extension` may not have types — if so, create a `src/types/widget-modules.d.ts` with declarations):

```typescript
declare module 'react-native-shared-group-preferences' {
  const SharedGroupPreferences: {
    setItem(key: string, value: any, appGroup: string): Promise<void>;
    getItem(key: string, appGroup: string): Promise<any>;
  };
  export default SharedGroupPreferences;
}

declare module 'react-native-widget-extension' {
  export function reloadAllTimelines(): void;
  export function reloadTimelines(ofKind: string): void;
}
```

**Commit:** `git add src/services/widgetBridge.ts src/types/widget-modules.d.ts && git commit -m "feat: add widget data bridge service"`

---

### Task 3: Create Swift widget data model and timeline provider

**Files:**
- Create: `widgets/WidgetData.swift`
- Create: `widgets/StokeTimelineProvider.swift`

**Context:** These are the shared Swift files used by all 3 widgets. `WidgetData` reads from UserDefaults (the JSON blob written by React Native). `StokeTimelineProvider` supplies timeline entries to WidgetKit on a 30-minute refresh schedule.

**Implementation:**

Create `widgets/WidgetData.swift`:

```swift
import Foundation

struct WidgetData: Codable {
    let currentStreak: Int
    let daysAsCouple: Int
    let userName: String
    let partnerName: String
    let promptStatus: String
    let promptText: String
    let anniversaryDaysLeft: Int
    let anniversaryIsToday: Bool
    let lastUpdated: String

    static let appGroupId = "group.com.stoke.app"
    static let storageKey = "widgetData"

    static func load() -> WidgetData {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let jsonString = defaults.string(forKey: storageKey),
              let jsonData = jsonString.data(using: .utf8),
              let data = try? JSONDecoder().decode(WidgetData.self, from: jsonData)
        else {
            return .placeholder
        }
        return data
    }

    static let placeholder = WidgetData(
        currentStreak: 0,
        daysAsCouple: 0,
        userName: "You",
        partnerName: "Partner",
        promptStatus: "none",
        promptText: "",
        anniversaryDaysLeft: -1,
        anniversaryIsToday: false,
        lastUpdated: ""
    )
}
```

Create `widgets/StokeTimelineProvider.swift`:

```swift
import WidgetKit

struct StokeWidgetEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct StokeTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> StokeWidgetEntry {
        StokeWidgetEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (StokeWidgetEntry) -> Void) {
        let entry = StokeWidgetEntry(date: Date(), data: WidgetData.load())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StokeWidgetEntry>) -> Void) {
        let data = WidgetData.load()
        let entry = StokeWidgetEntry(date: Date(), data: data)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
```

**Commit:** `git add widgets/WidgetData.swift widgets/StokeTimelineProvider.swift && git commit -m "feat: add Swift widget data model and timeline provider"`

---

### Task 4: Create Streak Widget (systemSmall)

**Files:**
- Create: `widgets/StreakWidget.swift`

**Context:** Small widget showing current streak (flame + number) and days together (heart + number) with partner names at the bottom. Uses Stoke brand colors.

**Implementation:**

Create `widgets/StreakWidget.swift`:

```swift
import SwiftUI
import WidgetKit

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak & Days")
        .description("See your streak and days together")
        .supportedFamilies([.systemSmall])
    }
}

struct StreakWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text("\u{1F525}")
                    .font(.system(size: 20))
                Text("\(entry.data.currentStreak)")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundColor(accent)
            }
            Text("day streak")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(secondary)

            Spacer()

            HStack(spacing: 6) {
                Text("\u{2764}\u{FE0F}")
                    .font(.system(size: 16))
                Text("\(entry.data.daysAsCouple)")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(accent)
            }
            Text("days together")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(secondary)

            Spacer()

            Text("\(entry.data.userName) & \(entry.data.partnerName)")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(muted)
                .lineLimit(1)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(bg)
    }
}
```

**Commit:** `git add widgets/StreakWidget.swift && git commit -m "feat: add Streak & Days Together widget (systemSmall)"`

---

### Task 5: Create Prompt Status Widget (systemMedium)

**Files:**
- Create: `widgets/PromptWidget.swift`

**Context:** Medium widget showing Stoke logo, prompt status ("Your turn", "Waiting for Sarah", "Both responded"), prompt text preview (2-line truncation), and streak + days footer. Status color changes based on state.

**Implementation:**

Create `widgets/PromptWidget.swift`:

```swift
import SwiftUI
import WidgetKit

struct PromptWidget: Widget {
    let kind = "PromptWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            PromptWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Prompt")
        .description("See today's prompt and status")
        .supportedFamilies([.systemMedium])
    }
}

struct PromptWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let dark = Color(red: 0.110, green: 0.098, blue: 0.090)
    private let body2 = Color(red: 0.341, green: 0.325, blue: 0.306)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let success = Color(red: 0.133, green: 0.773, blue: 0.369)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)

    private var statusText: String {
        switch entry.data.promptStatus {
        case "your_turn":
            return "Your turn \u{2192}"
        case "waiting_partner":
            return "Waiting for \(entry.data.partnerName)"
        case "complete":
            return "Both responded \u{2713}"
        default:
            return "New prompt coming soon"
        }
    }

    private var statusColor: Color {
        switch entry.data.promptStatus {
        case "your_turn": return accent
        case "complete": return success
        default: return muted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\u{1F3D5}\u{FE0F}")
                    .font(.system(size: 16))
                Text("Stoke")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(dark)
                Spacer()
                Text(statusText)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(statusColor)
            }

            if !entry.data.promptText.isEmpty {
                Text("\u{201C}\(entry.data.promptText)\u{201D}")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(body2)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Check back later for today's prompt")
                    .font(.system(size: 13))
                    .foregroundColor(muted)
            }

            Spacer()

            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Text("\u{1F525}")
                        .font(.system(size: 12))
                    Text("\(entry.data.currentStreak)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(secondary)
                    Text("streak")
                        .font(.system(size: 11))
                        .foregroundColor(muted)
                }
                HStack(spacing: 4) {
                    Text("\u{2764}\u{FE0F}")
                        .font(.system(size: 12))
                    Text("\(entry.data.daysAsCouple)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(secondary)
                    Text("days")
                        .font(.system(size: 11))
                        .foregroundColor(muted)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(bg)
    }
}
```

**Commit:** `git add widgets/PromptWidget.swift && git commit -m "feat: add Daily Prompt Status widget (systemMedium)"`

---

### Task 6: Create Anniversary Widget (systemSmall)

**Files:**
- Create: `widgets/AnniversaryWidget.swift`

**Context:** Small widget with 3 states: countdown (big number + "days until your anniversary"), anniversary day (celebration), no anniversary set (prompt to set in Settings).

**Implementation:**

Create `widgets/AnniversaryWidget.swift`:

```swift
import SwiftUI
import WidgetKit

struct AnniversaryWidget: Widget {
    let kind = "AnniversaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            AnniversaryWidgetView(entry: entry)
        }
        .configurationDisplayName("Anniversary")
        .description("Countdown to your anniversary")
        .supportedFamilies([.systemSmall])
    }
}

struct AnniversaryWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)
    private let warmBg = Color(red: 0.996, green: 0.969, blue: 0.957)

    var body: some View {
        if entry.data.anniversaryIsToday {
            VStack(spacing: 8) {
                Text("\u{1F389}")
                    .font(.system(size: 32))
                Text("Happy\nAnniversary!")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(accent)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(warmBg)
        } else if entry.data.anniversaryDaysLeft > 0 {
            VStack(spacing: 4) {
                Text("\u{1F4C5}")
                    .font(.system(size: 28))
                Text("\(entry.data.anniversaryDaysLeft)")
                    .font(.system(size: 36, weight: .heavy))
                    .foregroundColor(accent)
                Text("days until your\nanniversary")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(bg)
        } else {
            VStack(spacing: 8) {
                Text("\u{1F4C5}")
                    .font(.system(size: 28))
                Text("Set your\nanniversary\nin Settings")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(bg)
        }
    }
}
```

**Commit:** `git add widgets/AnniversaryWidget.swift && git commit -m "feat: add Anniversary Countdown widget (systemSmall)"`

---

### Task 7: Create Widget Bundle entry point

**Files:**
- Create: `widgets/StokeWidgetBundle.swift`

**Context:** This is the `@main` entry point that registers all 3 widgets with WidgetKit. It must be marked with `@main` and conform to `WidgetBundle`.

**Implementation:**

Create `widgets/StokeWidgetBundle.swift`:

```swift
import SwiftUI
import WidgetKit

@main
struct StokeWidgetBundle: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        PromptWidget()
        AnniversaryWidget()
    }
}
```

**Commit:** `git add widgets/StokeWidgetBundle.swift && git commit -m "feat: add widget bundle entry point"`

---

### Task 8: Integrate widget bridge into Today screen

**Files:**
- Modify: `app/(app)/today.tsx`

**Context:** The Today screen has access to all the data the widgets need: streak, couple data, prompt status, and anniversary. We need to call `updateWidgetData()` when the screen mounts and when prompt status changes. The screen already uses `useStreak`, `useCouple`, and prompt assignment data.

**Implementation:**

1. Add import at top of `today.tsx`:

```typescript
import { updateWidgetData, buildWidgetData } from '@/services/widgetBridge';
import { getAnniversaryCountdown } from '@/config/milestones';
```

2. Add a `useEffect` inside the `TodayScreen` component that runs whenever key data changes. Place it after the existing hooks but before the JSX return. The exact hook dependencies will depend on what variables are available — use the streak, couple data, user, and prompt assignment status:

```typescript
// Update home screen widgets
useEffect(() => {
  if (!user || !couple) return;

  const anniversary = couple.anniversaryDate
    ? getAnniversaryCountdown(couple.anniversaryDate)
    : null;

  // Determine prompt status for widget
  let promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete' = 'none';
  let promptText = '';

  if (assignment) {
    const userResponded = assignment.respondedUserIds?.includes(user.id);
    const isComplete = assignment.status === 'complete';

    if (isComplete) {
      promptStatus = 'complete';
    } else if (!userResponded) {
      promptStatus = 'your_turn';
    } else {
      promptStatus = 'waiting_partner';
    }
    promptText = assignment.promptText || '';
  }

  const data = buildWidgetData({
    currentStreak: streak?.current ?? 0,
    daysAsCouple: insights?.daysAsCouple ?? Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / 86400000),
    userName: user.displayName || 'You',
    partnerName: user.partnerName || 'Partner',
    promptStatus,
    promptText,
    anniversaryDaysLeft: anniversary?.days ?? -1,
    anniversaryIsToday: anniversary?.isToday ?? false,
  });

  updateWidgetData(data);
}, [user, couple, assignment, streak]);
```

**Important:** The exact variable names (`assignment`, `streak`, `couple`, `insights`, etc.) depend on how they're named in the existing `TodayScreen` component. Read the file first and use the correct variable names from the existing hooks.

If `insights` or `daysAsCouple` aren't readily available on the Today screen, compute it from `couple.createdAt`:

```typescript
const daysAsCouple = couple?.createdAt
  ? Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / 86400000)
  : 0;
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/\(app\)/today.tsx src/services/widgetBridge.ts && git commit -m "feat: integrate widget bridge into Today screen"`

---

### Task 9: Final verification

**Files:** None (verification only)

**Steps:**

1. Run `npm run typecheck` — confirm no new type errors (pre-existing errors are fine)
2. Run `npm test` — confirm all 92 tests pass
3. Review git log for clean commits
4. Verify all widget Swift files exist in `widgets/` folder
5. Verify `app.json` has the config plugin and App Group entitlement

**Note:** Full widget testing requires building with `npx expo prebuild --platform ios` and running in Xcode simulator. The widgets will appear in the iOS widget picker after the app is installed.

**Commit:** No commit needed.
