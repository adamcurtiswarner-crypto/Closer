# Design Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all emoji-based UI with Phosphor icons, create a centralized theme file with color tokens and typography scale, and fix skeleton loading inconsistencies.

**Architecture:** Install `phosphor-react-native` + `react-native-svg`, create `src/config/theme.ts` as the single source of truth for colors/typography, create `src/components/Icon.tsx` as a thin wrapper over Phosphor, then sweep every file replacing emoji with Icon components and hardcoded colors/fonts with theme tokens.

**Tech Stack:** phosphor-react-native, react-native-svg, React Native StyleSheet

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install phosphor-react-native and react-native-svg**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && npx expo install react-native-svg phosphor-react-native
```

**Step 2: Verify install**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && node -e "require('phosphor-react-native'); console.log('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install phosphor-react-native and react-native-svg"
```

---

### Task 2: Create theme.ts — color tokens and typography scale

**Files:**
- Create: `src/config/theme.ts`

**Step 1: Create the theme file**

```typescript
import { TextStyle } from 'react-native';

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Surface
  surface: {
    background: '#fafaf9',
    card: '#ffffff',
    warmTint: '#fef7f4',
    warmTintDeep: '#fceee7',
  },

  // Text
  text: {
    primary: '#1c1917',
    secondary: '#57534e',
    tertiary: '#78716c',
    muted: '#a8a29e',
    inverse: '#ffffff',
  },

  // Accent
  accent: {
    primary: '#c97454',
    primaryLight: '#e9b8a3',
    secondary: '#8b7355',
    secondaryLight: '#b8a88a',
  },

  // Gradients (start, end)
  gradient: {
    warmGlow: ['#fef7f4', '#fceee7'] as const,
    ember: ['#c97454', '#d4956f'] as const,
    sunrise: ['#fceee7', '#fef7f4'] as const,
  },

  // Semantic
  semantic: {
    success: '#22c55e',
    successLight: '#dcfce7',
    destructive: '#ef4444',
    destructiveLight: '#fef2f2',
    neutral: '#f59e0b',
    neutralLight: '#fefce8',
  },

  // Border
  border: {
    default: '#e7e5e4',
    subtle: '#f5f5f4',
    accent: '#c97454',
  },

  // Skeleton
  skeleton: {
    base: '#e7e5e4',
    shimmer: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
  } as TextStyle,

  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
  } as TextStyle,

  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  } as TextStyle,

  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  } as TextStyle,

  caption: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  } as TextStyle,

  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

// ============================================
// ICON SIZES
// ============================================

export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;
```

**Step 2: Verify types**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit 2>&1 | grep theme
```
Expected: no errors mentioning theme.ts

**Step 3: Commit**

```bash
git add src/config/theme.ts
git commit -m "feat: add theme.ts with color tokens, typography scale, and icon sizes"
```

---

### Task 3: Create Icon.tsx wrapper component

**Files:**
- Create: `src/components/Icon.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create the Icon component**

```typescript
import React from 'react';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import {
  Flame,
  Target,
  Sparkle,
  GameController,
  Coffee,
  HourglassMedium,
  Camera,
  SunDim,
  Cloud,
  CloudRain,
  Binoculars,
  Lock,
  CalendarBlank,
  Heart,
  Trophy,
  ChatCircle,
  CaretRight,
  CaretLeft,
  Check,
  Checks,
  X,
  ArrowRight,
  ArrowUp,
  Star,
  GearSix,
  Warning,
  SortAscending,
  SortDescending,
  DeviceMobileCamera,
  ImageSquare,
  ArrowLeft,
  ChatText,
  MapPin,
  Path,
  Handshake,
  TwoHearts,
  MilkyWay,
} from 'phosphor-react-native';
import { iconSize } from '@/config/theme';

const iconMap = {
  flame: Flame,
  target: Target,
  sparkle: Sparkle,
  'game-controller': GameController,
  coffee: Coffee,
  hourglass: HourglassMedium,
  camera: Camera,
  'sun-dim': SunDim,
  cloud: Cloud,
  'cloud-rain': CloudRain,
  binoculars: Binoculars,
  lock: Lock,
  calendar: CalendarBlank,
  heart: Heart,
  trophy: Trophy,
  'chat-circle': ChatCircle,
  'chat-text': ChatText,
  'caret-right': CaretRight,
  'caret-left': CaretLeft,
  check: Check,
  checks: Checks,
  x: X,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp,
  star: Star,
  gear: GearSix,
  warning: Warning,
  'sort-ascending': SortAscending,
  'sort-descending': SortDescending,
  'device-mobile': DeviceMobileCamera,
  image: ImageSquare,
  'map-pin': MapPin,
  path: Path,
  handshake: Handshake,
  'two-hearts': TwoHearts,
  'milky-way': MilkyWay,
} as const;

export type IconName = keyof typeof iconMap;

interface IconComponentProps {
  name: IconName;
  size?: keyof typeof iconSize | number;
  color?: string;
  weight?: PhosphorIconProps['weight'];
}

export function Icon({ name, size = 'md', color = '#78716c', weight = 'light' }: IconComponentProps) {
  const IconComponent = iconMap[name];
  const resolvedSize = typeof size === 'number' ? size : iconSize[size];
  return <IconComponent size={resolvedSize} color={color} weight={weight} />;
}
```

**Step 2: Add export to barrel file**

Add to `src/components/index.ts`:
```typescript
// Icons
export { Icon } from './Icon';
export type { IconName } from './Icon';
```

**Step 3: Verify types**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit 2>&1 | grep -E "Icon\.|icon" | head -5
```
Expected: no new errors

**Step 4: Commit**

```bash
git add src/components/Icon.tsx src/components/index.ts
git commit -m "feat: add Icon wrapper component over phosphor-react-native"
```

---

### Task 4: Replace tab bar emoji icons

**Files:**
- Modify: `app/(app)/_layout.tsx`

**Step 1: Replace tab bar icons**

Replace the emoji-based `tabBarIcon` functions with Phosphor `Icon` components:

- Memories tab: `♡` (text) → `<Icon name="heart" size="md" color={color} weight={focused ? 'fill' : 'light'} />`
- Insights tab: `✦` (text) → `<Icon name="sparkle" size="md" color={color} weight={focused ? 'fill' : 'light'} />`
- Settings tab: `⚙` (text) → `<Icon name="gear" size="md" color={color} weight={focused ? 'regular' : 'light'} />`

Import `Icon` from `@components` at top of file. Remove the inline `<Text>` icon wrappers.

**Step 2: Verify in simulator**

Run: `npx expo start --ios`
Expected: Tab bar shows crisp SVG icons instead of emoji text

**Step 3: Commit**

```bash
git add app/\(app\)/_layout.tsx
git commit -m "feat: replace tab bar emoji icons with Phosphor icons"
```

---

### Task 5: Replace emoji in ConnectionHeader and StreakRing

**Files:**
- Modify: `src/components/ConnectionHeader.tsx`
- Modify: `src/components/StreakRing.tsx`

**Step 1: ConnectionHeader**

Replace `🔥` flame emoji (line ~73) with `<Icon name="flame" size="xs" color="#c97454" weight="fill" />`.

Import `Icon` from `@components`.

**Step 2: StreakRing**

- Replace `🔥` (line ~53, active streak) with `<Icon name="flame" size={16} color="#c97454" weight="fill" />`
- Replace `⚫` (line ~53, inactive streak) with `<Icon name="flame" size={16} color="#d6d3d1" weight="light" />`
- Replace `✓` checkmark (line ~77, weekly dots) with `<Icon name="check" size="xs" color="#22c55e" weight="bold" />`

**Step 3: Verify types**

Run: `cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit 2>&1 | grep -E "ConnectionHeader|StreakRing"`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/ConnectionHeader.tsx src/components/StreakRing.tsx
git commit -m "feat: replace emoji with Phosphor icons in ConnectionHeader and StreakRing"
```

---

### Task 6: Replace emoji in GoalTracker and WishlistCard

**Files:**
- Modify: `src/components/GoalTracker.tsx`
- Modify: `src/components/WishlistCard.tsx`

**Step 1: GoalTracker**

- Header `🎯` (line ~74) → `<Icon name="target" size="sm" color="#c97454" weight="regular" />`
- Delete/archive `×` (line ~210) → `<Icon name="x" size="xs" color="#a8a29e" />`

**Step 2: WishlistCard**

- Header `✨` (line ~66) → `<Icon name="sparkle" size="sm" color="#c97454" weight="regular" />`
- Empty state `🌟` (line ~81) → `<Icon name="star" size="lg" color="#c97454" weight="light" />`
- "See all" `→` (line ~111) → `<Icon name="arrow-right" size="xs" color="#c97454" />`
- Default category `💫` (line ~153) → `<Icon name="sparkle" size="sm" color="#8b7355" />`

**Step 3: Commit**

```bash
git add src/components/GoalTracker.tsx src/components/WishlistCard.tsx
git commit -m "feat: replace emoji with Phosphor icons in GoalTracker and WishlistCard"
```

---

### Task 7: Replace emoji in DateNightCard and GameLauncher

**Files:**
- Modify: `src/components/DateNightCard.tsx`
- Modify: `src/components/GameLauncher.tsx`
- Modify: `src/components/GameComplete.tsx`
- Modify: `src/components/TruthOrDare.tsx`
- Modify: `src/components/WouldYouRather.tsx`
- Modify: `src/components/HowWellDoYouKnowMe.tsx`
- Modify: `src/components/PassPhone.tsx`

**Step 1: DateNightCard**

- Header `🎲` (line ~19) → `<Icon name="game-controller" size="sm" color="#c97454" weight="regular" />`
- Hero area: replace the 3-emoji row (`🤔 🧠 🔥` lines ~26-28) with a single `<Icon name="game-controller" size="xl" color="#c97454" weight="light" />`
- Play button `→` (line ~38) → `<Icon name="arrow-right" size="sm" color="#ffffff" />`

**Step 2: GameLauncher**

- `🤔` (line ~15, Would You Rather) → `<Icon name="chat-circle" size="lg" color="#c97454" />`
- `🧠` (line ~22, How Well) → `<Icon name="target" size="lg" color="#8b7355" />`
- `🔥` (line ~29, Truth or Dare) → `<Icon name="flame" size="lg" color="#c97454" weight="fill" />`
- `›` chevron (line ~57) → `<Icon name="caret-right" size="sm" color="#a8a29e" />`

**Step 3: Game screens**

- `GameComplete.tsx`: `✨` (line ~26) → `<Icon name="sparkle" size="xl" color="#c97454" weight="fill" />`
- `TruthOrDare.tsx`: `🤔` (line ~152) → `<Icon name="chat-circle" size="md" color="#c97454" />`, `🔥` (line ~163) → `<Icon name="flame" size="md" color="#c97454" weight="fill" />`, `✕` (line ~184) → `<Icon name="x" size="md" color="#78716c" />`
- `WouldYouRather.tsx`: `✕` (line ~192) → `<Icon name="x" size="md" color="#78716c" />`
- `HowWellDoYouKnowMe.tsx`: `✕` (line ~236) → `<Icon name="x" size="md" color="#78716c" />`
- `PassPhone.tsx`: `📱` (line ~20) → `<Icon name="device-mobile" size="xl" color="#c97454" weight="light" />`

**Step 4: Commit**

```bash
git add src/components/DateNightCard.tsx src/components/GameLauncher.tsx src/components/GameComplete.tsx src/components/TruthOrDare.tsx src/components/WouldYouRather.tsx src/components/HowWellDoYouKnowMe.tsx src/components/PassPhone.tsx
git commit -m "feat: replace emoji with Phosphor icons in game components"
```

---

### Task 8: Replace emoji in ProfileCard

**Files:**
- Modify: `src/components/ProfileCard.tsx`

**Step 1: Replace all emoji**

- Camera overlay `📷` (lines ~209, ~254) → `<Icon name="camera" size="xs" color="#ffffff" weight="fill" />`
- Anniversary `📅` (line ~291) → `<Icon name="calendar" size="md" color="#c97454" />`
- Love language `❤️` (line ~314) → `<Icon name="heart" size="md" color="#c97454" weight="fill" />`
- Language checkmark `✓` (line ~372) → `<Icon name="check" size="sm" color="#c97454" weight="bold" />`

**Step 2: Commit**

```bash
git add src/components/ProfileCard.tsx
git commit -m "feat: replace emoji with Phosphor icons in ProfileCard"
```

---

### Task 9: Replace emoji in ChatBubble, ChatInput, and PromptCard

**Files:**
- Modify: `src/components/ChatBubble.tsx`
- Modify: `src/components/ChatInput.tsx`
- Modify: `src/components/PromptCard.tsx`

**Step 1: ChatBubble**

- Pending `⏳` (line ~21) → `<Icon name="hourglass" size={10} color="#a8a29e" />`
- Read `✓✓` (line ~24) → `<Icon name="checks" size={10} color="#c97454" weight="bold" />`
- Sent `✓` (line ~27) → `<Icon name="check" size={10} color="#a8a29e" weight="bold" />`

**Step 2: ChatInput**

- Remove image `✕` (line ~46) → `<Icon name="x" size="xs" color="#ffffff" weight="bold" />`
- Camera `📷` (line ~57) → `<Icon name="camera" size="md" color="#78716c" />`
- Send `↑` (line ~77) → `<Icon name="arrow-up" size="sm" color="#ffffff" weight="bold" />`

**Step 3: PromptCard**

Replace the `CATEGORY_STYLES` emoji icons (lines ~14-58) with Phosphor icon names. Change the icon rendering from `<Text>{style.icon}</Text>` to `<Icon name={style.icon} ... />`. Map:
- `🗺️` Geography → `'map-pin'`
- `🛤️` Navigation → `'path'`
- `🤝` Partnership → `'handshake'`
- `✨` Wonder → `'sparkle'`
- `🌌` Dreams → `'milky-way'`
- `💕` Love → `'two-hearts'`
- `💬` Communication → `'chat-text'`

Also replace `→` CTA arrow (line ~116) → `<Icon name="arrow-right" size="sm" color="#ffffff" />`

**Step 4: Commit**

```bash
git add src/components/ChatBubble.tsx src/components/ChatInput.tsx src/components/PromptCard.tsx
git commit -m "feat: replace emoji with Phosphor icons in chat and prompt components"
```

---

### Task 10: Replace emoji in remaining components

**Files:**
- Modify: `src/components/QueryError.tsx`
- Modify: `src/components/OfflineBanner.tsx`
- Modify: `src/components/AnimatedCheckbox.tsx`
- Modify: `src/components/Paywall.tsx`
- Modify: `src/components/AddGoalModal.tsx`
- Modify: `src/components/AddWishlistModal.tsx`
- Modify: `src/components/CompletionMoment.tsx`
- Modify: `src/components/ResourceCard.tsx`
- Modify: `src/components/InsightCard.tsx`

**Step 1: Replace each**

- `QueryError.tsx`: `☁️` (line ~16) → `<Icon name="cloud" size="lg" color="#a8a29e" />`
- `OfflineBanner.tsx`: `⚠` (line ~52) → `<Icon name="warning" size="sm" color="#f59e0b" weight="fill" />`
- `AnimatedCheckbox.tsx`: `✓` (line ~71) → `<Icon name="check" size={14} color="#ffffff" weight="bold" />`
- `Paywall.tsx`: `✓` (line ~67) → `<Icon name="check" size="sm" color="#22c55e" weight="bold" />`
- `AddGoalModal.tsx`: `→` (line ~213) → `<Icon name="arrow-right" size="sm" color="#ffffff" />`
- `AddWishlistModal.tsx`: `→` (line ~204) → `<Icon name="arrow-right" size="sm" color="#ffffff" />`
- `CompletionMoment.tsx`: `✨` (line ~104) → `<Icon name="sparkle" size="lg" color="#c97454" weight="fill" />`
- `ResourceCard.tsx`: `›` (line ~48) → `<Icon name="caret-right" size="sm" color="#a8a29e" />`. Also change icon prop from emoji to `<Icon>` — the `resource.icon` field currently holds emoji strings. Render the icon prop directly if it's a ReactNode, or fall back to a default `<Icon name="star" />`.
- `InsightCard.tsx`: If the `icon` prop is currently an emoji string, update callers (insights.tsx) to pass `<Icon>` components instead.

**Step 2: Commit**

```bash
git add src/components/QueryError.tsx src/components/OfflineBanner.tsx src/components/AnimatedCheckbox.tsx src/components/Paywall.tsx src/components/AddGoalModal.tsx src/components/AddWishlistModal.tsx src/components/CompletionMoment.tsx src/components/ResourceCard.tsx src/components/InsightCard.tsx
git commit -m "feat: replace emoji with Phosphor icons in remaining components"
```

---

### Task 11: Replace emoji in app screens

**Files:**
- Modify: `app/(app)/today.tsx`
- Modify: `app/(app)/insights.tsx`
- Modify: `app/(app)/wishlist.tsx`
- Modify: `app/(app)/games.tsx`
- Modify: `app/(app)/resources.tsx`
- Modify: `app/(onboarding)/waiting-partner.tsx`
- Modify: `app/(onboarding)/tone-calibration.tsx`
- Modify: `app/(onboarding)/preferences.tsx`

**Step 1: today.tsx**

- Empty state `☄️` (line ~307) → `<Icon name="coffee" size="xl" color="#c97454" weight="light" />`
- Remove image `✕` (line ~399) → `<Icon name="x" size="xs" color="#ffffff" weight="bold" />`
- Attach photo `📷` (line ~404) → `<Icon name="camera" size="md" color="#78716c" />`
- Submit arrow `→` (line ~435) → `<Icon name="arrow-right" size="sm" color="#ffffff" />`
- Partner waiting `⏳` (line ~501) → `<Icon name="hourglass" size={16} color="#a8a29e" />`
- Emotion buttons: `☀️` (line ~582) → `<Icon name="sun-dim" size="md" />`, `☁️` (line ~583) → `<Icon name="cloud" size="md" />`, `🌧️` (line ~584) → `<Icon name="cloud-rain" size="md" />` — colors set by selected state
- Streak celebration `🔥` (line ~619) → `<Icon name="flame" size="md" color="#c97454" weight="fill" />`

**Step 2: insights.tsx**

- Empty state `🔭` (line ~66) → `<Icon name="binoculars" size="xl" color="#c97454" weight="light" />`
- Milestones `🏆` (line ~242) → `<Icon name="trophy" size="md" color="#c97454" />`
- Lock `🔒` (line ~264) → `<Icon name="lock" size={10} color="#a8a29e" weight="fill" />`
- Anniversary `🎉` (line ~301) → remove or replace with `<Icon name="sparkle" size="sm" color="#c97454" weight="fill" />`
- Anniversary countdown `📅` (line ~305) → `<Icon name="calendar" size="sm" color="#c97454" />`
- Love languages `❤️` (line ~321) → `<Icon name="heart" size="md" color="#c97454" weight="fill" />`
- Emotional journey `☀️` (line ~358) → `<Icon name="sun-dim" size="md" color="#f59e0b" />`
- Communication `💬` (line ~392) → `<Icon name="chat-circle" size="md" color="#c97454" />`
- Prompt categories `🎯` (line ~423) → `<Icon name="target" size="md" color="#c97454" />`
- Streak card `🔥` (line ~444) → `<Icon name="flame" size="md" color="#c97454" weight="fill" />`

**Step 3: Other screens**

- `wishlist.tsx`: back arrow `←` (line ~87) → `<Icon name="arrow-left" size="md" color="#1c1917" />`, empty `✨` (line ~110) → `<Icon name="sparkle" size="xl" color="#c97454" weight="light" />`, sort `▲`/`▼` (line ~167) → `<Icon name="sort-ascending"/"sort-descending" size="sm" />`, default category `💫` (line ~245) → `<Icon name="sparkle" size="sm" color="#8b7355" />`
- `games.tsx`: back arrow `←` (line ~54) → `<Icon name="arrow-left" size="md" color="#1c1917" />`
- `resources.tsx`: back arrow `←` (line ~26) → `<Icon name="arrow-left" size="md" color="#1c1917" />`
- `waiting-partner.tsx`: `⏳` (in JSX) → `<Icon name="hourglass" size="xl" color="#c97454" weight="light" />`
- `tone-calibration.tsx`: `✓` (line ~97) → `<Icon name="check" size="sm" color="#c97454" weight="bold" />`
- `preferences.tsx`: `✓` (line ~107) → `<Icon name="check" size="sm" color="#c97454" weight="bold" />`

**Step 4: Commit**

```bash
git add app/
git commit -m "feat: replace emoji with Phosphor icons in all app screens"
```

---

### Task 12: Add GoalTrackerSkeleton and WishlistCardSkeleton

**Files:**
- Modify: `src/components/Skeleton.tsx`
- Modify: `src/components/GoalTracker.tsx`
- Modify: `src/components/WishlistCard.tsx`

**Step 1: Add skeletons to Skeleton.tsx**

```typescript
export function GoalTrackerSkeleton() {
  return (
    <View style={goalSkeletonStyles.card}>
      <View style={goalSkeletonStyles.header}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={120} height={14} style={{ marginLeft: 8 }} />
      </View>
      <Skeleton height={12} width="90%" style={{ marginBottom: 10 }} />
      <Skeleton height={12} width="75%" style={{ marginBottom: 10 }} />
      <Skeleton height={12} width="60%" />
    </View>
  );
}

const goalSkeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderTopWidth: 3,
    borderTopColor: '#e7e5e4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});

export function WishlistCardSkeleton() {
  return (
    <View style={wishlistSkeletonStyles.card}>
      <View style={wishlistSkeletonStyles.header}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={80} height={14} style={{ marginLeft: 8 }} />
      </View>
      <Skeleton height={12} width="85%" style={{ marginBottom: 10 }} />
      <Skeleton height={12} width="65%" />
    </View>
  );
}

const wishlistSkeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderTopWidth: 3,
    borderTopColor: '#e7e5e4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});
```

**Step 2: Replace ActivityIndicator in GoalTracker.tsx**

Find the loading state that renders `<ActivityIndicator>` and replace with `<GoalTrackerSkeleton />`. Import from `./Skeleton`.

**Step 3: Replace ActivityIndicator in WishlistCard.tsx**

Same pattern — replace `<ActivityIndicator>` with `<WishlistCardSkeleton />`.

**Step 4: Verify in simulator**

Load the Today screen. GoalTracker and WishlistCard should shimmer while loading instead of showing a spinner.

**Step 5: Commit**

```bash
git add src/components/Skeleton.tsx src/components/GoalTracker.tsx src/components/WishlistCard.tsx
git commit -m "feat: add GoalTracker and WishlistCard skeletons, remove ActivityIndicator"
```

---

### Task 13: Final type check and visual verification

**Files:** None (verification only)

**Step 1: Full type check**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit
```
Expected: no new errors (pre-existing type errors from MEMORY.md are ok)

**Step 2: Run tests**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && npx jest --no-coverage
```
Expected: all existing tests pass

**Step 3: Visual check in simulator**

Open app in iOS simulator. Check each screen:
- [ ] Tab bar: crisp SVG icons, correct active/inactive states
- [ ] Today: no emoji anywhere, streak ring has flame icon, emotion buttons have weather icons
- [ ] Memories: heart icon in tab, memory cards render correctly
- [ ] Insights: all insight cards have Phosphor icons, empty state uses binoculars
- [ ] Settings: gear icon in tab, profile card uses camera/calendar/heart icons
- [ ] Games: game cards show Phosphor icons, game screens have proper close buttons
- [ ] Onboarding: waiting screen has hourglass icon, preferences/calibration use check icons

**Step 4: Grep for remaining emoji**

Run:
```bash
cd /Users/adamwarner/stoke-app/app && grep -rn '[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F900}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' src/ app/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v __tests__
```
Expected: no emoji remaining in source files (excluding test files and config data)
