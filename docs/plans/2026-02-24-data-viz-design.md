# Data Visualizations Polish — Design

**Goal:** Animate the static data visualizations on the Insights screen — bar charts, trend bars, love language circles, streak counters, and milestone locked states — so they feel alive when they appear.

**Approach:** Targeted enhancements to 2 files (`insights.tsx` and `AnimatedCounter.tsx`). All animations use react-native-reanimated v3 shared values.

---

## 1. Emotional Journey Bar Animations

Static stacked bar segments (Warm/Okay/Hard) → animated width-grow with stagger per row.

- Wrap each `emotionRow` in `Animated.View` with `FadeInUp.duration(300).delay(index * 60)`
- Animate `barContainer` from `scaleX(0)` to `scaleX(1)` with `withTiming(500ms)`, transform origin left

## 2. Communication Trend Bar Animations

Trend bars have dynamic height but render static → grow from 0 to calculated height.

- `AnimatedTrendBar` sub-component with `useSharedValue(0)` for height
- Animate to target with `withTiming(600ms, Easing.out(cubic))` + stagger delay per bar

## 3. Milestone Locked Badge Treatment

Locked badges use `opacity: 0.3` — too subtle. Make lock state clearer.

- Small lock character overlay at bottom-right of locked badge circles
- `borderStyle: 'dashed'` on locked circles (instead of solid)
- Raise icon opacity from 0.3 to 0.4

## 4. Love Language Circle Entrance

Static circles → spring entrance animation.

- Each `loveLanguageItem` wrapped in `Animated.View` with `FadeInUp.duration(400).delay(0/100)`
- Scale spring on circles: 0.8 → 1.0 with `withSpring({ damping: 12, stiffness: 150 })`

## 5. Streak Values → AnimatedCounter

Plain `<Text>` for current/longest streak → `AnimatedCounter` for counting-up effect.

## 6. Communication Stats → AnimatedCounter

Plain text for avg words and talked-about-it rate → `AnimatedCounter` with prefix/suffix.

- Requires adding `prefix` prop to `AnimatedCounter` component.
