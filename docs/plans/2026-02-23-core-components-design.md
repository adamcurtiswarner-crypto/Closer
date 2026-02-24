# Core Components + Forms Polish — Design

**Goal:** Add press animations to Button, focus states to Input, pill press animations to modals, and refine disabled/error states across core form components.

**Approach:** Targeted enhancements to 4 files that propagate quality across every screen.

---

## 1. Button Press Animation

Replace `activeOpacity: 0.8` with reanimated spring scale: press-in scales to 0.97, release springs back to 1.0. Use `onPressIn`/`onPressOut` with `useSharedValue` + `useAnimatedStyle`. Keep `forwardRef` API, all variants, sizes, disabled/loading states.

## 2. Input Focus State

Add `borderColor` transition to `#c97454` on focus, back to `#e7e5e4` on blur (or `#f87171` if error). Use `useState` for `isFocused`, pass `onFocus`/`onBlur` to `TextInput`. Light haptic on focus.

## 3. Modal Pill Press Animations

Both `AddGoalModal` and `AddWishlistModal` frequency/category pills: add scale-down on press (0.95 -> 1.0 spring). Same pattern for Create/Add buttons in both modals.

## 4. Modal Error Messages

Replace `FadeIn.duration(300)` with `FadeInUp.duration(300)` for slide-up entrance on error containers.

## 5. Disabled State Refinement

Change `opacity: 0.5` to `opacity: 0.4` on Button and modal Create buttons. Add desaturated background `#d4a48e` for primary disabled buttons instead of full opacity reduction.
