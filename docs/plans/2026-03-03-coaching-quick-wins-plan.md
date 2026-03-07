# Coaching Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add coaching analytics events, fix the conversation action dead-end with a conversation starter modal, and pass tone calibration into the coaching prompt.

**Architecture:** Three independent changes: (1) client-side analytics instrumentation across 2 files, (2) a new modal component wired into today.tsx, (3) a backend prompt modification in Cloud Functions.

**Tech Stack:** React Native, TypeScript, Firebase Cloud Functions, Anthropic API

---

### Task 1: Add coaching analytics events to AnalyticsEvent type

**Files:**
- Modify: `src/services/analytics.ts:47-58`

**Step 1: Add the 3 coaching events to the union type**

In `src/services/analytics.ts`, add these 3 entries after the `checkin_dismissed` line (line 49) and before `network_disconnected`:

```typescript
  | 'coaching_insight_viewed'
  | 'coaching_insight_acted'
  | 'coaching_insight_dismissed'
```

**Step 2: Verify typecheck passes**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/services/analytics.ts
git commit -m "feat: add coaching analytics event types"
```

---

### Task 2: Fire coaching_insight_viewed in EngagementCards

**Files:**
- Modify: `src/components/EngagementCards.tsx`

**Step 1: Add the viewed event with impression dedup**

Update `EngagementCards.tsx` to import `useEffect`, `useRef`, and `logEvent`, then fire `coaching_insight_viewed` once per insight:

```typescript
import React, { useEffect, useRef } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckInCard, CoachingCard } from '@components';
import { logEvent } from '@/services/analytics';

interface CoachingInsight {
  id?: string;
  insightText: string;
  actionType: string;
  actionText: string;
  dismissedAt?: Date | null;
}

interface EngagementCardsProps {
  hasPendingCheckIn: boolean;
  partnerName: string;
  onCheckInSubmit: (responses: any) => void;
  onCheckInDismiss: () => void;
  isPremium: boolean;
  latestInsight: CoachingInsight | null | undefined;
  onCoachingAction: () => void;
  onCoachingDismiss: () => void;
  pulseTier?: string;
}

export function EngagementCards({
  hasPendingCheckIn,
  partnerName,
  onCheckInSubmit,
  onCheckInDismiss,
  isPremium,
  latestInsight,
  onCoachingAction,
  onCoachingDismiss,
  pulseTier,
}: EngagementCardsProps) {
  const hasCoachingInsight = isPremium && latestInsight && !latestInsight.dismissedAt;
  const viewedInsightRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasCoachingInsight && latestInsight?.id && latestInsight.id !== viewedInsightRef.current) {
      viewedInsightRef.current = latestInsight.id;
      logEvent('coaching_insight_viewed', {
        pulse_tier: pulseTier,
        action_type: latestInsight.actionType,
      });
    }
  }, [hasCoachingInsight, latestInsight, pulseTier]);

  if (!hasPendingCheckIn && !hasCoachingInsight) {
    return null;
  }

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(200)} style={{ gap: 16, marginTop: 16 }}>
      {hasPendingCheckIn && (
        <CheckInCard
          partnerName={partnerName}
          onSubmit={onCheckInSubmit}
          onDismiss={onCheckInDismiss}
        />
      )}
      {hasCoachingInsight && latestInsight && (
        <CoachingCard
          insightText={latestInsight.insightText}
          actionType={latestInsight.actionType}
          actionText={latestInsight.actionText}
          onAction={onCoachingAction}
          onDismiss={onCoachingDismiss}
        />
      )}
    </Animated.View>
  );
}
```

**Step 2: Pass pulseTier through from today.tsx**

In `app/(app)/today.tsx`, update the `engagementProps` object (around line 321) to include `pulseTier`:

```typescript
  const engagementProps = {
    hasPendingCheckIn,
    partnerName: user?.partnerName ?? 'your partner',
    onCheckInSubmit: (responses: any) => submitCheckIn.mutate(responses),
    onCheckInDismiss: () => dismissCheckIn.mutate(),
    isPremium,
    latestInsight,
    onCoachingAction: () => latestInsight && handleCoachingAction(latestInsight.actionType, latestInsight.actionText),
    onCoachingDismiss: () => latestInsight?.id && dismissInsight.mutate(latestInsight.id),
    pulseTier: couple?.currentPulseTier,
  };
```

Note: Check that `couple` from `useCouple()` exposes `currentPulseTier`. If the field is named differently (e.g., `pulseTier`), use that. The Firestore field is `current_pulse_tier`.

**Step 3: Verify typecheck passes**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/EngagementCards.tsx app/\(app\)/today.tsx
git commit -m "feat: fire coaching_insight_viewed analytics event"
```

---

### Task 3: Fire coaching_insight_acted and coaching_insight_dismissed

**Files:**
- Modify: `app/(app)/today.tsx:137-158` (handleCoachingAction) and ~line 329 (dismiss handler)

**Step 1: Add analytics to handleCoachingAction**

In `app/(app)/today.tsx`, update `handleCoachingAction` to log the event:

```typescript
  const handleCoachingAction = (actionType: string, actionText: string) => {
    if (latestInsight?.id) {
      markActedOn.mutate(latestInsight.id);
    }

    logEvent('coaching_insight_acted', {
      action_type: actionType,
      pulse_tier: couple?.currentPulseTier,
    });

    switch (actionType) {
      case 'goal':
        setShowAddGoalModal(true);
        break;
      case 'date_night':
        router.push('/(app)/wishlist');
        break;
      case 'conversation':
        break;
      case 'revisit':
        router.push('/(app)/memories');
        break;
      case 'check_in':
        refreshUser();
        break;
    }
  };
```

**Step 2: Add analytics to the dismiss handler**

Update the `onCoachingDismiss` in `engagementProps` (~line 329):

```typescript
    onCoachingDismiss: () => {
      if (latestInsight?.id) {
        dismissInsight.mutate(latestInsight.id);
        logEvent('coaching_insight_dismissed', {
          pulse_tier: couple?.currentPulseTier,
        });
      }
    },
```

**Step 3: Verify typecheck passes**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: fire coaching acted and dismissed analytics events"
```

---

### Task 4: Create ConversationStarterModal component

**Files:**
- Create: `src/components/ConversationStarterModal.tsx`
- Modify: `src/components/index.ts`

**Step 1: Create the modal component**

Create `src/components/ConversationStarterModal.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { Icon } from './Icon';

interface ConversationStarterModalProps {
  visible: boolean;
  onClose: () => void;
  starterText: string;
}

export function ConversationStarterModal({ visible, onClose, starterText }: ConversationStarterModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(starterText);
    hapticNotification(NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToChat = () => {
    onClose();
    router.push('/(app)/chat');
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Start a conversation</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Icon name="x" size="sm" color="#78716c" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.starterCard}>
            <View style={styles.accentBar} />
            <Icon name="chat-circle" size="lg" color="#c97454" weight="light" />
            <Text style={styles.starterText}>{starterText}</Text>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Icon name={copied ? 'check' : 'copy'} size="sm" color={copied ? '#22c55e' : '#c97454'} />
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGoToChat} style={styles.chatLink} activeOpacity={0.7}>
              <Text style={styles.chatLinkText}>Go to chat</Text>
              <Icon name="arrow-right" size="xs" color="#c97454" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#292524',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  starterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  starterText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#292524',
    lineHeight: 26,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 20,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#fef7f4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  copyBtnDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  copyBtnTextDone: {
    color: '#22c55e',
  },
  chatLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c97454',
  },
});
```

**Step 2: Add barrel export**

In `src/components/index.ts`, add after the `CoachingCard` export (line 33):

```typescript
export { ConversationStarterModal } from './ConversationStarterModal';
```

**Step 3: Verify typecheck passes**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: No new errors. Note: `expo-clipboard` should already be installed (check `package.json`). If not, run `npx expo install expo-clipboard`.

**Step 4: Commit**

```bash
git add src/components/ConversationStarterModal.tsx src/components/index.ts
git commit -m "feat: add ConversationStarterModal component"
```

---

### Task 5: Wire ConversationStarterModal into today.tsx

**Files:**
- Modify: `app/(app)/today.tsx`

**Step 1: Add state and import**

At the top of `today.tsx`, add `ConversationStarterModal` to the imports from `@components` (line 27-30 area):

```typescript
import {
  PromptCard,
  CompletionMoment,
  PulsingDots,
  Icon,
  TodayScreenHeader,
  RelationshipStagePrompt,
  EngagementCards,
  RespondingScreen,
  TodayBottomSections,
  ConversationStarterModal,
} from '@components';
```

Add state variables after the existing state declarations (~line 111):

```typescript
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationStarterText, setConversationStarterText] = useState('');
```

**Step 2: Update the conversation case in handleCoachingAction**

Replace the empty `conversation` case (line 149-150):

```typescript
      case 'conversation':
        setConversationStarterText(actionText);
        setShowConversationModal(true);
        break;
```

**Step 3: Render the modal**

Add the `ConversationStarterModal` inside the return statements. The simplest approach is to add it in each mode's return that contains `EngagementCards` — or better, add it once right before the closing `</SafeAreaView>` in each relevant mode block (waiting, complete, prompt).

A cleaner approach: since all modes except `loading` and `responding` render inside `<SafeAreaView>`, wrap the modal outside mode logic. Add at the very end of the component, before the final `return` for the default prompt mode, as a fragment wrapper.

Actually, the simplest approach: add the modal to every `<SafeAreaView>` block that uses `EngagementCards`. There are 3: waiting (~line 439), complete (~line 490), and default prompt (~line 593).

For each of these, add right before `</SafeAreaView>`:

```typescript
        <ConversationStarterModal
          visible={showConversationModal}
          onClose={() => setShowConversationModal(false)}
          starterText={conversationStarterText}
        />
```

**Step 4: Verify typecheck passes**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: No new errors

**Step 5: Run tests**

Run: `cd /Users/adamwarner/stoke-app/app && npm test`
Expected: All 23 suites pass

**Step 6: Commit**

```bash
git add app/\(app\)/today.tsx
git commit -m "feat: wire conversation starter modal to coaching action"
```

---

### Task 6: Add tone calibration to buildCoachingPrompt

**Files:**
- Modify: `functions/src/index.ts:2623-2894`

**Step 1: Update buildCoachingPrompt signature and prompt**

In `functions/src/index.ts`, update the `buildCoachingPrompt` function signature to accept `toneCalibration`, and add the tone-specific instruction to the prompt:

Update the function signature (~line 2857):

```typescript
function buildCoachingPrompt(data: {
  score: number; prevScore: number | null; tier: string;
  emotionPositive: number; emotionNegative: number; emotionTotal: number;
  avgResponseLength: number;
  completedAssignments: number; totalAssignments: number;
  partialAssignments: number;
  checkInScores: number[];
  lastAction: { text: string; actedOn: boolean } | null;
  toneCalibration: string;
}): string {
```

Add tone instruction mapping inside the function, before the return statement:

```typescript
  const toneInstruction = data.toneCalibration === 'struggling'
    ? 'This couple has acknowledged struggling to connect. Be especially gentle and validating. Acknowledge that showing up matters. Suggest the smallest possible action — lower the bar, not raise it.'
    : data.toneCalibration === 'distant'
      ? 'This couple has acknowledged feeling distant. Be gently encouraging. Emphasize small reconnection moments. Frame suggestions as easy first steps.'
      : 'Warm, quiet, direct. No exclamation points. No emojis. Never blame either partner. Focus on the relationship, not individuals.';
```

Update the return statement's Tone line (line 2893) from:

```
Tone: Warm, quiet, direct. No exclamation points. No emojis. Never blame either partner. Focus on the relationship, not individuals.
```

to:

```
Tone: ${toneInstruction}
```

**Step 2: Pass toneCalibration from computePulseForCouple**

In `computePulseForCouple`, the member docs are already fetched for check-in data (lines 2652-2669). After the check-in loop, add tone extraction:

```typescript
  // Extract tone calibration from member docs
  const tones: string[] = [];
  for (const memberId of memberIds) {
    const memberDoc = await db.collection('users').doc(memberId).get();
    if (memberDoc.exists) {
      tones.push(memberDoc.data()!.tone_calibration || 'solid');
    }
  }
  const effectiveTone = getEffectiveTone(tones);
```

Note: `getEffectiveTone` is already defined at line 193 and handles the priority logic (`struggling > distant > solid`).

Then update the `buildCoachingPrompt` call (~line 2788) to include `toneCalibration`:

```typescript
    const coachingPrompt = buildCoachingPrompt({
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
      toneCalibration: effectiveTone,
    });
```

**Step 3: Build functions to verify**

Run: `cd /Users/adamwarner/stoke-app/app/functions && npm run build`
Expected: Compiles without errors

**Step 4: Run function tests**

Run: `cd /Users/adamwarner/stoke-app/app/functions && npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: pass tone calibration into coaching prompt for personalized insights"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `cd /Users/adamwarner/stoke-app/app && npm test`
Expected: All 23 suites pass (142+ tests)

**Step 2: Run typecheck**

Run: `cd /Users/adamwarner/stoke-app/app && npm run typecheck`
Expected: 0 errors in src/

**Step 3: Run functions build**

Run: `cd /Users/adamwarner/stoke-app/app/functions && npm run build`
Expected: Clean compile

**Step 4: Verify git log**

Run: `cd /Users/adamwarner/stoke-app/app && git log --oneline -6`
Expected: 6 commits from this plan, all clean
