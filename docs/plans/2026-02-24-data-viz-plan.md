# Data Visualizations Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Animate the static data visualizations on the Insights screen so charts, bars, circles, and counters feel alive when they appear.

**Architecture:** Targeted enhancements to 2 files. `insights.tsx` gets animated sub-components and entrance animations. `AnimatedCounter.tsx` gets a `prefix` prop. All animations use react-native-reanimated v3 shared values.

**Tech Stack:** react-native-reanimated v3, React Native StyleSheet

---

### Task 1: Add prefix prop to AnimatedCounter

**Files:**
- Modify: `src/components/AnimatedCounter.tsx`

**Context:** `AnimatedCounter` currently accepts `suffix` (e.g., `"%"`) but not `prefix` (e.g., `"~"`). We need prefix for the communication stats ("~42 words"). The component uses `Animated.createAnimatedComponent(TextInput)` with `useAnimatedProps`.

**Implementation:**

1. Add `prefix?: string` to `AnimatedCounterProps` interface, default `''`
2. Update the `animatedProps` callback to prepend prefix: `` const text = `${prefix}${Math.round(animatedValue.value)}${suffix}`; ``
3. Accept `prefix` in the destructured props with default `''`

```tsx
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({
  value,
  duration = 600,
  style,
  suffix = '',
  prefix = '',
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const text = `${prefix}${Math.round(animatedValue.value)}${suffix}`;
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

**Verify:** Run `npm run typecheck` — no new errors in AnimatedCounter.tsx.

**Commit:** `git add src/components/AnimatedCounter.tsx && git commit -m "feat: add prefix prop to AnimatedCounter"`

---

### Task 2: Emotional Journey bar entrance animations

**Files:**
- Modify: `app/(app)/insights.tsx`

**Context:** The Emotional Journey section (lines 258-279) renders stacked horizontal bars (positive/neutral/negative segments) for each week. Currently they appear instantly. We want each row to fade-in-up with a stagger, and the bar container to scale from 0 to full width.

**Implementation:**

1. Add imports if not present: `useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing` from `react-native-reanimated`
2. Create an `AnimatedBarRow` sub-component inside the file:

```tsx
function AnimatedBarRow({ week, index }: { week: { week: string; positive: number; neutral: number; negative: number; total: number }; index: number }) {
  const scaleX = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withDelay(
      index * 60,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(index * 60)}
      style={styles.emotionRow}
    >
      <Text style={styles.weekLabel}>{formatWeekLabel(week.week)}</Text>
      {week.total > 0 ? (
        <Animated.View style={[styles.barContainer, barAnimatedStyle]}>
          {week.positive > 0 && (
            <View style={[styles.barSegment, styles.barPositive, { flex: week.positive }]} />
          )}
          {week.neutral > 0 && (
            <View style={[styles.barSegment, styles.barNeutral, { flex: week.neutral }]} />
          )}
          {week.negative > 0 && (
            <View style={[styles.barSegment, styles.barNegative, { flex: week.negative }]} />
          )}
        </Animated.View>
      ) : (
        <Animated.View style={[styles.barContainer, barAnimatedStyle]}>
          <View style={[styles.barSegment, styles.barEmpty, { flex: 1 }]} />
        </Animated.View>
      )}
    </Animated.View>
  );
}
```

3. Replace the existing `{insights.emotionalJourney.map((week) => (` block (lines 258-278) with:

```tsx
{insights.emotionalJourney.map((week, index) => (
  <AnimatedBarRow key={week.week} week={week} index={index} />
))}
```

4. The legend and sentiment summary remain unchanged.

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(app)/insights.tsx && git commit -m "feat: add entrance animations to Emotional Journey bars"`

---

### Task 3: Communication trend bar grow animations

**Files:**
- Modify: `app/(app)/insights.tsx`

**Context:** The communication trend section (lines 317-332) renders vertical bars whose height is calculated from `avgWords`. Currently the height is set statically. We want bars to grow from 0 to their calculated height with a stagger.

**Implementation:**

1. Create an `AnimatedTrendBar` sub-component inside the file:

```tsx
function AnimatedTrendBar({ targetHeight, index, week }: { targetHeight: number; index: number; week: string }) {
  const height = useSharedValue(4);

  useEffect(() => {
    height.value = withDelay(
      index * 80,
      withTiming(targetHeight, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View style={styles.trendColumn}>
      <Animated.View style={[styles.trendBar, animatedStyle]} />
      <Text style={styles.trendWeekLabel}>{formatWeekLabel(week)}</Text>
    </View>
  );
}
```

2. Replace the existing trend bar map (lines 319-330) with:

```tsx
{insights.responseLengthTrend.map((w, index) => {
  const maxWords = Math.max(...insights.responseLengthTrend.map((t) => t.avgWords), 1);
  const targetHeight = w.avgWords > 0
    ? 20 + (w.avgWords / maxWords) * 40
    : 4;
  return (
    <AnimatedTrendBar
      key={w.week}
      targetHeight={targetHeight}
      index={index}
      week={w.week}
    />
  );
})}
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(app)/insights.tsx && git commit -m "feat: add grow animation to Communication trend bars"`

---

### Task 4: Milestone locked badge treatment

**Files:**
- Modify: `app/(app)/insights.tsx`

**Context:** Locked milestone badges (lines 163-169) use `opacity: 0.3` on the icon and `backgroundColor: '#f5f5f4'` with `borderColor: '#e7e5e4'`. This is too subtle. We add a lock overlay, dashed border, and raise opacity.

**Implementation:**

1. Change `badgeIconLocked` style: `opacity: 0.3` → `opacity: 0.4`

2. Change `badgeCircleLocked` style: add `borderStyle: 'dashed'`

```tsx
badgeCircleLocked: {
  backgroundColor: '#f5f5f4',
  borderColor: '#d6d3d1',
  borderStyle: 'dashed',
},
```

3. Add a lock overlay to the locked badge JSX. Change from:

```tsx
<View key={m.id} style={styles.badge}>
  <View style={[styles.badgeCircle, styles.badgeCircleLocked]}>
    <Text style={styles.badgeIconLocked}>{m.icon}</Text>
  </View>
  <Text style={[styles.badgeTitle, styles.badgeTitleLocked]} numberOfLines={1}>{m.title}</Text>
</View>
```

to:

```tsx
<View key={m.id} style={styles.badge}>
  <View style={[styles.badgeCircle, styles.badgeCircleLocked]}>
    <Text style={styles.badgeIconLocked}>{m.icon}</Text>
    <View style={styles.lockOverlay}>
      <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
    </View>
  </View>
  <Text style={[styles.badgeTitle, styles.badgeTitleLocked]} numberOfLines={1}>{m.title}</Text>
</View>
```

4. Add new styles:

```tsx
lockOverlay: {
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: '#ffffff',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},
lockIcon: {
  fontSize: 8,
},
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(app)/insights.tsx && git commit -m "feat: add lock overlay and dashed border to locked milestone badges"`

---

### Task 5: Love Language circle entrance animations

**Files:**
- Modify: `app/(app)/insights.tsx`

**Context:** The Love Language circles (lines 222-251) are static. We want them to spring in with a scale effect when the card becomes visible.

**Implementation:**

1. Create an `AnimatedLoveLanguageCircle` sub-component:

```tsx
function AnimatedLoveLanguageCircle({ children, delay }: { children: React.ReactNode; delay: number }) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(delay)}
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
}
```

2. Wrap each `loveLanguageItem` View. Change:

```tsx
<View style={styles.loveLanguageRow}>
  <View style={styles.loveLanguageItem}>
    ...user circle...
  </View>
  <View style={styles.loveLanguageItem}>
    ...partner circle...
  </View>
</View>
```

to:

```tsx
<View style={styles.loveLanguageRow}>
  <AnimatedLoveLanguageCircle delay={0}>
    <View style={styles.loveLanguageItem}>
      ...user circle...
    </View>
  </AnimatedLoveLanguageCircle>
  <AnimatedLoveLanguageCircle delay={100}>
    <View style={styles.loveLanguageItem}>
      ...partner circle...
    </View>
  </AnimatedLoveLanguageCircle>
</View>
```

3. Add `flex: 1` to the animated wrapper's style so the row layout isn't broken — or move `flex: 1` from `loveLanguageItem` to the wrapper. Actually, since `loveLanguageItem` already has `flex: 1`, the wrapper `Animated.View` needs `flex: 1` too. Add it inline: `style={[animatedStyle, { flex: 1 }]}`

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(app)/insights.tsx && git commit -m "feat: add spring entrance to Love Language circles"`

---

### Task 6: Streak values + Communication stats → AnimatedCounter

**Files:**
- Modify: `app/(app)/insights.tsx`

**Context:** Streak section (lines 359-369) uses `<Text style={styles.streakValue}>{insights.currentStreak}</Text>` — should use `AnimatedCounter`. Communication section (lines 311, 315) uses plain text for avg words and talked-about-it rate — should use `AnimatedCounter` with prefix/suffix.

**Implementation:**

1. `AnimatedCounter` is already imported via `@components`. Verify it's in the import.

2. Replace streak values:

From:
```tsx
<Text style={styles.streakValue}>{insights.currentStreak}</Text>
```
To:
```tsx
<AnimatedCounter value={insights.currentStreak} style={styles.streakValue} />
```

From:
```tsx
<Text style={styles.streakValue}>{insights.longestStreak}</Text>
```
To:
```tsx
<AnimatedCounter value={insights.longestStreak} style={styles.streakValue} />
```

3. Replace communication stat values:

From:
```tsx
<Text style={styles.commStatValue}>~{insights.avgResponseWords} words</Text>
```
To:
```tsx
<AnimatedCounter value={insights.avgResponseWords} style={styles.commStatValue} prefix="~" suffix=" words" />
```

From:
```tsx
<Text style={styles.commStatValue}>{insights.talkedAboutItRate}%</Text>
```
To:
```tsx
<AnimatedCounter value={insights.talkedAboutItRate} style={styles.commStatValue} suffix="%" />
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(app)/insights.tsx && git commit -m "feat: use AnimatedCounter for streak values and communication stats"`

---

### Task 7: Final verification

**Files:** None (verification only)

**Steps:**

1. Run `npm run typecheck` — confirm no new type errors
2. Run `npm test` — confirm all tests pass
3. Review git log for clean commits

**Commit:** No commit needed.
