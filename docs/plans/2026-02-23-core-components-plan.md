# Core Components + Forms Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add press animations to Button, focus states to Input, pill press animations and error transitions to modals, and refine disabled states — propagating quality across every screen.

**Architecture:** Targeted in-place enhancements to 4 files. Button and Input are core primitives used everywhere, so changes automatically improve all screens. Modal changes are scoped to AddGoalModal and AddWishlistModal. All animations use react-native-reanimated v3 shared values.

**Tech Stack:** react-native-reanimated v3, expo-haptics, React Native Pressable/TouchableOpacity

---

### Task 1: Button press animation

**Files:**
- Modify: `src/components/Button.tsx`

**Context:** The `Button` component is used across every screen (auth, onboarding, modals, settings). Currently uses `TouchableOpacity` with `activeOpacity: 0.8` — no spring feedback. We add a scale-down spring animation on press.

**Implementation:**

The component uses `React.forwardRef` and `TouchableOpacityProps`. We need to:

1. Add reanimated imports: `Animated, useSharedValue, useAnimatedStyle, withSpring, withTiming`
2. Add a `scale` shared value starting at `1`
3. Add `onPressIn` handler: `scale.value = withTiming(0.97, { duration: 100 })`
4. Add `onPressOut` handler: `scale.value = withSpring(1, { damping: 15, stiffness: 200 })`
5. Wrap the `TouchableOpacity` in `Animated.View` with the scale animated style
6. Pass through user-provided `onPressIn`/`onPressOut` (call both the animation and the user's handler)
7. Update disabled style: change `opacity: 0.5` to `opacity: 0.4`
8. Add a new `primaryDisabled` style with `backgroundColor: '#d4a48e'` (desaturated rust)
9. Apply `primaryDisabled` when variant is `'primary'` and `disabled || loading` is true (instead of generic opacity)

```tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  {
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = true,
    disabled,
    style,
    onPressIn: userOnPressIn,
    onPressOut: userOnPressOut,
    ...props
  },
  ref
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(0.97, { duration: 100 });
    userOnPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    userOnPressOut?.(e);
  };

  const isDisabled = disabled || loading;

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[`${variant}Button`],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    isDisabled && variant === 'primary' && styles.primaryDisabled,
    isDisabled && variant !== 'primary' && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
  ];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        ref={ref as any}
        style={[buttonStyles, style]}
        disabled={isDisabled}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#ffffff' : '#c97454'}
            size="small"
          />
        ) : (
          <Text style={textStyles}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
```

Add to styles:
```tsx
primaryDisabled: {
  backgroundColor: '#d4a48e',
},
```

Change `disabled` style from `opacity: 0.5` to `opacity: 0.4`.

Change `activeOpacity` from `0.8` to `1` (spring handles the visual feedback now).

**Verify:** Run `npm run typecheck` — no new errors in Button.tsx.

**Commit:** `git add src/components/Button.tsx && git commit -m "feat: add spring press animation and refined disabled state to Button"`

---

### Task 2: Input focus state

**Files:**
- Modify: `src/components/Input.tsx`

**Context:** The `Input` component is used across auth screens, onboarding, and the preferences screen. Currently has no visual feedback on focus — border stays `#e7e5e4` always (unless error). We add a focus border color change and light haptic.

**Implementation:**

1. Add `useState` for `isFocused`
2. Add `onFocus`/`onBlur` handlers that set state and call user-provided handlers
3. Border color logic: error → `#f87171`, focused → `#c97454`, default → `#e7e5e4`
4. Add light haptic on focus
5. Add subtle warm background tint on error: `backgroundColor: '#fefbfb'` (very slight pink warmth)

```tsx
import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, onFocus: userOnFocus, onBlur: userOnBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!error;

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      userOnFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      userOnBlur?.(e);
    };

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            isFocused && !hasError && styles.inputFocused,
            hasError && styles.inputError,
            style,
          ]}
          placeholderTextColor="#a8a29e"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {hint && !error && <Text style={styles.hint}>{hint}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
```

Add to styles:
```tsx
inputFocused: {
  borderColor: '#c97454',
},
inputError: {
  borderColor: '#f87171',
  backgroundColor: '#fefbfb',
},
```

The existing `inputError` only had `borderColor`. We add `backgroundColor: '#fefbfb'` to give a subtle warm error tint.

**Verify:** Run `npm run typecheck` — no new errors in Input.tsx.

**Commit:** `git add src/components/Input.tsx && git commit -m "feat: add focus border state and haptic feedback to Input"`

---

### Task 3: AddGoalModal pill press animations + error transition

**Files:**
- Modify: `src/components/AddGoalModal.tsx`

**Context:** The frequency pills and Create button use `TouchableOpacity` with `activeOpacity: 0.8`. Add spring scale on press for both. Also change error entrance from `FadeIn` to `FadeInUp`. Update disabled style.

**Implementation:**

Create an `AnimatedPill` wrapper component inside the file to avoid duplicating animation logic for each pill:

```tsx
function AnimatedPill({ children, onPress, style }: {
  children: React.ReactNode;
  onPress: () => void;
  style: ViewStyle | ViewStyle[];
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.95, { duration: 80 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
```

Changes:
1. Add imports: `useSharedValue, useAnimatedStyle, withSpring, withTiming, ViewStyle`
2. Replace frequency pill `TouchableOpacity` with `AnimatedPill`
3. Add same spring scale to Create button (`onPressIn`/`onPressOut`)
4. Change error `FadeIn.duration(300)` to `FadeInUp.duration(300)`
5. Change disabled style from `opacity: 0.5` to `opacity: 0.4`
6. Add `primaryDisabled` style: `backgroundColor: '#d4a48e'` — apply to Create button when disabled instead of generic opacity
7. Set Create button `activeOpacity={1}` (spring handles feedback)

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/AddGoalModal.tsx && git commit -m "feat: add pill press animations and error slide-up to AddGoalModal"`

---

### Task 4: AddWishlistModal pill press animations + error transition

**Files:**
- Modify: `src/components/AddWishlistModal.tsx`

**Context:** Same pattern as AddGoalModal — category pills and Create button need spring scale, error needs `FadeInUp`, disabled state needs refinement.

**Implementation:**

Same `AnimatedPill` pattern as Task 3 (duplicate is fine — it's 15 lines local to each modal, not worth extracting to shared):

1. Add imports: `useSharedValue, useAnimatedStyle, withSpring, withTiming, ViewStyle`
2. Add `AnimatedPill` component (identical to Task 3)
3. Replace category pill `TouchableOpacity` with `AnimatedPill`
4. Add spring scale to Create button (`onPressIn`/`onPressOut`)
5. Change error `FadeIn.duration(300)` to `FadeInUp.duration(300)`
6. Change disabled style from `opacity: 0.5` to `opacity: 0.4`
7. Add `primaryDisabled` style: `backgroundColor: '#d4a48e'` — apply to Create button when disabled
8. Set Create button `activeOpacity={1}`

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/AddWishlistModal.tsx && git commit -m "feat: add pill press animations and error slide-up to AddWishlistModal"`

---

### Task 5: Final verification

**Files:** None (verification only)

**Steps:**

1. Run `npm run typecheck` — confirm no new type errors
2. Run `npm test` — confirm all 92 tests pass
3. Review git log for clean commits

**Commit:** No commit needed.
