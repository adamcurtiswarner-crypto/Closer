# Stoke App — Comprehensive Animation & Interaction Pass

## Approach

Primitives-first: build reusable animated components, then apply them across all screens. Convert onboarding screens from disabled NativeWind to StyleSheet as part of this work.

## Phase 1: Animated Primitives

Six new components in `src/components/`:

### AnimatedProgressBar
- Accepts `progress` (0-1), animates width with `withTiming(500ms, Easing.out)` on mount and value changes
- Used in: GoalTracker, Insights bars (milestones, categories, weekly rate, communication)

### AnimatedCheckbox
- Scale-bounces (`withSpring`) when toggled, checkmark fades in with slight scale overshoot
- Used in: GoalTracker, WishlistCard

### PulsingDots
- Three dots that pulse opacity sequentially using `withRepeat` + `withDelay` offsets (200ms apart)
- Replaces static typing indicator dots in today.tsx

### SwipeableRow
- Wraps a row with swipe-reveal for destructive actions (delete/archive)
- Uses `react-native-gesture-handler` Swipeable
- Applied to: chat messages, memory cards, goals, wishlist items
- Haptic on trigger: `ImpactFeedbackStyle.Medium`

### AnimatedStreakRing
- Ring border draws on via animated strokeDashoffset or scale+fade with `withSpring`
- Flame/number does gentle scale-in
- Replaces current StreakRing

### AnimatedCounter
- Number animates between values (counting up/down)
- Used in: Insights hero stats, streak numbers

## Phase 2: Screen Entrance Animations

Apply FadeIn/FadeInUp cascade pattern to all unanimated screens.

### Welcome screen
- Logo `FadeIn(600)`, tagline `FadeIn(500).delay(200)`, buttons `FadeInUp(500).delay(400)` staggered

### Auth screens (sign-in, sign-up, forgot-password)
- Header `FadeIn(400)`, form fields stagger `FadeInUp(400).delay(index * 100)`, submit button last

### Memories screen
- Tab bar `FadeIn(400)`, memory cards stagger `FadeInUp(400).delay(index * 80)`
- Save confirmation: scale pulse + Success haptic

### Settings screen
- Section headers + rows stagger `FadeInUp(400).delay(index * 60)`
- ProfileCard already animated, sections below it get entrances

### Onboarding screens (7 screens)
- Convert from NativeWind className to StyleSheet
- Add entrance animations matching app patterns
- Screens: invite-partner, accept-invite, waiting-partner, preferences, tone-calibration, first-prompt, ready, verify-email

## Phase 3: Gesture Interactions

### Swipe-to-delete on chat messages
- Left swipe reveals red delete action via SwipeableRow
- Supplements existing long-press ActionSheet

### Swipe-to-archive on goals
- Right swipe reveals archive action on GoalTracker rows

### Swipe-to-delete on wishlist items
- Left swipe on full wishlist screen items

### Swipe-to-delete on memory cards
- Left swipe on saved memories in Memories screen

## Phase 4: Micro-interaction Polish

- **Feedback emoji buttons** (today.tsx complete mode): `withSpring` scale pulse (1 -> 1.2 -> 1) on tap + haptic
- **"Respond" button**: Scale press-down on `onPressIn`, spring back on release
- **Tab bar active indicator**: Animated underline/dot sliding between tabs with `withTiming`
- **Save to memory confirmation**: Checkmark scales in with `withSpring`, paired with Success haptic

## Phase 5: Consistency Fixes

- Migrate `Skeleton.tsx` from RN Animated to reanimated
- Migrate `OfflineBanner.tsx` from RN Animated to reanimated

## Technical Notes

- All new animations use `react-native-reanimated` v3 (not RN Animated)
- Haptics via `expo-haptics` paired with key interactions
- Gestures via `react-native-gesture-handler` Swipeable
- Timing: entrance animations 400-600ms, micro-interactions 200-300ms
- Springs: damping 12-15, stiffness 150-180 for bouncy feel
- No Lottie — keep everything in reanimated for bundle consistency
