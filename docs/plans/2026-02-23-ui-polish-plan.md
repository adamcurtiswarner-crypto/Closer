# UI Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate loading states, error states, the completion moment, paywall, and onboarding selectors to match the polish of the main app screens.

**Architecture:** In-place enhancement of 6 existing components/screens. No new abstractions — each task modifies one file (sometimes two). Shimmer uses translateX overlay. Sparkle particles use reanimated shared values. All changes are visual-only with no data model changes.

**Tech Stack:** react-native-reanimated v3 (already installed), expo-haptics, react-native StyleSheet

---

### Task 1: Skeleton shimmer effect

**Files:**
- Modify: `src/components/Skeleton.tsx`

**Context:** The `Skeleton` component currently uses opacity pulsing (0.3 → 0.7 → 0.3). We replace this with a left-to-right shimmer highlight sweep for a more modern loading feel. The `PromptCardSkeleton` and `MemoryCardSkeleton` composites stay unchanged — they just use `<Skeleton>` which will automatically get the shimmer.

**Implementation:**

Replace the entire `Skeleton` component with a version that uses a translating highlight overlay. The technique: render a semi-transparent white band that slides left-to-right across the skeleton using `translateX` animation. Use `overflow: 'hidden'` on the container and a wider-than-container highlight view that animates from left edge to right edge.

```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 150 }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e7e5e4',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}
```

Keep `PromptCardSkeleton` and `MemoryCardSkeleton` exactly as-is — they compose `<Skeleton>` and will inherit the shimmer automatically.

**Verify:** Run `npm run typecheck` — no new errors in Skeleton.tsx.

**Commit:** `git add src/components/Skeleton.tsx && git commit -m "feat: add shimmer effect to skeleton loading"`

---

### Task 2: QueryError redesign

**Files:**
- Modify: `src/components/QueryError.tsx`

**Context:** Currently a bare-bones text + retry button. Redesign to a centered card with icon, title/subtitle split, and accent-styled retry pill.

**Implementation:**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = 'Something went wrong.',
  onRetry,
}: QueryErrorProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{'\u2601'}</Text>
        <Text style={styles.title}>Couldn't load</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#292524',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#c97454',
  },
  buttonText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
  },
});
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/QueryError.tsx && git commit -m "feat: redesign QueryError with card layout and accent retry button"`

---

### Task 3: OfflineBanner polish

**Files:**
- Modify: `src/components/OfflineBanner.tsx`

**Context:** Currently a flat gray bar. Polish with warmer color, warning icon with pulsing attention animation, and safe area positioning.

**Implementation:**

```tsx
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-(60 + insets.top));
  const iconOpacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(isConnected ? -(60 + insets.top) : 0, { duration: 300 });
    if (!isConnected) {
      iconOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else {
      iconOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isConnected]);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  return (
    <Animated.View style={[styles.banner, { paddingTop: insets.top + 8 }, bannerStyle]}>
      <Animated.Text style={[styles.icon, iconStyle]}>{'\u26A0'}</Animated.Text>
      <Text style={styles.text}>
        {t('offline.banner')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#57534e',
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
});
```

**Note:** `useSafeAreaInsets` is already available — `react-native-safe-area-context` is installed and used elsewhere (today.tsx imports `SafeAreaView` from it).

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/OfflineBanner.tsx && git commit -m "feat: polish OfflineBanner with warmer styling and pulsing warning icon"`

---

### Task 4: CompletionMoment sparkle particles

**Files:**
- Modify: `src/components/CompletionMoment.tsx`

**Context:** This is the emotional peak — both partners answered. Currently clean but understated. Add: (1) sparkle particles floating around the header, (2) scale-in entrance spring on the card, (3) haptic on mount. Keep the existing staggered FadeInUp on response cards.

**Implementation:**

Add a `SparkleParticle` sub-component that renders a small animated dot. Each particle floats upward and fades out using shared values. Wrap the card in an `Animated.View` with a scale-in spring. Fire haptic on mount.

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ResponseCard } from './ResponseCard';

interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName?: string;
  yourImageUrl?: string | null;
  partnerImageUrl?: string | null;
}

function SparkleParticle({ delay, x }: { delay: number; x: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withTiming(-30, { duration: 1500, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withTiming(0, { duration: 1500, easing: Easing.in(Easing.cubic) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - Math.abs(translateY.value) / 30),
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 20,
          left: x,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#c97454',
        },
        animatedStyle,
      ]}
    />
  );
}

const SPARKLE_POSITIONS = [
  { x: 40, delay: 200 },
  { x: 80, delay: 400 },
  { x: 140, delay: 100 },
  { x: 200, delay: 500 },
  { x: 260, delay: 300 },
  { x: 300, delay: 600 },
];

export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName = 'Partner',
  yourImageUrl,
  partnerImageUrl,
}: CompletionMomentProps) {
  const cardScale = useSharedValue(0.95);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cardScale.value = withSpring(1, { damping: 14, stiffness: 150 });
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Animated.View style={cardAnimatedStyle}>
      <View style={styles.card}>
        {/* Accent bar */}
        <View style={styles.accentBar} />

        {/* Sparkle particles */}
        {SPARKLE_POSITIONS.map((s, i) => (
          <SparkleParticle key={i} delay={s.delay} x={s.x} />
        ))}

        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.headerRow}>
            <Text style={styles.headerIcon}>{'\u2728'}</Text>
            <Text style={styles.header}>You both answered</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <Text style={styles.promptText}>{'\u201C'}{promptText}{'\u201D'}</Text>
        </Animated.View>

        <View style={styles.responses}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <ResponseCard
              label="You"
              responseText={yourResponse}
              imageUrl={yourImageUrl}
              isYours={true}
            />
          </Animated.View>
          <View style={styles.spacer} />
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <ResponseCard
              label={partnerName}
              responseText={partnerResponse}
              imageUrl={partnerImageUrl}
              isYours={false}
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(400).delay(600)}>
          <View style={styles.footerRow}>
            <View style={styles.footerDot} />
            <Text style={styles.footer}>Another moment saved</Text>
            <View style={styles.footerDot} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// styles unchanged from current — keep existing styles object
```

The styles object stays exactly as-is from the current file. Only the component body and imports change.

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/CompletionMoment.tsx && git commit -m "feat: add sparkle particles and scale-in entrance to CompletionMoment"`

---

### Task 5: Paywall redesign

**Files:**
- Modify: `src/components/Paywall.tsx`

**Context:** Replace basic "+" markers with checkmark circles, add warm tint header, accent bar, feature descriptions, entrance animations, and CTA shadow.

**Implementation:**

Update the `FEATURES` array to include descriptions. Add accent bar, warm header tint, checkmark circles, FadeInUp stagger on features, and shadow on CTA.

```tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';

const FEATURES = [
  { title: 'Unlimited saved memories', subtitle: 'Keep every meaningful moment' },
  { title: 'Streak badges & insights', subtitle: 'Track your connection over time' },
  { title: 'Tone calibration insights', subtitle: 'Prompts tailored to your relationship' },
  { title: 'Priority support', subtitle: 'Help when you need it' },
];

export function Paywall({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { offering, purchase, restore, isLoading } = useSubscription();
  const { t } = useTranslation();

  const mainPackage = offering?.availablePackages?.[0] ?? null;
  const priceString = mainPackage?.product?.priceString || '$4.99/mo';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Accent bar */}
          <View style={styles.accentBar} />

          {/* Warm header area */}
          <View style={styles.headerArea}>
            <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
              {t('paywall.title')}
            </Animated.Text>
            <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.subtitle}>
              {t('paywall.subtitle')}
            </Animated.Text>
          </View>

          <View style={styles.featureList}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInUp.duration(400).delay(200 + index * 80)}
                style={styles.featureRow}
              >
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>{'\u2713'}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInUp.duration(400).delay(600)}>
            <TouchableOpacity
              style={[styles.ctaButton, (!mainPackage || isLoading) && styles.disabled]}
              onPress={() => mainPackage && purchase(mainPackage)}
              disabled={!mainPackage || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.ctaText}>{t('paywall.startPremium', { price: priceString })}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.restoreButton} onPress={restore}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t('paywall.notNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    backgroundColor: '#c97454',
  },
  headerArea: {
    backgroundColor: '#fef7f4',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  featureList: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: '#292524',
    fontWeight: '500',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#a8a29e',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#c97454',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#c97454',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: '#78716c',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 15,
    color: '#a8a29e',
  },
});
```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add src/components/Paywall.tsx && git commit -m "feat: redesign Paywall with accent bar, checkmark features, and warm header tint"`

---

### Task 6: Onboarding pill selectors — preferences.tsx

**Files:**
- Modify: `app/(onboarding)/preferences.tsx`

**Context:** The time-option rows already use warm tint when selected (`#fef7f4` bg, `#e8c4b0` border). But they have a radio circle inside. Replace the radio with a trailing checkmark that appears on selection, and add a subtle scale spring when tapped.

**Implementation:**

Remove the `<View style={styles.radio}>` block. Add a trailing checkmark that only renders when selected. Add `useSharedValue` per option for scale spring (or simpler: use `Animated.View` with a quick scale effect on the whole row). The simplest approach: wrap each `TouchableOpacity` content with the existing `Animated.View` and add a checkmark text on the right side.

Changes to `preferences.tsx`:

1. Remove the `radio`, `radioSelected`, `radioDefault`, `radioDot` styles
2. Remove the `<View style={[styles.radio, ...]}>` block from inside each option row
3. Add a checkmark on the right side when selected:
   ```tsx
   <View style={styles.optionContent}>
     <Text style={[styles.optionText, ...]}>{option.label}</Text>
     {selectedTime === option.value && (
       <Text style={styles.selectedCheck}>{'\u2713'}</Text>
     )}
   </View>
   ```
4. Add styles:
   ```tsx
   optionContent: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     flex: 1,
   },
   selectedCheck: {
     fontSize: 16,
     fontWeight: '700',
     color: '#c97454',
   },
   ```
5. Update `optionRowSelected` border to `borderColor: '#c97454'` and `borderWidth: 2` for stronger active signal (matching tone-calibration pattern).
6. Update `optionRowDefault` to `borderWidth: 1` (keep current).

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(onboarding)/preferences.tsx && git commit -m "feat: replace radio buttons with pill-style selectors in preferences"`

---

### Task 7: Onboarding pill selectors — tone-calibration.tsx

**Files:**
- Modify: `app/(onboarding)/tone-calibration.tsx`

**Context:** Already uses warm-tint cards with border highlight. Just needs: (1) trailing checkmark when selected and (2) slightly better border handling — `borderWidth` jumps from 1 to 2 on selection which shifts layout. Fix by using consistent `borderWidth: 1.5` or padding the difference.

**Implementation:**

1. Add checkmark to the right side of each option card when selected:
   ```tsx
   <View style={styles.optionHeader}>
     <Text style={[styles.optionLabel, ...]}>{option.label}</Text>
     {selectedTone === option.value && (
       <Text style={styles.selectedCheck}>{'\u2713'}</Text>
     )}
   </View>
   ```
2. Normalize border widths: both states use `borderWidth: 1.5` to prevent layout shift. Selected gets `borderColor: '#c97454'`, default gets `borderColor: '#e7e5e4'`.
3. Add styles:
   ```tsx
   optionHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   selectedCheck: {
     fontSize: 16,
     fontWeight: '700',
     color: '#c97454',
   },
   ```

**Verify:** Run `npm run typecheck` — no new errors.

**Commit:** `git add app/(onboarding)/tone-calibration.tsx && git commit -m "feat: add checkmark and normalize borders in tone-calibration selectors"`

---

### Task 8: Final verification

**Files:** None (verification only)

**Steps:**

1. Run `npm run typecheck` — confirm no new type errors (pre-existing admin/function errors are OK)
2. Run `npm test` — confirm all 92 tests pass (pre-existing function suite fail is OK)
3. Visually review the git log to confirm 7 clean commits

**Commit:** No commit needed.
