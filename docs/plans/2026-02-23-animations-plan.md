# Comprehensive Animation & Interaction Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add animations, gestures, and micro-interactions across the entire Stoke app — build reusable primitives first, then apply everywhere.

**Architecture:** Primitives-first approach. Six new animated components built with react-native-reanimated v3 imperative API (`useSharedValue`, `withTiming`, `withSpring`, `withRepeat`). Gesture interactions via react-native-gesture-handler `Swipeable`. Onboarding screens converted from disabled NativeWind to StyleSheet.

**Tech Stack:** react-native-reanimated v3, react-native-gesture-handler, expo-haptics

---

### Task 1: Install react-native-gesture-handler

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `cd /Users/adamwarner/stoke-app/app && npx expo install react-native-gesture-handler`

**Step 2: Verify installation**

Run: `cat package.json | grep gesture-handler`
Expected: line showing `"react-native-gesture-handler": "~X.X.X"`

**Step 3: Wrap root layout with GestureHandlerRootView**

Modify `app/_layout.tsx` — wrap the outermost component with `GestureHandlerRootView`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// In the return, wrap everything:
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    {/* existing QueryClientProvider + Stack content */}
  </GestureHandlerRootView>
);
```

**Step 4: Verify app starts**

Run: `cd /Users/adamwarner/stoke-app/app && npx expo start` — confirm no crash on launch.

**Step 5: Commit**

```bash
git add package.json package-lock.json app/_layout.tsx
git commit -m "chore: install react-native-gesture-handler and wrap root layout"
```

---

### Task 2: AnimatedProgressBar component

**Files:**
- Create: `src/components/AnimatedProgressBar.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create AnimatedProgressBar**

Create `src/components/AnimatedProgressBar.tsx`:

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function AnimatedProgressBar({
  progress,
  color = '#c97454',
  trackColor = '#f5f5f4',
  height = 6,
  style,
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
    backgroundColor: color,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }, style]}>
      <Animated.View style={[styles.fill, { height }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 3,
  },
});
```

**Step 2: Add export to barrel**

Add to `src/components/index.ts`:

```tsx
export { AnimatedProgressBar } from './AnimatedProgressBar';
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/AnimatedProgressBar.tsx src/components/index.ts
git commit -m "feat: add AnimatedProgressBar component"
```

---

### Task 3: AnimatedCheckbox component

**Files:**
- Create: `src/components/AnimatedCheckbox.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create AnimatedCheckbox**

Create `src/components/AnimatedCheckbox.tsx`:

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

interface AnimatedCheckboxProps {
  checked: boolean;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function AnimatedCheckbox({
  checked,
  size = 24,
  color = '#c97454',
  style,
}: AnimatedCheckboxProps) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      scale.value = 0.8; // start small, spring to 1
      progress.value = withTiming(1, { duration: 200 });
    } else {
      progress.value = withTiming(0, { duration: 150 });
    }
  }, [checked]);

  const containerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', color]
    );
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#d6d3d1', color]
    );
    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: scale.value }],
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        containerStyle,
        style,
      ]}
    >
      <Animated.Text style={[styles.checkmark, { fontSize: size * 0.55 }, checkmarkStyle]}>
        {'\u2713'}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
  },
});
```

**Step 2: Add export to barrel**

Add to `src/components/index.ts`:

```tsx
export { AnimatedCheckbox } from './AnimatedCheckbox';
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/AnimatedCheckbox.tsx src/components/index.ts
git commit -m "feat: add AnimatedCheckbox component with spring animation"
```

---

### Task 4: PulsingDots component

**Files:**
- Create: `src/components/PulsingDots.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create PulsingDots**

Create `src/components/PulsingDots.tsx`:

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface PulsingDotsProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

function Dot({ delay, color, size }: { delay: number; color: string; size: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.8 + opacity.value * 0.2 }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
}

export function PulsingDots({ color = '#c97454', size = 5, style }: PulsingDotsProps) {
  return (
    <Animated.View style={[styles.container, style]}>
      <Dot delay={0} color={color} size={size} />
      <Dot delay={200} color={color} size={size} />
      <Dot delay={400} color={color} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {},
});
```

**Step 2: Add export to barrel**

Add to `src/components/index.ts`:

```tsx
export { PulsingDots } from './PulsingDots';
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/PulsingDots.tsx src/components/index.ts
git commit -m "feat: add PulsingDots component with sequential pulse animation"
```

---

### Task 5: SwipeableRow component

**Files:**
- Create: `src/components/SwipeableRow.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create SwipeableRow**

Create `src/components/SwipeableRow.tsx`:

```tsx
import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface SwipeAction {
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  onSwipeOpen?: () => void;
}

export function SwipeableRow({
  children,
  rightActions = [],
  leftActions = [],
  onSwipeOpen,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleAction = (action: SwipeAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    action.onPress();
  };

  const renderRightActions = () => {
    if (rightActions.length === 0) return null;
    return (
      <View style={styles.actionsContainer}>
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, { backgroundColor: action.color }]}
            onPress={() => handleAction(action)}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLeftActions = () => {
    if (leftActions.length === 0) return null;
    return (
      <View style={styles.actionsContainer}>
        {leftActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, { backgroundColor: action.color }]}
            onPress={() => handleAction(action)}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={rightActions.length > 0 ? renderRightActions : undefined}
      renderLeftActions={leftActions.length > 0 ? renderLeftActions : undefined}
      onSwipeableOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSwipeOpen?.();
      }}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
```

**Step 2: Add export to barrel**

Add to `src/components/index.ts`:

```tsx
export { SwipeableRow } from './SwipeableRow';
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/SwipeableRow.tsx src/components/index.ts
git commit -m "feat: add SwipeableRow component with haptic feedback"
```

---

### Task 6: AnimatedStreakRing component

The current `StreakRing` uses only layout animations (`FadeIn`/`FadeInUp`). We'll enhance it in-place with a scale-in spring on the ring and a counting animation on the streak number. No SVG needed — use scale + opacity entrance.

**Files:**
- Modify: `src/components/StreakRing.tsx`

**Step 1: Read the current file**

Read `src/components/StreakRing.tsx` to get current state.

**Step 2: Add imperative animations**

Add imports and shared values. The ring circle should scale-in from 0.6 with a spring, and the streak number should fade-in after the ring. Modify the component:

```tsx
// Add to imports:
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Inside the component, before the return:
const ringScale = useSharedValue(0.6);
const numberOpacity = useSharedValue(0);

useEffect(() => {
  ringScale.value = withSpring(1, { damping: 14, stiffness: 160 });
  numberOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
}, []);

const ringAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: ringScale.value }],
}));

const numberAnimatedStyle = useAnimatedStyle(() => ({
  opacity: numberOpacity.value,
}));
```

Replace the ring `View` wrapper with `Animated.View` using `ringAnimatedStyle`, and wrap the streak number text with `Animated.View` using `numberAnimatedStyle`.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/StreakRing.tsx
git commit -m "feat: add scale-in spring animation to StreakRing"
```

---

### Task 7: AnimatedCounter component

**Files:**
- Create: `src/components/AnimatedCounter.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create AnimatedCounter**

Create `src/components/AnimatedCounter.tsx`:

```tsx
import React, { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 600,
  style,
  suffix = '',
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const text = `${Math.round(animatedValue.value)}${suffix}`;
    return {
      text,
      defaultValue: text,
    };
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0 }, style]}
      animatedProps={animatedProps}
    />
  );
}
```

**Step 2: Add export to barrel**

Add to `src/components/index.ts`:

```tsx
export { AnimatedCounter } from './AnimatedCounter';
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/AnimatedCounter.tsx src/components/index.ts
git commit -m "feat: add AnimatedCounter component with counting animation"
```

---

### Task 8: Apply AnimatedProgressBar to GoalTracker

**Files:**
- Modify: `src/components/GoalTracker.tsx`

**Step 1: Read GoalTracker.tsx**

Read `src/components/GoalTracker.tsx` to find the progress bar section (around lines 205-231).

**Step 2: Replace static progress bar with AnimatedProgressBar**

Add import:
```tsx
import { AnimatedProgressBar } from './AnimatedProgressBar';
```

Replace the progress bar rendering (the `<View style={styles.progressTrack}>` block) with:

```tsx
<AnimatedProgressBar
  progress={progress}
  color={isComplete ? '#22c55e' : '#c97454'}
  height={6}
/>
```

Remove the now-unused `progressTrack`, `progressFill`, `progressFillComplete` styles.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/GoalTracker.tsx
git commit -m "feat: use AnimatedProgressBar in GoalTracker"
```

---

### Task 9: Apply AnimatedCheckbox to GoalTracker and WishlistCard

**Files:**
- Modify: `src/components/GoalTracker.tsx`
- Modify: `src/components/WishlistCard.tsx`

**Step 1: GoalTracker — replace checkbox**

Add import:
```tsx
import { AnimatedCheckbox } from './AnimatedCheckbox';
```

Replace the checkbox conditional block (the `{goal.isCompleted ? ... : ...}` around lines 158-172) with:

```tsx
<AnimatedCheckbox checked={goal.isCompleted} size={24} />
```

Remove unused styles: `checkboxFilled`, `checkboxEmpty`, `checkboxInner`, `checkmark`.

**Step 2: WishlistCard — replace checkbox**

Same pattern. Add import and replace the checkbox conditional (around lines 150-156) with:

```tsx
<AnimatedCheckbox checked={item.isCompleted} size={20} />
```

Remove unused checkbox styles.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/GoalTracker.tsx src/components/WishlistCard.tsx
git commit -m "feat: use AnimatedCheckbox in GoalTracker and WishlistCard"
```

---

### Task 10: Apply PulsingDots to today.tsx typing indicator

**Files:**
- Modify: `app/(app)/today.tsx`

**Step 1: Read today.tsx typing indicator section**

Read `app/(app)/today.tsx` around lines 419-433 to find the static typing dots.

**Step 2: Replace static dots with PulsingDots**

Add import:
```tsx
import { PulsingDots } from '@components';
```

Replace the static dots block:
```tsx
// Old:
<View style={styles.typingDots}>
  <View style={[styles.typingDot, { opacity: 0.4 }]} />
  <View style={[styles.typingDot, { opacity: 0.7 }]} />
  <View style={[styles.typingDot, { opacity: 1 }]} />
</View>

// New:
<PulsingDots color="#c97454" size={5} />
```

Remove unused styles: `typingDots`, `typingDot`.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: replace static typing dots with PulsingDots animation"
```

---

### Task 11: Apply AnimatedProgressBar to Insights screen

**Files:**
- Modify: `app/(app)/insights.tsx`

**Step 1: Read insights.tsx**

Read `app/(app)/insights.tsx` to find all static progress bar patterns (milestone bars, category bars, weekly rate bar, communication bar).

**Step 2: Replace all static progress/width bars with AnimatedProgressBar**

Import `AnimatedProgressBar` from `@components`. Find each pattern like:

```tsx
<View style={[styles.someFill, { width: `${value * 100}%` }]} />
```

Replace with `<AnimatedProgressBar progress={value} ... />` using appropriate colors per section.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(app\)/insights.tsx
git commit -m "feat: use AnimatedProgressBar in Insights screen"
```

---

### Task 12: Apply AnimatedCounter to Insights hero stats

**Files:**
- Modify: `app/(app)/insights.tsx`

**Step 1: Identify hero stat numbers**

Read `app/(app)/insights.tsx` to find the hero stats section (total prompts, completion rate, current streak).

**Step 2: Replace static number Text with AnimatedCounter**

Import `AnimatedCounter` from `@components`. Replace each stat `<Text>` that shows a number with:

```tsx
<AnimatedCounter value={statValue} style={existingTextStyle} suffix={suffixIfAny} />
```

Keep surrounding labels as regular `<Text>`.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(app\)/insights.tsx
git commit -m "feat: use AnimatedCounter for Insights hero stats"
```

---

### Task 13: Welcome screen entrance animations

**Files:**
- Modify: `app/(auth)/welcome.tsx`

**Step 1: Read welcome.tsx**

Read `app/(auth)/welcome.tsx` to see current structure (lines 1-88).

**Step 2: Add staggered entrance animations**

Add imports:
```tsx
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
```

Wrap elements with `Animated.View`:
- Logo: `entering={FadeIn.duration(600)}`
- App name + tagline: `entering={FadeIn.duration(500).delay(200)}`
- Sign-in button: `entering={FadeInUp.duration(500).delay(400)}`
- Sign-up button: `entering={FadeInUp.duration(500).delay(500)}`

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(auth\)/welcome.tsx
git commit -m "feat: add entrance animations to welcome screen"
```

---

### Task 14: Auth screens entrance animations (sign-in, sign-up, forgot-password)

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/forgot-password.tsx`

**Step 1: Read all three auth screens**

Read each file to understand the layout structure.

**Step 2: Add staggered entrance animations to each**

Same pattern for all three:

```tsx
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
```

- Title/header: `entering={FadeIn.duration(400)}`
- Each form field: `entering={FadeInUp.duration(400).delay(100 * index)}` (index = 0 for email, 1 for password, etc.)
- Submit button: `entering={FadeInUp.duration(500).delay(lastFieldDelay + 100)}`
- Footer links: `entering={FadeIn.duration(400).delay(lastFieldDelay + 200)}`

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(auth\)/sign-in.tsx app/\(auth\)/sign-up.tsx app/\(auth\)/forgot-password.tsx
git commit -m "feat: add entrance animations to auth screens"
```

---

### Task 15: Memories screen entrance animations

**Files:**
- Modify: `app/(app)/memories.tsx`

**Step 1: Read memories.tsx**

Read `app/(app)/memories.tsx` (lines 1-355).

**Step 2: Add entrance animations**

Add imports:
```tsx
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
```

- Header area: `entering={FadeIn.duration(400)}`
- Tab bar pills: `entering={FadeIn.duration(400).delay(100)}`
- Each memory card in the FlatList `renderItem`: wrap with `Animated.View entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))}` (cap delay at 400ms so long lists don't wait forever)
- Empty state: `entering={FadeIn.duration(500).delay(200)}`

**Step 3: Add haptic on save to memory**

Find the save/unsave handler. Add:
```tsx
import * as Haptics from 'expo-haptics';

// In save handler:
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

**Step 4: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 5: Commit**

```bash
git add app/\(app\)/memories.tsx
git commit -m "feat: add entrance animations and save haptic to memories screen"
```

---

### Task 16: Settings screen entrance animations

**Files:**
- Modify: `app/(app)/settings.tsx`

**Step 1: Read settings.tsx section structure**

Read `app/(app)/settings.tsx` to identify each section block (lines 191-327).

**Step 2: Add staggered section entrance animations**

Add imports:
```tsx
import Animated, { FadeInUp } from 'react-native-reanimated';
```

Wrap each section (Notifications, Partnership, Resources, Privacy, Account) with `Animated.View`:
- Section 1 (Notifications): `entering={FadeInUp.duration(400).delay(100)}`
- Section 2 (Partnership): `entering={FadeInUp.duration(400).delay(160)}`
- Section 3 (Resources): `entering={FadeInUp.duration(400).delay(220)}`
- Section 4 (Privacy): `entering={FadeInUp.duration(400).delay(280)}`
- Section 5 (Account): `entering={FadeInUp.duration(400).delay(340)}`
- Safety footer: `entering={FadeInUp.duration(400).delay(400)}`

ProfileCard already has its own animations — skip it.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(app\)/settings.tsx
git commit -m "feat: add staggered entrance animations to settings screen"
```

---

### Task 17: Convert onboarding preferences.tsx from NativeWind to StyleSheet + animations

**Files:**
- Modify: `app/(onboarding)/preferences.tsx`

**Step 1: Read preferences.tsx**

Read `app/(onboarding)/preferences.tsx` (lines 1-109).

**Step 2: Convert all className props to StyleSheet**

Remove NativeWind `className` usage. Create a `StyleSheet.create()` block matching the app's design system (`#fafaf9` background, `#c97454` accent, consistent padding/margin). Replace every `className="..."` with `style={styles.xxx}`.

Key mappings:
- `flex-1 bg-warm-50` → `{ flex: 1, backgroundColor: '#fafaf9' }`
- `text-2xl font-bold text-warm-900` → `{ fontSize: 24, fontWeight: '700', color: '#1c1917' }`
- `bg-primary-50 border-2 border-primary-300` → `{ backgroundColor: '#fef7f4', borderWidth: 2, borderColor: '#c97454' }`
- `bg-white border border-warm-200` → `{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e5e4' }`

**Step 3: Add entrance animations**

Add imports:
```tsx
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
```

- Title: `entering={FadeIn.duration(400)}`
- Subtitle: `entering={FadeIn.duration(400).delay(100)}`
- Option cards: `entering={FadeInUp.duration(400).delay(200 + index * 100)}`
- Continue button: `entering={FadeInUp.duration(500).delay(500)}`

**Step 4: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 5: Commit**

```bash
git add app/\(onboarding\)/preferences.tsx
git commit -m "feat: convert preferences to StyleSheet and add entrance animations"
```

---

### Task 18: Convert remaining onboarding screens from NativeWind to StyleSheet + animations

**Files:**
- Modify: `app/(onboarding)/tone-calibration.tsx`
- Modify: `app/(onboarding)/invite-partner.tsx`
- Modify: `app/(onboarding)/waiting-partner.tsx`
- Modify: `app/(onboarding)/ready.tsx`
- Modify: `app/(onboarding)/accept-invite.tsx`

**Step 1: Read all five files**

Read each onboarding file that uses NativeWind `className`.

**Step 2: Convert each to StyleSheet**

Same conversion pattern as Task 17 — replace all `className` with `style` props and `StyleSheet.create()`. Use the same color/spacing mappings. Match the visual design exactly.

**Step 3: Add entrance animations to each**

Same FadeIn/FadeInUp stagger pattern:
- Title: `FadeIn(400)`
- Subtitle/description: `FadeIn(400).delay(100)`
- Interactive elements (inputs, cards, buttons): `FadeInUp(400).delay(200 + index * 100)`
- Primary CTA button: last in the stagger

**Step 4: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 5: Commit**

```bash
git add app/\(onboarding\)/tone-calibration.tsx app/\(onboarding\)/invite-partner.tsx app/\(onboarding\)/waiting-partner.tsx app/\(onboarding\)/ready.tsx app/\(onboarding\)/accept-invite.tsx
git commit -m "feat: convert remaining onboarding screens to StyleSheet with animations"
```

---

### Task 19: Add entrance animations to first-prompt.tsx and verify-email.tsx

These two onboarding screens already use StyleSheet but have no animations.

**Files:**
- Modify: `app/(onboarding)/first-prompt.tsx`
- Modify: `app/(onboarding)/verify-email.tsx`

**Step 1: Read both files**

Read each to understand the layout.

**Step 2: Add entrance animations**

Add reanimated FadeIn/FadeInUp pattern. For `first-prompt.tsx`, the sample prompt card reveal should use `FadeInUp(500)` for a nice entrance. For `verify-email.tsx`, stagger the icon, title, subtitle, and buttons.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(onboarding\)/first-prompt.tsx app/\(onboarding\)/verify-email.tsx
git commit -m "feat: add entrance animations to first-prompt and verify-email screens"
```

---

### Task 20: Swipe-to-delete on chat messages

**Files:**
- Modify: `src/components/ChatBubble.tsx`
- Modify: `app/(app)/chat.tsx`

**Step 1: Read ChatBubble.tsx and chat.tsx**

Read both files to understand the current delete pattern (long-press + ActionSheet).

**Step 2: Wrap own messages with SwipeableRow**

In `ChatBubble.tsx`, import `SwipeableRow`:

```tsx
import { SwipeableRow } from './SwipeableRow';
```

For messages sent by the user (`isOwn`), wrap the bubble content with SwipeableRow:

```tsx
const bubbleContent = (
  <Animated.View entering={FadeInUp.duration(200)} style={...}>
    {/* existing bubble content */}
  </Animated.View>
);

if (isOwn && onDelete) {
  return (
    <SwipeableRow
      rightActions={[{ label: 'Delete', color: '#ef4444', onPress: onDelete }]}
    >
      {bubbleContent}
    </SwipeableRow>
  );
}

return bubbleContent;
```

Keep the existing long-press as a secondary option for accessibility.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/ChatBubble.tsx app/\(app\)/chat.tsx
git commit -m "feat: add swipe-to-delete gesture on chat messages"
```

---

### Task 21: Swipe-to-archive on goals

**Files:**
- Modify: `src/components/GoalTracker.tsx`

**Step 1: Read GoalTracker.tsx goal row rendering**

Identify where individual goal rows are rendered (the GoalRow section).

**Step 2: Wrap goal rows with SwipeableRow**

```tsx
import { SwipeableRow } from './SwipeableRow';
```

Wrap each goal row:

```tsx
<SwipeableRow
  rightActions={[{
    label: 'Archive',
    color: '#a8a29e',
    onPress: () => archiveGoal(goal.id),
  }]}
>
  {/* existing goal row content */}
</SwipeableRow>
```

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/GoalTracker.tsx
git commit -m "feat: add swipe-to-archive gesture on goals"
```

---

### Task 22: Swipe-to-delete on wishlist items and memory cards

**Files:**
- Modify: `app/(app)/wishlist.tsx`
- Modify: `app/(app)/memories.tsx`

**Step 1: Read both files**

Read the FlatList `renderItem` in both files.

**Step 2: Wrap wishlist items with SwipeableRow**

In `wishlist.tsx`, wrap each item row:

```tsx
import { SwipeableRow } from '@components';

// In renderItem:
<SwipeableRow
  rightActions={[{
    label: 'Delete',
    color: '#ef4444',
    onPress: () => deleteItem(item.id),
  }]}
>
  {/* existing item content */}
</SwipeableRow>
```

**Step 3: Wrap saved memory cards with SwipeableRow**

In `memories.tsx`, wrap each saved memory card:

```tsx
import { SwipeableRow } from '@components';

// In saved memories renderItem:
<SwipeableRow
  rightActions={[{
    label: 'Remove',
    color: '#ef4444',
    onPress: () => unsaveMemory(memory.id),
  }]}
>
  {/* existing memory card content */}
</SwipeableRow>
```

**Step 4: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 5: Commit**

```bash
git add app/\(app\)/wishlist.tsx app/\(app\)/memories.tsx
git commit -m "feat: add swipe-to-delete on wishlist items and memory cards"
```

---

### Task 23: Micro-interactions — feedback buttons and respond button

**Files:**
- Modify: `app/(app)/today.tsx`

**Step 1: Read today.tsx feedback and respond button sections**

Read the feedback buttons (around lines 503-532) and the respond/submit button (around lines 343-361).

**Step 2: Add spring scale to feedback buttons**

Replace each feedback `TouchableOpacity` with an animated pressable. Use `useSharedValue` for scale:

```tsx
// For each feedback button, create a pressable with spring scale:
const feedbackScale = useSharedValue(1);

const onPressIn = () => {
  feedbackScale.value = withSpring(1.15, { damping: 12, stiffness: 200 });
};
const onPressOut = () => {
  feedbackScale.value = withSpring(1, { damping: 12, stiffness: 200 });
};

// Use Animated.View wrapping the TouchableOpacity with transform: [{ scale: feedbackScale }]
```

Alternatively, create a small `AnimatedPressable` helper inside today.tsx to avoid repeating per button.

**Step 3: Add press animation to respond/submit button**

For the submit button, add a press-down effect:

```tsx
const submitScale = useSharedValue(1);

// onPressIn: submitScale.value = withTiming(0.96, { duration: 100 });
// onPressOut: submitScale.value = withSpring(1, { damping: 12, stiffness: 200 });
```

Wrap the submit `TouchableOpacity` content in an `Animated.View` with the scale transform.

**Step 4: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 5: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: add spring scale micro-interactions to feedback and respond buttons"
```

---

### Task 24: Animated tab bar indicator

**Files:**
- Modify: `app/(app)/_layout.tsx`

**Step 1: Read _layout.tsx**

Read `app/(app)/_layout.tsx` (lines 1-113) to understand the tab bar setup.

**Step 2: Add a custom tab bar with animated indicator**

This requires creating a custom `tabBar` prop for the `Tabs` component. Create a custom tab bar that renders an animated underline that slides horizontally between tabs using `useSharedValue` + `withTiming`:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

function CustomTabBar({ state, descriptors, navigation }) {
  const translateX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  // Calculate position based on active tab index
  useEffect(() => {
    // Visible tabs only (filter out href: null)
    const visibleIndex = state.index; // adjust for hidden tabs
    translateX.value = withTiming(visibleIndex * tabWidth.value, { duration: 250 });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: tabWidth.value,
  }));

  return (
    <View style={tabBarStyles.container}>
      <Animated.View style={[tabBarStyles.indicator, indicatorStyle]} />
      {/* Render tab buttons */}
    </View>
  );
}
```

Pass `tabBar={(props) => <CustomTabBar {...props} />}` to the `Tabs` component.

The indicator should be a small dot or thin line (2px height, 20px width, `#c97454`, centered under active tab).

**Step 3: Verify typecheck and visual**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add app/\(app\)/_layout.tsx
git commit -m "feat: add animated sliding indicator to tab bar"
```

---

### Task 25: Migrate Skeleton.tsx from RN Animated to reanimated

**Files:**
- Modify: `src/components/Skeleton.tsx`

**Step 1: Read Skeleton.tsx**

Read `src/components/Skeleton.tsx` (lines 1-96) to see the old `Animated.loop` + `Animated.sequence` pattern.

**Step 2: Rewrite pulse animation with reanimated**

Replace `import { Animated } from 'react-native'` with reanimated. Replace the `useEffect` animation setup:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Inside Skeleton component:
const opacity = useSharedValue(0.3);

useEffect(() => {
  opacity.value = withRepeat(
    withSequence(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
    ),
    -1, // infinite
  );
}, []);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
}));
```

Replace `Animated.View` references from old API to reanimated `Animated.View`. Keep `PromptCardSkeleton` and `MemoryCardSkeleton` compound components as-is.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/Skeleton.tsx
git commit -m "refactor: migrate Skeleton to reanimated for consistency"
```

---

### Task 26: Migrate OfflineBanner.tsx from RN Animated to reanimated

**Files:**
- Modify: `src/components/OfflineBanner.tsx`

**Step 1: Read OfflineBanner.tsx**

Read `src/components/OfflineBanner.tsx` (lines 1-45).

**Step 2: Rewrite slide animation with reanimated**

Replace old `Animated.timing` with reanimated:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

// Inside component:
const translateY = useSharedValue(-60);

useEffect(() => {
  translateY.value = withTiming(isOffline ? 0 : -60, { duration: 300 });
}, [isOffline]);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
}));
```

Replace old `Animated.View` with reanimated's `Animated.View`.

**Step 3: Verify typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/OfflineBanner.tsx
git commit -m "refactor: migrate OfflineBanner to reanimated for consistency"
```

---

### Task 27: Final verification pass

**Step 1: Run full typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`

**Step 2: Run all tests**

Run: `cd /Users/adamwarner/stoke-app/app && npm test`

**Step 3: Run lint**

Run: `cd /Users/adamwarner/stoke-app/app && npm run lint`

**Step 4: Fix any issues found**

Address any type errors, test failures, or lint warnings.

**Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from animation pass"
```
