# Engagement Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an adaptive engagement engine that adopts Paired's 5 best patterns, adds AI-powered coaching, and closes the guidance loop so every insight drives action.

**Architecture:** 6 phases, each delivering working functionality. Phase 1 is frontend-only quick wins. Phases 2-3 build data infrastructure and billing. Phases 4-6 wire up the intelligence layer. Cloud Function pipeline (weekly batch) computes relationship pulse and generates Claude-powered coaching insights.

**Tech Stack:** React Native, Expo, Firebase (Firestore, Cloud Functions), RevenueCat, Anthropic Claude API (`claude-sonnet-4-5-20250929`), react-native-reanimated

**Design doc:** `docs/plans/2026-02-28-engagement-engine-design.md`

---

## Phase 1: Locked Answers + Smart Notifications + 5-Min Framing

*Frontend-only changes + one Cloud Function tweak. Ship immediately.*

---

### Task 1: Locked-answer "waiting" mode

**Files:**
- Modify: `app/(app)/today.tsx` (lines 447-533, the "waiting" mode section)

**Context:** Currently when you submit a response, mode='waiting' shows your response text in a grey block (lines 481-490). The new behavior hides your response behind a sealed card — "Your answer is saved. Waiting for [partner name]..." with a lock icon. This creates anticipation for the reveal.

**Step 1: Replace the waiting mode response display**

In `today.tsx`, find the waiting mode section (~line 447). Replace the block that shows the user's response text with a sealed card:

```tsx
{/* Sealed response card */}
<Animated.View entering={FadeIn.duration(400)} style={styles.sealedCard}>
  <Icon name="lock" size="md" color="#c97454" weight="light" />
  <Text style={styles.sealedTitle}>Your answer is saved</Text>
  <Text style={styles.sealedSubtitle}>
    Waiting for {partnerName ?? 'your partner'}...
  </Text>
</Animated.View>
```

Remove the `<View style={styles.yourResponseContainer}>` block that was showing the response text. Keep the partner typing/waiting indicator below.

Add styles:
```typescript
sealedCard: {
  backgroundColor: '#fef7f4',
  borderRadius: 16,
  padding: 24,
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
},
sealedTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#1c1917',
},
sealedSubtitle: {
  fontSize: 13,
  color: '#a8a29e',
},
```

**Step 2: Verify in simulator**

Run the app. Submit a response to today's prompt. You should see the sealed card with lock icon instead of your response text.

**Step 3: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: add locked-answer waiting state — hide response until both partners answer"
```

---

### Task 2: Locked-answer reveal animation in CompletionMoment

**Files:**
- Modify: `src/components/CompletionMoment.tsx`

**Context:** Currently CompletionMoment shows both response cards immediately on mount with a spring scale animation (line 84). The new behavior starts with blurred/hidden cards that reveal with a staggered animation — your response first, partner's 200ms later.

**Step 1: Add reveal animation to ResponseCard**

In `CompletionMoment.tsx`, find the two `ResponseCard` renders (~lines 116-131). Wrap each in an `Animated.View` with staggered `FadeInUp`:

```tsx
{/* Your response - reveals first */}
<Animated.View entering={FadeInUp.duration(500).delay(400)}>
  <ResponseCard label="You" ... />
</Animated.View>

{/* Partner response - reveals 200ms later */}
<Animated.View entering={FadeInUp.duration(500).delay(600)}>
  <ResponseCard label={partnerName ?? 'Partner'} ... />
</Animated.View>
```

Import `FadeInUp` from `react-native-reanimated` if not already imported.

The existing sparkle animation and spring scale remain. The stagger creates a "reveal" feel — the card structure appears first, then responses fade up one at a time.

**Step 2: Verify in simulator**

Complete a prompt as both partners (use emulator). Responses should reveal with staggered animation.

**Step 3: Commit**

```bash
git add src/components/CompletionMoment.tsx
git commit -m "feat: add staggered reveal animation to CompletionMoment"
```

---

### Task 3: Smarter partner notification copy

**Files:**
- Modify: `functions/src/index.ts` (lines 536-557, the notification section in onResponseSubmitted)

**Context:** Currently the notification for first response is generic: title "Stoke", body "Your partner answered." We need two distinct notifications:
1. First response → partner gets: "[Name] answered today's prompt. Your turn — takes 2 minutes."
2. Second response (completion) → first responder gets: "[Name] answered too. Tap to reveal both responses."

**Step 1: Update first-response notification**

In `onResponseSubmitted` (~line 548), find the `sendPushNotification` call for first response. The responding user's display name is available from their user doc. Update:

```typescript
// First response - notify partner to answer
const responderDoc = await db.collection('users').doc(response.user_id).get();
const responderName = responderDoc.data()?.display_name || 'Your partner';

await sendPushNotification(partnerId, {
  title: responderName,
  body: `answered today's prompt. Your turn — takes 2 minutes.`,
});
```

**Step 2: Add completion notification to first responder**

After the completion doc is created (~line 528), add a notification to the FIRST responder:

```typescript
// Notify first responder that both have answered
const firstResponderId = assignment.first_responder_id;
if (firstResponderId && firstResponderId !== response.user_id) {
  const secondResponderDoc = await db.collection('users').doc(response.user_id).get();
  const secondResponderName = secondResponderDoc.data()?.display_name || 'Your partner';

  await sendPushNotification(firstResponderId, {
    title: secondResponderName,
    body: `answered too. Tap to reveal both responses.`,
  });
}
```

Note: This requires `first_responder_id` on the assignment. In the first-response handler, add:
```typescript
updates.first_responder_id = response.user_id;
```

**Step 3: Build and test**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
```

**Step 4: Commit**

```bash
cd /Users/adamwarner/stoke-app/app
git add functions/src/index.ts
git commit -m "feat: smarter partner notification copy with names and reveal CTA"
```

---

### Task 4: "5 minutes a day" copy updates

**Files:**
- Modify: `app/(app)/today.tsx` (empty state copy)
- Modify: `src/i18n/locales/en.json` (add new keys)

**Context:** Update copy across key touchpoints to reinforce the "5 minutes a day" framing. This is a copy-only change.

**Step 1: Update empty state copy in today.tsx**

Find the empty state text (~line 308) that currently says something like "Your prompt is on the way". Update to:

```tsx
<Text style={styles.emptyTitle}>Today's 5-minute connection</Text>
<Text style={styles.emptySubtitle}>Your prompt is on the way</Text>
```

Also update the prompt card header if it has generic text — add a subtle "~5 min" badge.

**Step 2: Add i18n keys**

In `src/i18n/locales/en.json`, add:
```json
"today.emptyTitle": "Today's 5-minute connection",
"today.emptySubtitle": "Your prompt is on the way",
"today.promptBadge": "~5 min"
```

**Step 3: Commit**

```bash
git add app/\(app\)/today.tsx src/i18n/locales/en.json
git commit -m "feat: add '5 minutes a day' framing to Today screen copy"
```

---

### Task 5: Value prop onboarding screen

**Files:**
- Create: `app/(onboarding)/value-prop.tsx`
- Modify: `app/(onboarding)/_layout.tsx` (add screen to stack)

**Context:** New screen in onboarding flow BEFORE preferences. Shows the value proposition: "Stay connected in just 5 minutes a day" with a warm illustration.

**Step 1: Create the screen**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Icon } from '@/components';

export default function ValuePropScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.iconRow}>
          <Icon name="flame" size="xl" color="#c97454" weight="fill" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text style={styles.title}>Stay connected in{'\n'}just 5 minutes a day</Text>
          <Text style={styles.subtitle}>
            One thoughtful question, answered together.{'\n'}
            That's all it takes to keep the spark alive.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.features}>
          <FeatureRow icon="check" text="Daily prompts designed for couples" />
          <FeatureRow icon="lock" text="Private and encrypted" />
          <FeatureRow icon="heart" text="Built on relationship science" />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(600)}>
        <Button title="Continue" onPress={() => router.push('/(onboarding)/preferences')} />
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: 'check' | 'lock' | 'heart'; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Icon name={icon} size="sm" color="#c97454" weight="bold" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9', padding: 24 },
  content: { flex: 1, justifyContent: 'center' },
  iconRow: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#57534e', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  featureText: { fontSize: 15, color: '#57534e' },
});
```

**Step 2: Add to onboarding stack**

In `app/(onboarding)/_layout.tsx`, add the screen BEFORE preferences:

```tsx
<Stack.Screen name="value-prop" options={{ animation: 'slide_from_right' }} />
```

Update the navigation from `waiting-partner.tsx` (or wherever the previous screen routes) to go to `value-prop` instead of `preferences`.

**Step 3: Commit**

```bash
git add app/\(onboarding\)/value-prop.tsx app/\(onboarding\)/_layout.tsx
git commit -m "feat: add value-prop onboarding screen with '5 minutes a day' framing"
```

---

## Phase 2: Relationship Stage + Firestore Schema

*Collect data for future personalization. Add new collection schemas.*

---

### Task 6: Add relationship_stage to types and User doc

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useAuth.tsx` (map new field)
- Modify: `firestore.rules` (allow new field)

**Step 1: Add type**

In `src/types/index.ts`, add:
```typescript
export type RelationshipStage = 'dating' | 'engaged' | 'married' | 'long_distance';
```

Add to User interface:
```typescript
relationshipStage: RelationshipStage | null;
```

**Step 2: Map in useAuth fetchUserDoc**

In `src/hooks/useAuth.tsx`, in the `fetchUserDoc` function where user data is mapped (~line 85), add:
```typescript
relationshipStage: data.relationship_stage || null,
```

Also add `relationship_stage: null` to the auto-create user doc block (~line 62).

**Step 3: Commit**

```bash
git add src/types/index.ts src/hooks/useAuth.tsx firestore.rules
git commit -m "feat: add relationship_stage field to User type and auth mapping"
```

---

### Task 7: Relationship stage onboarding screen

**Files:**
- Create: `app/(onboarding)/relationship-stage.tsx`
- Modify: `app/(onboarding)/_layout.tsx`

**Context:** New screen after tone-calibration, before first-prompt. Four card options with icons.

**Step 1: Create the screen**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { Button, Icon } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import type { IconName } from '@/components/Icon';
import type { RelationshipStage } from '@/types';

const STAGES: { value: RelationshipStage; label: string; icon: IconName }[] = [
  { value: 'dating', label: 'Dating', icon: 'heart' },
  { value: 'engaged', label: 'Engaged', icon: 'star' },
  { value: 'married', label: 'Married', icon: 'handshake' },
  { value: 'long_distance', label: 'Long Distance', icon: 'map-pin' },
];

export default function RelationshipStageScreen() {
  const { user, refreshUser } = useAuth();
  const [selected, setSelected] = useState<RelationshipStage | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = (stage: RelationshipStage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(stage);
  };

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        relationship_stage: selected,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/first-prompt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>Where are you two?</Text>
          <Text style={styles.subtitle}>This helps us tailor your experience</Text>
        </Animated.View>

        <View style={styles.grid}>
          {STAGES.map((stage, i) => (
            <Animated.View key={stage.value} entering={FadeInUp.duration(400).delay(100 + i * 80)}>
              <TouchableOpacity
                style={[styles.card, selected === stage.value && styles.cardSelected]}
                onPress={() => handleSelect(stage.value)}
                activeOpacity={0.7}
              >
                <Icon
                  name={stage.icon}
                  size="lg"
                  color={selected === stage.value ? '#c97454' : '#78716c'}
                  weight={selected === stage.value ? 'fill' : 'light'}
                />
                <Text style={[styles.cardLabel, selected === stage.value && styles.cardLabelSelected]}>
                  {stage.label}
                </Text>
                {selected === stage.value && (
                  <View style={styles.checkBadge}>
                    <Icon name="check" size="xs" color="#ffffff" weight="bold" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      <Button
        title="Continue"
        onPress={handleContinue}
        disabled={!selected || saving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9', padding: 24 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1c1917', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#57534e', textAlign: 'center', marginBottom: 32 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e7e5e4',
  },
  cardSelected: { borderColor: '#c97454', backgroundColor: '#fef7f4' },
  cardLabel: { fontSize: 17, fontWeight: '600', color: '#57534e', flex: 1 },
  cardLabelSelected: { color: '#1c1917' },
  checkBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#c97454', justifyContent: 'center', alignItems: 'center',
  },
});
```

**Step 2: Add to stack and update navigation**

In `_layout.tsx`, add:
```tsx
<Stack.Screen name="relationship-stage" options={{ animation: 'slide_from_right' }} />
```

In `tone-calibration.tsx`, update the navigation to route to `relationship-stage` instead of `first-prompt`.

**Step 3: Commit**

```bash
git add app/\(onboarding\)/relationship-stage.tsx app/\(onboarding\)/_layout.tsx app/\(onboarding\)/tone-calibration.tsx
git commit -m "feat: add relationship stage selection to onboarding flow"
```

---

### Task 8: Existing user relationship stage prompt

**Files:**
- Modify: `app/(app)/today.tsx`
- Modify: `src/hooks/useAuth.tsx` (check for new field)

**Context:** For users who already completed onboarding, show a one-time dismissable card on Today screen asking them to select their relationship stage. Uses the same stage options. Dismissed permanently after selection or explicit dismiss.

**Step 1: Add stage prompt to Today screen**

In `today.tsx`, add a card above the daily prompt area (but below ConnectionHeader) when `user.relationshipStage === null && user.isOnboarded`:

```tsx
{!user?.relationshipStage && user?.isOnboarded && !stageDismissed && (
  <Animated.View entering={FadeIn.duration(400)} style={styles.stagePromptCard}>
    <Text style={styles.stagePromptTitle}>Help us personalize</Text>
    <Text style={styles.stagePromptSubtitle}>What stage is your relationship?</Text>
    <View style={styles.stageButtons}>
      {STAGES.map(s => (
        <TouchableOpacity key={s.value} style={styles.stageChip} onPress={() => handleSetStage(s.value)}>
          <Icon name={s.icon} size="sm" color="#c97454" />
          <Text style={styles.stageChipText}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <TouchableOpacity onPress={() => setStageDismissed(true)}>
      <Text style={styles.stageSkip}>Not now</Text>
    </TouchableOpacity>
  </Animated.View>
)}
```

Use AsyncStorage key `'stage_prompt_dismissed'` to persist the dismiss state across sessions.

`handleSetStage` writes to Firestore and calls `refreshUser()`.

**Step 2: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: add one-time relationship stage prompt for existing users"
```

---

### Task 9: Firestore rules and schema for new collections

**Files:**
- Modify: `firestore.rules`

**Context:** Add security rules for the 3 new subcollections: `check_ins`, `pulse_scores`, `coaching_insights`. All follow the same pattern as existing couple subcollections — couple members can read, only Cloud Functions write.

**Step 1: Add rules**

After the existing `messages` subcollection rules in `firestore.rules`, add:

```
// Check-ins — private per user, only the user who created can read their own
match /couples/{coupleId}/check_ins/{checkInId} {
  allow read: if isCoupleMember(coupleId) && resource.data.user_id == request.auth.uid;
  allow create: if isCoupleMember(coupleId) && request.resource.data.user_id == request.auth.uid;
}

// Pulse scores — couple members can read, only functions write
match /couples/{coupleId}/pulse_scores/{weekId} {
  allow read: if isCoupleMember(coupleId);
}

// Coaching insights — couple members can read and update (dismiss/acted_on), only functions create
match /couples/{coupleId}/coaching_insights/{weekId} {
  allow read: if isCoupleMember(coupleId);
  allow update: if isCoupleMember(coupleId)
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['dismissed_at', 'acted_on']);
}
```

**Step 2: Deploy rules**

```bash
cd /Users/adamwarner/stoke-app/app && npx firebase deploy --only firestore:rules
```

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for check_ins, pulse_scores, coaching_insights"
```

---

## Phase 3: Shared Premium (RevenueCat)

*Full billing infrastructure with couple-level access.*

---

### Task 10: Extend Couple type and useSubscription for couple-level Premium

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useSubscription.ts`
- Modify: `src/hooks/useCouple.ts` (expose new fields)

**Step 1: Add Premium fields to Couple type**

In `src/types/index.ts`, add to Couple interface:
```typescript
premiumUntil: Date | null;
premiumSource: string | null; // user ID of purchaser
```

**Step 2: Update useSubscription**

Modify `useSubscription.ts` to check **both** RevenueCat entitlement AND couple doc `premium_until`:

```typescript
// After existing RevenueCat check:
const coupleIsPremium = couple?.premiumUntil
  ? new Date(couple.premiumUntil) > new Date()
  : false;

const isPremium = revenueCatPremium || coupleIsPremium || __DEV__;
```

This means: if EITHER partner has purchased via RevenueCat, OR the couple doc says premium (synced by webhook), they're Premium.

**Step 3: Update useCouple to map new fields**

In `useCouple.ts`, in the data mapping, add:
```typescript
premiumUntil: data.premium_until?.toDate() || null,
premiumSource: data.premium_source || null,
```

**Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/useSubscription.ts src/hooks/useCouple.ts
git commit -m "feat: extend subscription check to couple-level Premium access"
```

---

### Task 11: RevenueCat webhook Cloud Function

**Files:**
- Modify: `functions/src/index.ts`

**Context:** RevenueCat sends webhook events when subscriptions are purchased, renewed, or canceled. This function receives those events and updates the couple doc.

**Step 1: Add onSubscriptionEvent function**

```typescript
export const onSubscriptionEvent = onRequest(async (req, res) => {
  // Verify RevenueCat webhook authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    res.status(401).send('Unauthorized');
    return;
  }

  const event = req.body.event;
  const appUserId = event.app_user_id;
  const type = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION

  if (!appUserId) {
    res.status(400).send('Missing app_user_id');
    return;
  }

  // Find the user's couple
  const userDoc = await db.collection('users').doc(appUserId).get();
  const coupleId = userDoc.data()?.couple_id;

  if (!coupleId) {
    logger.warn('Subscription event for user without couple:', appUserId);
    res.status(200).send('OK - no couple');
    return;
  }

  const coupleRef = db.collection('couples').doc(coupleId);

  if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
    const expiresAt = event.expiration_at_ms
      ? admin.firestore.Timestamp.fromMillis(event.expiration_at_ms)
      : null;

    await coupleRef.update({
      premium_until: expiresAt,
      premium_source: appUserId,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Premium activated for couple ${coupleId} until ${expiresAt}`);
  } else if (type === 'EXPIRATION') {
    // Don't clear premium_until — let it lapse naturally
    logger.info(`Subscription expired for couple ${coupleId}`);
  }

  res.status(200).send('OK');
});
```

**Step 2: Build**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
```

**Step 3: Commit**

```bash
cd /Users/adamwarner/stoke-app/app
git add functions/src/index.ts
git commit -m "feat: add RevenueCat webhook Cloud Function for couple-level Premium"
```

---

### Task 12: Update Paywall with new tiers and Premium features

**Files:**
- Modify: `src/components/Paywall.tsx`
- Modify: `src/i18n/locales/en.json`

**Step 1: Update feature list**

Replace the current 4-feature list with the new Premium benefits:

```tsx
const PREMIUM_FEATURES = [
  { icon: 'lightbulb' as const, text: 'AI-powered relationship coaching' },
  { icon: 'target' as const, text: 'Personalized weekly insights' },
  { icon: 'flame' as const, text: 'Adaptive prompts that grow with you' },
  { icon: 'heart' as const, text: 'Private relationship check-ins' },
];
```

Render with `<Icon>` instead of checkmark text.

**Step 2: Update pricing display**

Show both monthly and annual options with annual highlighted as best value:

```tsx
<View style={styles.planRow}>
  <TouchableOpacity
    style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
    onPress={() => setSelectedPlan('annual')}
  >
    <Text style={styles.planBadge}>Best Value</Text>
    <Text style={styles.planPrice}>$49.99/year</Text>
    <Text style={styles.planSubprice}>$4.17/month</Text>
    <Text style={styles.planTrial}>7-day free trial</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
    onPress={() => setSelectedPlan('monthly')}
  >
    <Text style={styles.planPrice}>$9.99/month</Text>
  </TouchableOpacity>
</View>
```

**Step 3: Add shared access messaging**

Below the plans, add:
```tsx
<Text style={styles.sharedNote}>One subscription covers both partners</Text>
```

**Step 4: Commit**

```bash
git add src/components/Paywall.tsx src/i18n/locales/en.json
git commit -m "feat: update Paywall with new Premium features and pricing tiers"
```

---

## Phase 4: Periodic Check-Ins

*Private pulse survey — the signal input for the algo.*

---

### Task 13: Check-in question bank and types

**Files:**
- Create: `src/config/checkInQuestions.ts`
- Modify: `src/types/index.ts`

**Step 1: Create question bank**

```typescript
export type CheckInDimension = 'connection' | 'communication' | 'satisfaction';

export interface CheckInQuestion {
  id: string;
  dimension: CheckInDimension;
  text: string;
}

export const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  // Connection
  { id: 'conn_1', dimension: 'connection', text: 'How connected have you felt to {partner} this past week?' },
  { id: 'conn_2', dimension: 'connection', text: 'How present has {partner} felt when you spend time together?' },
  { id: 'conn_3', dimension: 'connection', text: 'How supported have you felt by {partner} lately?' },
  { id: 'conn_4', dimension: 'connection', text: 'How often have you looked forward to seeing {partner}?' },
  { id: 'conn_5', dimension: 'connection', text: 'How emotionally close have you felt this week?' },

  // Communication
  { id: 'comm_1', dimension: 'communication', text: 'How easy has it been to talk openly with {partner}?' },
  { id: 'comm_2', dimension: 'communication', text: 'How heard do you feel when you share something important?' },
  { id: 'comm_3', dimension: 'communication', text: 'How comfortable are you bringing up difficult topics?' },
  { id: 'comm_4', dimension: 'communication', text: 'How well have you two handled disagreements this week?' },
  { id: 'comm_5', dimension: 'communication', text: 'How in sync do you feel about day-to-day decisions?' },

  // Satisfaction
  { id: 'sat_1', dimension: 'satisfaction', text: 'How are you feeling about your relationship right now?' },
  { id: 'sat_2', dimension: 'satisfaction', text: 'How fulfilled do you feel in your partnership?' },
  { id: 'sat_3', dimension: 'satisfaction', text: 'How optimistic are you about where things are heading?' },
  { id: 'sat_4', dimension: 'satisfaction', text: 'How much fun have you two had together lately?' },
  { id: 'sat_5', dimension: 'satisfaction', text: 'How well does your relationship match what you want it to be?' },
];

export function selectCheckInQuestions(): CheckInQuestion[] {
  const dims: CheckInDimension[] = ['connection', 'communication', 'satisfaction'];
  return dims.map(dim => {
    const pool = CHECK_IN_QUESTIONS.filter(q => q.dimension === dim);
    return pool[Math.floor(Math.random() * pool.length)];
  });
}
```

**Step 2: Add CheckIn type**

In `src/types/index.ts`:
```typescript
export interface CheckIn {
  id: string;
  userId: string;
  responses: { questionId: string; dimension: string; score: number }[];
  createdAt: Date;
}
```

**Step 3: Commit**

```bash
git add src/config/checkInQuestions.ts src/types/index.ts
git commit -m "feat: add check-in question bank with 15 questions across 3 dimensions"
```

---

### Task 14: useCheckIn hook

**Files:**
- Create: `src/hooks/useCheckIn.ts`

**Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

export function useCheckIn() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const queryClient = useQueryClient();

  // Check if user has a pending check-in
  const hasPendingCheckIn = user?.pendingCheckIn === true;

  // Fetch latest check-in for this user
  const { data: latestCheckIn, isLoading } = useQuery({
    queryKey: ['checkIn', 'latest', user?.id],
    queryFn: async () => {
      if (!user?.coupleId) return null;
      const q = query(
        collection(db, 'couples', user.coupleId, 'check_ins'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        responses: data.responses,
        createdAt: data.created_at?.toDate(),
      };
    },
    enabled: !!user?.coupleId,
  });

  // Submit check-in
  const submitCheckIn = useMutation({
    mutationFn: async (responses: { questionId: string; dimension: string; score: number }[]) => {
      if (!user?.coupleId || !user?.id) throw new Error('Not authenticated');

      await addDoc(collection(db, 'couples', user.coupleId, 'check_ins'), {
        user_id: user.id,
        responses,
        created_at: serverTimestamp(),
      });

      // Clear pending flag
      await updateDoc(doc(db, 'users', user.id), {
        pending_check_in: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIn'] });
    },
  });

  return {
    hasPendingCheckIn,
    latestCheckIn,
    isLoading,
    submitCheckIn,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useCheckIn.ts
git commit -m "feat: add useCheckIn hook for periodic check-in data"
```

---

### Task 15: CheckInCard component

**Files:**
- Create: `src/components/CheckInCard.tsx`
- Modify: `src/components/index.ts` (add export)

**Step 1: Create the component**

A warm card that presents 3 questions with a 1-5 slider for each. Slides through questions one at a time. Submits all at once.

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components';
import { selectCheckInQuestions } from '@/config/checkInQuestions';
import type { CheckInQuestion } from '@/config/checkInQuestions';

interface CheckInCardProps {
  partnerName: string;
  onSubmit: (responses: { questionId: string; dimension: string; score: number }[]) => void;
  onDismiss: () => void;
}

const SCORE_LABELS = ['', 'Not at all', 'A little', 'Somewhat', 'Quite', 'Very much'];

export function CheckInCard({ partnerName, onSubmit, onDismiss }: CheckInCardProps) {
  const [questions] = useState<CheckInQuestion[]>(() => selectCheckInQuestions());
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);

  const currentQ = questions[step];
  const questionText = currentQ.text.replace('{partner}', partnerName);

  const handleScore = (score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newScores = [...scores];
    newScores[step] = score;
    setScores(newScores);
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      const responses = questions.map((q, i) => ({
        questionId: q.id,
        dimension: q.dimension,
        score: scores[i],
      }));
      onSubmit(responses);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      <View style={styles.header}>
        <Icon name="heart" size="sm" color="#c97454" weight="light" />
        <Text style={styles.headerText}>Quick check-in</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Icon name="x" size="xs" color="#a8a29e" />
        </TouchableOpacity>
      </View>

      <Text style={styles.progress}>{step + 1} of 3</Text>

      <Animated.View key={step} entering={FadeInUp.duration(300)}>
        <Text style={styles.question}>{questionText}</Text>

        <View style={styles.scoreRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.scoreBtn, scores[step] === n && styles.scoreBtnSelected]}
              onPress={() => handleScore(n)}
            >
              <Text style={[styles.scoreNum, scores[step] === n && styles.scoreNumSelected]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {scores[step] > 0 && (
          <Text style={styles.scoreLabel}>{SCORE_LABELS[scores[step]]}</Text>
        )}
      </Animated.View>

      {scores[step] > 0 && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{step < 2 ? 'Next' : 'Done'}</Text>
          <Icon name="arrow-right" size="sm" color="#ffffff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerText: { fontSize: 14, fontWeight: '600', color: '#57534e', flex: 1 },
  dismissBtn: { padding: 4 },
  progress: { fontSize: 12, color: '#a8a29e', marginBottom: 16 },
  question: { fontSize: 17, fontWeight: '600', color: '#1c1917', lineHeight: 24, marginBottom: 20 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  scoreBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#f5f5f4', justifyContent: 'center', alignItems: 'center',
  },
  scoreBtnSelected: { backgroundColor: '#c97454' },
  scoreNum: { fontSize: 17, fontWeight: '600', color: '#57534e' },
  scoreNumSelected: { color: '#ffffff' },
  scoreLabel: { fontSize: 13, color: '#a8a29e', textAlign: 'center', marginTop: 8 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#c97454', borderRadius: 12, paddingVertical: 14, marginTop: 20,
  },
  nextBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
```

**Step 2: Export from barrel**

Add to `src/components/index.ts`:
```typescript
export { CheckInCard } from './CheckInCard';
```

**Step 3: Commit**

```bash
git add src/components/CheckInCard.tsx src/components/index.ts
git commit -m "feat: add CheckInCard component with 3-question pulse survey UI"
```

---

### Task 16: Wire check-in into Today screen + Cloud Function delivery

**Files:**
- Modify: `app/(app)/today.tsx`
- Modify: `functions/src/index.ts` (add deliverCheckIn)

**Step 1: Add CheckInCard to Today screen**

In `today.tsx`, import `useCheckIn` and `CheckInCard`. Show the card when `hasPendingCheckIn` is true, above the daily prompt:

```tsx
const { hasPendingCheckIn, submitCheckIn } = useCheckIn();

// In JSX, before the daily prompt section:
{hasPendingCheckIn && (
  <CheckInCard
    partnerName={user?.partnerName ?? 'your partner'}
    onSubmit={(responses) => submitCheckIn.mutate(responses)}
    onDismiss={() => {/* dismiss for today, re-show tomorrow */}}
  />
)}
```

**Step 2: Add deliverCheckIn Cloud Function**

In `functions/src/index.ts`:

```typescript
export const deliverCheckIn = onSchedule('every sunday 10:00', async () => {
  const usersSnap = await db.collection('users')
    .where('is_onboarded', '==', true)
    .where('is_deleted', '==', false)
    .where('couple_id', '!=', null)
    .get();

  const batch = db.batch();
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    const coupleId = userDoc.data().couple_id;
    if (!coupleId) continue;

    // Check last check-in
    const lastCheckIn = await db.collection('couples').doc(coupleId)
      .collection('check_ins')
      .where('user_id', '==', userDoc.id)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    const lastDate = lastCheckIn.empty
      ? null
      : lastCheckIn.docs[0].data().created_at?.toDate();

    const daysSinceLast = lastDate
      ? (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceLast >= 14) {
      batch.update(db.collection('users').doc(userDoc.id), {
        pending_check_in: true,
      });
      count++;
    }
  }

  await batch.commit();
  logger.info(`Delivered check-in to ${count} users`);
});
```

**Step 3: Build functions**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
```

**Step 4: Commit**

```bash
cd /Users/adamwarner/stoke-app/app
git add app/\(app\)/today.tsx functions/src/index.ts
git commit -m "feat: wire check-in into Today screen and add deliverCheckIn Cloud Function"
```

---

## Phase 5: Adaptive Algo + AI Coaching

*The intelligence layer — pulse scoring, prompt adaptation, Claude coaching.*

---

### Task 17: computeRelationshipPulse Cloud Function

**Files:**
- Modify: `functions/src/index.ts`

**Context:** Scheduled function that runs Monday 3AM PT. For each active couple, reads last 7 days of signals, computes a 0-100 pulse score, and writes to `pulse_scores` subcollection.

**Step 1: Implement the function**

```typescript
export const computeRelationshipPulse = onSchedule(
  { schedule: 'every monday 03:00', timeZone: 'America/Los_Angeles' },
  async () => {
    const couplesSnap = await db.collection('couples')
      .where('status', '==', 'active')
      .get();

    for (const coupleDoc of couplesSnap.docs) {
      try {
        await computePulseForCouple(coupleDoc.id, coupleDoc.data());
      } catch (err) {
        logger.error(`Pulse computation failed for couple ${coupleDoc.id}:`, err);
      }
    }
  }
);

async function computePulseForCouple(coupleId: string, coupleData: any) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekId = getWeekId(new Date()); // "2026-W09" format

  // 1. Fetch responses from last 7 days
  const responsesSnap = await db.collection('prompt_responses')
    .where('couple_id', '==', coupleId)
    .where('submitted_at', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
    .get();

  const responses = responsesSnap.docs.map(d => d.data());

  // 2. Fetch assignments from last 7 days
  const assignmentsSnap = await db.collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', formatDate(weekAgo))
    .get();

  const totalAssignments = assignmentsSnap.size;
  const completedAssignments = assignmentsSnap.docs.filter(d => d.data().status === 'completed').size;
  const partialAssignments = assignmentsSnap.docs.filter(d => d.data().response_count === 1).size;

  // 3. Fetch latest check-ins for both members
  const memberIds = coupleData.member_ids || [];
  const checkInScores: Record<string, number[]> = {};

  for (const memberId of memberIds) {
    const checkInSnap = await db.collection('couples').doc(coupleId)
      .collection('check_ins')
      .where('user_id', '==', memberId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (!checkInSnap.empty) {
      const data = checkInSnap.docs[0].data();
      checkInScores[memberId] = data.responses.map((r: any) => r.score);
    }
  }

  // 4. Compute signal scores
  const emotionPositive = responses.filter(r => r.emotional_response === 'positive').length;
  const emotionNegative = responses.filter(r => r.emotional_response === 'negative').length;
  const emotionTotal = responses.filter(r => r.emotional_response).length;

  const avgResponseLength = responses.length > 0
    ? responses.reduce((sum, r) => sum + (r.response_length || 0), 0) / responses.length
    : 0;

  // 5. Compute pulse score (0-100)
  let score = 50; // baseline

  // Emotion signal (high weight, +/- 20 points)
  if (emotionTotal > 0) {
    const positiveRate = emotionPositive / emotionTotal;
    const negativeRate = emotionNegative / emotionTotal;
    score += (positiveRate - negativeRate) * 20;
  }

  // Completion rate (medium weight, +/- 15 points)
  if (totalAssignments > 0) {
    const completionRate = completedAssignments / totalAssignments;
    score += (completionRate - 0.5) * 30; // 100% = +15, 0% = -15
  }

  // One-sided engagement (high weight, -10 points per one-sided day)
  score -= partialAssignments * 10;

  // Check-in scores (high weight, +/- 15 points)
  const allCheckInScores = Object.values(checkInScores).flat();
  if (allCheckInScores.length > 0) {
    const avgCheckIn = allCheckInScores.reduce((a, b) => a + b, 0) / allCheckInScores.length;
    score += (avgCheckIn - 3) * 7.5; // 5/5 = +15, 1/5 = -15
  }

  // Response length (medium weight, bonus for engagement)
  if (avgResponseLength > 100) score += 5;
  else if (avgResponseLength < 30) score -= 5;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine tier
  const tier = score >= 80 ? 'thriving' : score >= 60 ? 'steady' : score >= 40 ? 'cooling' : 'needs_attention';

  // 6. Write pulse score
  await db.collection('couples').doc(coupleId)
    .collection('pulse_scores').doc(weekId).set({
      score,
      tier,
      breakdown: {
        emotion_positive: emotionPositive,
        emotion_negative: emotionNegative,
        emotion_total: emotionTotal,
        completion_rate: totalAssignments > 0 ? completedAssignments / totalAssignments : null,
        one_sided_days: partialAssignments,
        avg_response_length: Math.round(avgResponseLength),
        avg_check_in: allCheckInScores.length > 0
          ? allCheckInScores.reduce((a, b) => a + b, 0) / allCheckInScores.length
          : null,
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  // 7. Update couple doc with latest pulse
  await db.collection('couples').doc(coupleId).update({
    current_pulse_score: score,
    current_pulse_tier: tier,
  });

  logger.info(`Pulse for couple ${coupleId}: ${score} (${tier})`);

  // 8. Check if AI coaching is needed (Phase 5 continued in Task 19)
  // Score < 80 OR dropped 15+ points
}

function getWeekId(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

**Step 2: Build and commit**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
cd /Users/adamwarner/stoke-app/app
git add functions/src/index.ts
git commit -m "feat: add computeRelationshipPulse Cloud Function with signal aggregation"
```

---

### Task 18: Pulse-based prompt selection

**Files:**
- Modify: `functions/src/index.ts` (selectPromptForCouple)

**Context:** Replace the tone-calibration weighting with pulse-based weighting. Read the latest pulse score for the couple and adjust prompt type weights accordingly.

**Step 1: Update selectPromptForCouple**

Replace `TONE_WEIGHTS` with `PULSE_WEIGHTS`:

```typescript
const PULSE_WEIGHTS: Record<string, Record<string, number>> = {
  thriving: {
    dream_exploration: 1.5,
    growth_challenge: 1.5,
  },
  steady: {
    appreciation_expression: 1.5,
    bid_for_connection: 1.5,
  },
  cooling: {
    appreciation_expression: 2,
    bid_for_connection: 2,
    fun_playful: 2,
    nostalgic_reflection: 1.5,
    conflict_navigation: 0.3,
    repair_attempt: 0.5,
  },
  needs_attention: {
    appreciation_expression: 2.5,
    fun_playful: 2.5,
    bid_for_connection: 2,
    nostalgic_reflection: 2,
    conflict_navigation: 0.1,
    repair_attempt: 0.3,
    dream_exploration: 0.5,
    growth_challenge: 0.3,
  },
};
```

In the selection logic, replace the tone-calibration lookup with:

```typescript
// Read latest pulse tier (fall back to tone calibration for couples without pulse data)
const pulseDoc = await db.collection('couples').doc(coupleId).get();
const pulseTier = pulseDoc.data()?.current_pulse_tier || 'steady';
const weights = PULSE_WEIGHTS[pulseTier] || {};
```

Keep the existing tone-calibration as fallback for couples who haven't had a pulse computed yet.

**Step 2: Build and commit**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
cd /Users/adamwarner/stoke-app/app
git add functions/src/index.ts
git commit -m "feat: replace tone-based prompt weighting with pulse-based adaptation"
```

---

### Task 19: AI coaching generation with Claude API

**Files:**
- Modify: `functions/src/index.ts` (extend computeRelationshipPulse)

**Context:** After computing pulse, if score < 80 or dropped 15+ from last week, call Claude API to generate a coaching insight. Write to `coaching_insights` subcollection. Send push notification.

**Step 1: Add coaching generation to computeRelationshipPulse**

After writing the pulse score (end of `computePulseForCouple`), add:

```typescript
// Check if coaching is needed
const prevWeekId = getWeekId(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
const prevPulseDoc = await db.collection('couples').doc(coupleId)
  .collection('pulse_scores').doc(prevWeekId).get();
const prevScore = prevPulseDoc.exists ? prevPulseDoc.data()?.score : null;
const scoreDrop = prevScore ? prevScore - score : 0;

const needsCoaching = score < 80 || scoreDrop >= 15;

if (needsCoaching) {
  // Check for Premium
  const premiumUntil = coupleData.premium_until?.toDate();
  if (!premiumUntil || premiumUntil < new Date()) {
    logger.info(`Couple ${coupleId} needs coaching but is not Premium`);
    return;
  }

  // Fetch last week's coaching to include follow-up context
  const lastCoaching = await db.collection('couples').doc(coupleId)
    .collection('coaching_insights').doc(prevWeekId).get();
  const lastAction = lastCoaching.exists ? lastCoaching.data() : null;

  // Build Claude prompt
  const prompt = buildCoachingPrompt({
    score, prevScore, tier,
    emotionPositive, emotionNegative, emotionTotal,
    avgResponseLength,
    completedAssignments, totalAssignments,
    partialAssignments,
    checkInScores: allCheckInScores,
    lastAction: lastAction ? {
      text: lastAction.action_text,
      actedOn: !!lastAction.acted_on,
    } : null,
  });

  // Call Claude API
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse response (expected format: insight on first lines, then "Suggestion: ..." and "Type: ...")
  const { insightText, actionType, actionText } = parseCoachingResponse(responseText);

  // Write coaching insight
  await db.collection('couples').doc(coupleId)
    .collection('coaching_insights').doc(weekId).set({
      pulse_score: score,
      insight_text: insightText,
      action_type: actionType,
      action_text: actionText,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      dismissed_at: null,
      acted_on: null,
    });

  // Notify both partners
  for (const memberId of memberIds) {
    const notifBody = tier === 'cooling' || tier === 'needs_attention'
      ? 'We put together something for you two this week'
      : 'Your weekly relationship insight is ready';

    await sendPushNotification(memberId, {
      title: 'Stoke',
      body: notifBody,
    });
  }
}
```

**Step 2: Add helper functions**

```typescript
function buildCoachingPrompt(data: any): string {
  const emotionSummary = data.emotionTotal > 0
    ? `${data.emotionPositive} warm, ${data.emotionTotal - data.emotionPositive - data.emotionNegative} okay, ${data.emotionNegative} hard`
    : 'No emotion data this week';

  const checkInSummary = data.checkInScores.length > 0
    ? `Avg score: ${(data.checkInScores.reduce((a: number, b: number) => a + b, 0) / data.checkInScores.length).toFixed(1)}/5`
    : 'No check-in data';

  const lastActionSummary = data.lastAction
    ? `Last week's suggestion: "${data.lastAction.text}" — ${data.lastAction.actedOn ? 'completed' : 'not taken'}`
    : 'No previous suggestion';

  return `You are a warm, non-judgmental relationship coach. Based on this couple's engagement data from the past week, write a brief (2-3 sentence) personalized insight and one specific, actionable suggestion.

Data:
- Pulse score: ${data.score}/100 (was ${data.prevScore ?? 'unknown'})
- Emotion trend: ${emotionSummary}
- Days active: ${data.completedAssignments}/${data.totalAssignments} prompts completed
- One-sided days: ${data.partialAssignments} (one partner responded but not the other)
- Check-in: ${checkInSummary}
- ${lastActionSummary}

Respond in exactly this format:
Insight: [Your 2-3 sentence observation]
Suggestion: [One specific actionable thing they can do]
Type: [One of: goal, date_night, conversation, revisit, check_in]

Tone: Warm, quiet, direct. No exclamation points. No emojis. Never blame either partner. Focus on the relationship, not individuals.`;
}

function parseCoachingResponse(text: string): { insightText: string; actionType: string; actionText: string } {
  const insightMatch = text.match(/Insight:\s*(.+?)(?=\nSuggestion:)/s);
  const suggestionMatch = text.match(/Suggestion:\s*(.+?)(?=\nType:)/s);
  const typeMatch = text.match(/Type:\s*(\w+)/);

  return {
    insightText: insightMatch?.[1]?.trim() || text.split('\n')[0],
    actionText: suggestionMatch?.[1]?.trim() || 'Take a moment to connect today',
    actionType: typeMatch?.[1]?.trim() || 'conversation',
  };
}
```

**Step 3: Build and commit**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
cd /Users/adamwarner/stoke-app/app
git add functions/src/index.ts
git commit -m "feat: add Claude AI coaching generation to pulse computation"
```

---

### Task 20: usePulseScore and useCoachingInsight hooks

**Files:**
- Create: `src/hooks/usePulseScore.ts`
- Create: `src/hooks/useCoachingInsight.ts`

**Step 1: usePulseScore**

```typescript
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export function usePulseScore() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pulseScore', user?.coupleId],
    queryFn: async () => {
      if (!user?.coupleId) return null;

      const q = query(
        collection(db, 'couples', user.coupleId, 'pulse_scores'),
        orderBy('created_at', 'desc'),
        limit(4),
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const scores = snap.docs.map(d => ({
        weekId: d.id,
        score: d.data().score as number,
        tier: d.data().tier as string,
        breakdown: d.data().breakdown,
        createdAt: d.data().created_at?.toDate(),
      }));

      return {
        current: scores[0],
        history: scores,
        trend: scores.length >= 2 ? scores[0].score - scores[1].score : 0,
      };
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Step 2: useCoachingInsight**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export function useCoachingInsight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: latestInsight, isLoading } = useQuery({
    queryKey: ['coachingInsight', user?.coupleId],
    queryFn: async () => {
      if (!user?.coupleId) return null;

      const q = query(
        collection(db, 'couples', user.coupleId, 'coaching_insights'),
        orderBy('created_at', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;

      const data = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        pulseScore: data.pulse_score,
        insightText: data.insight_text,
        actionType: data.action_type,
        actionText: data.action_text,
        actionData: data.action_data,
        createdAt: data.created_at?.toDate(),
        dismissedAt: data.dismissed_at?.toDate() || null,
        actedOn: data.acted_on?.toDate() || null,
      };
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });

  const dismissInsight = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.coupleId) return;
      await updateDoc(
        doc(db, 'couples', user.coupleId, 'coaching_insights', insightId),
        { dismissed_at: serverTimestamp() },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coachingInsight'] }),
  });

  const markActedOn = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.coupleId) return;
      await updateDoc(
        doc(db, 'couples', user.coupleId, 'coaching_insights', insightId),
        { acted_on: serverTimestamp() },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coachingInsight'] }),
  });

  // Only show if not dismissed and created within last 7 days
  const showInsight = latestInsight
    && !latestInsight.dismissedAt
    && latestInsight.createdAt
    && (Date.now() - latestInsight.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000;

  return {
    insight: showInsight ? latestInsight : null,
    isLoading,
    dismissInsight,
    markActedOn,
  };
}
```

**Step 3: Commit**

```bash
git add src/hooks/usePulseScore.ts src/hooks/useCoachingInsight.ts
git commit -m "feat: add usePulseScore and useCoachingInsight hooks"
```

---

## Phase 6: Coaching UI + Guidance Loop + Insights Enhancements

*The user-facing layer — coaching cards, action resolution, pulse on insights.*

---

### Task 21: CoachingCard component

**Files:**
- Create: `src/components/CoachingCard.tsx`
- Modify: `src/components/index.ts`

**Step 1: Create the component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components';
import type { IconName } from '@/components/Icon';

interface CoachingCardProps {
  insightText: string;
  actionText: string;
  actionType: string;
  onAction: () => void;
  onDismiss: () => void;
}

const ACTION_ICONS: Record<string, IconName> = {
  goal: 'target',
  date_night: 'game-controller',
  conversation: 'chat-circle',
  revisit: 'heart',
  check_in: 'check',
};

export function CoachingCard({ insightText, actionText, actionType, onAction, onDismiss }: CoachingCardProps) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction();
  };

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.card}>
      <View style={styles.gradient} />

      <View style={styles.header}>
        <Icon name="lightbulb" size="sm" color="#c97454" weight="fill" />
        <Text style={styles.headerText}>Weekly insight</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Icon name="x" size="xs" color="#a8a29e" />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(200)}>
        <Text style={styles.insightText}>{insightText}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(400)}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
          <Icon name={ACTION_ICONS[actionType] || 'arrow-right'} size="sm" color="#ffffff" />
          <Text style={styles.actionBtnText}>{actionText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fef7f4',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#c97454',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerText: { fontSize: 14, fontWeight: '600', color: '#c97454', flex: 1 },
  dismissBtn: { padding: 4 },
  insightText: { fontSize: 15, color: '#57534e', lineHeight: 22, marginBottom: 20 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#c97454', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff', flex: 1 },
});
```

**Step 2: Export**

Add to `src/components/index.ts`:
```typescript
export { CoachingCard } from './CoachingCard';
```

**Step 3: Commit**

```bash
git add src/components/CoachingCard.tsx src/components/index.ts
git commit -m "feat: add CoachingCard component for AI coaching insights"
```

---

### Task 22: Wire CoachingCard into Today screen with action resolution

**Files:**
- Modify: `app/(app)/today.tsx`

**Step 1: Add CoachingCard to Today screen**

Import `useCoachingInsight` and `CoachingCard`. Show below ConnectionHeader when an insight is available:

```tsx
const { insight, dismissInsight, markActedOn } = useCoachingInsight();

// Action resolution handler
const handleCoachingAction = () => {
  if (!insight) return;

  switch (insight.actionType) {
    case 'goal':
      // Open AddGoalModal with pre-filled text
      setPrefilledGoal(insight.actionText);
      setShowAddGoal(true);
      break;
    case 'date_night':
      // Scroll to date night card or open it
      dateNightRef.current?.scrollIntoView();
      break;
    case 'conversation':
      // Mark as acted on — the Cloud Function will queue a relevant prompt
      break;
    case 'revisit':
      // Navigate to memories
      router.push('/(app)/memories');
      break;
    case 'check_in':
      // Show check-in card
      break;
  }

  markActedOn.mutate(insight.id);
};

// In JSX:
{insight && (
  <CoachingCard
    insightText={insight.insightText}
    actionText={insight.actionText}
    actionType={insight.actionType}
    onAction={handleCoachingAction}
    onDismiss={() => dismissInsight.mutate(insight.id)}
  />
)}
```

**Step 2: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: wire CoachingCard into Today screen with action resolution"
```

---

### Task 23: PulseIndicator on Insights screen

**Files:**
- Create: `src/components/PulseIndicator.tsx`
- Modify: `app/(app)/insights.tsx`
- Modify: `src/components/index.ts`

**Step 1: Create PulseIndicator**

Displays current pulse tier, score, 4-week trend line, and progress narrative.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components';

interface PulseHistory {
  weekId: string;
  score: number;
  tier: string;
}

interface PulseIndicatorProps {
  current: PulseHistory;
  history: PulseHistory[];
  trend: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: 'flame' | 'sun-dim' | 'cloud' | 'cloud-rain' }> = {
  thriving: { label: 'Thriving', color: '#22c55e', icon: 'flame' },
  steady: { label: 'Steady', color: '#c97454', icon: 'sun-dim' },
  cooling: { label: 'Cooling', color: '#f59e0b', icon: 'cloud' },
  needs_attention: { label: 'Needs attention', color: '#ef4444', icon: 'cloud-rain' },
};

export function PulseIndicator({ current, history, trend }: PulseIndicatorProps) {
  const config = TIER_CONFIG[current.tier] || TIER_CONFIG.steady;

  const trendText = trend > 0
    ? `Up ${trend} points from last week`
    : trend < 0
    ? `Down ${Math.abs(trend)} points from last week`
    : 'Same as last week';

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />

      <View style={styles.header}>
        <Icon name={config.icon} size="md" color={config.color} weight="fill" />
        <Text style={styles.headerTitle}>Relationship Pulse</Text>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: config.color }]}>{current.score}</Text>
        <View style={styles.tierBadge}>
          <Text style={[styles.tierText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <Text style={styles.trendText}>{trendText}</Text>

      {/* Mini trend line */}
      <View style={styles.trendLine}>
        {history.slice().reverse().map((h, i) => (
          <View key={h.weekId} style={styles.trendDot}>
            <View style={[styles.dot, { backgroundColor: TIER_CONFIG[h.tier]?.color || '#a8a29e' }]} />
            <Text style={styles.trendWeek}>W{h.weekId.split('-W')[1]}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1c1917' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  score: { fontSize: 36, fontWeight: '800' },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f5f5f4' },
  tierText: { fontSize: 13, fontWeight: '600' },
  trendText: { fontSize: 13, color: '#a8a29e', marginBottom: 16 },
  trendLine: { flexDirection: 'row', justifyContent: 'space-between' },
  trendDot: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  trendWeek: { fontSize: 10, color: '#a8a29e' },
});
```

**Step 2: Add to Insights screen**

In `insights.tsx`, import `usePulseScore` and `PulseIndicator`. Add at the top of the insights content (before milestones):

```tsx
const { data: pulse } = usePulseScore();

// In JSX, after hero stats:
{pulse && (
  <PulseIndicator
    current={pulse.current}
    history={pulse.history}
    trend={pulse.trend}
  />
)}
```

**Step 3: Export and commit**

```bash
git add src/components/PulseIndicator.tsx src/components/index.ts app/\(app\)/insights.tsx
git commit -m "feat: add PulseIndicator to Insights screen with tier and trend"
```

---

### Task 24: Final type check and integration verification

**Files:** None (verification only)

**Step 1: Full type check**

```bash
cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit
```
Expected: no new errors

**Step 2: Run tests**

```bash
cd /Users/adamwarner/stoke-app/app && npx jest --no-coverage
```
Expected: existing tests pass

**Step 3: Build Cloud Functions**

```bash
cd /Users/adamwarner/stoke-app/app/functions && npm run build
```
Expected: compiles cleanly

**Step 4: Verify in simulator**

- [ ] Today screen: locked-answer waiting state shows sealed card
- [ ] CompletionMoment: staggered reveal animation
- [ ] CheckInCard: shows when pending, submits 3 scores
- [ ] CoachingCard: displays insight with action button
- [ ] Insights: PulseIndicator at top with tier and trend
- [ ] Onboarding: value-prop → preferences → tone → relationship-stage → first-prompt → ready
- [ ] Paywall: new features, pricing tiers, shared access note

---

## Phase Summary

| Phase | Tasks | Delivers |
|-------|-------|----------|
| 1 | 1-5 | Locked answers, smart notifications, 5-min framing, value-prop screen |
| 2 | 6-9 | Relationship stage collection, Firestore rules for new collections |
| 3 | 10-12 | Couple-level Premium with RevenueCat, updated Paywall |
| 4 | 13-16 | Periodic check-ins (question bank, hook, UI, Cloud Function delivery) |
| 5 | 17-20 | Pulse scoring algo, prompt adaptation, AI coaching generation, data hooks |
| 6 | 21-24 | CoachingCard, action resolution, PulseIndicator, final verification |
