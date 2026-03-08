# Prompt Reactions + Depth Progression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add partner reaction icons on completed prompts (with push notification) and per-type depth progression from surface to deep based on engagement.

**Architecture:** Reactions stored as a map on `prompt_completions` docs, read via new Firestore listener in `useTodayPrompt`. Depth progress stored on couple doc, checked during prompt selection in `selectPromptForCouple`, advanced in `onResponseSubmitted`.

**Tech Stack:** React Native, Firebase Firestore, Cloud Functions, React Query, react-native-reanimated

---

### Task 1: Add Analytics Event

**Files:**
- Modify: `src/services/analytics.ts`

**Step 1: Add the new event type**

In `src/services/analytics.ts`, add this event to the `AnalyticsEvent` union type, after `'milestone_viewed'`:

```typescript
  | 'prompt_reaction_added';
```

**Step 2: Commit**

```bash
git add src/services/analytics.ts
git commit -m "feat: add prompt_reaction_added analytics event"
```

---

### Task 2: useReaction Hook

**Files:**
- Create: `src/hooks/useReaction.ts`

**Step 1: Create the hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export type ReactionType = 'heart' | 'fire' | 'laughing' | 'teary';

export const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'heart', emoji: '\u2764\uFE0F' },
  { type: 'fire', emoji: '\uD83D\uDD25' },
  { type: 'laughing', emoji: '\uD83D\uDE02' },
  { type: 'teary', emoji: '\uD83E\uDD7A' },
];

export function useReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      reaction,
      promptType,
    }: {
      assignmentId: string;
      reaction: ReactionType | null;
      promptType: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Completion doc ID === assignment ID
      const completionRef = doc(db, 'prompt_completions', assignmentId);
      await updateDoc(completionRef, {
        [`reactions.${user.id}`]: reaction,
        updated_at: serverTimestamp(),
      });

      if (reaction) {
        logEvent('prompt_reaction_added', { reaction, prompt_type: promptType });
      }

      return { reaction };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useReaction.ts
git commit -m "feat: add useReaction hook for prompt completion reactions"
```

---

### Task 3: ReactionRow Component

**Files:**
- Create: `src/components/ReactionRow.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { REACTIONS, type ReactionType } from '@/hooks/useReaction';

interface ReactionRowProps {
  myReaction: ReactionType | null;
  partnerReaction: ReactionType | null;
  onReact: (reaction: ReactionType | null) => void;
  disabled?: boolean;
}

function ReactionButton({
  emoji,
  type,
  isSelected,
  onPress,
}: {
  emoji: string;
  type: ReactionType;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.3, { damping: 6, stiffness: 200 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 150 });
    });
    hapticImpact(ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.reactionBtn,
          isSelected && styles.reactionBtnSelected,
          animatedStyle,
        ]}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function ReactionRow({ myReaction, partnerReaction, onReact, disabled }: ReactionRowProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.row}>
        {REACTIONS.map((r) => (
          <ReactionButton
            key={r.type}
            emoji={r.emoji}
            type={r.type}
            isSelected={myReaction === r.type}
            onPress={() => {
              if (disabled) return;
              onReact(myReaction === r.type ? null : r.type);
            }}
          />
        ))}
      </View>
      {partnerReaction && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.partnerReaction}>
          <Text style={styles.partnerLabel}>
            {REACTIONS.find((r) => r.type === partnerReaction)?.emoji}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBtnSelected: {
    backgroundColor: '#fef3ee',
    borderWidth: 1.5,
    borderColor: '#c97454',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  partnerReaction: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingRight: 4,
  },
  partnerLabel: {
    fontSize: 14,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/ReactionRow.tsx
git commit -m "feat: add ReactionRow component with animated reaction buttons"
```

---

### Task 4: Wire Reactions into CompletionMoment and Today Screen

**Files:**
- Modify: `src/components/CompletionMoment.tsx`
- Modify: `src/components/index.ts`
- Modify: `app/(app)/today.tsx`
- Modify: `src/hooks/usePrompt.ts`

**Step 1: Update CompletionMoment props and render ReactionRow**

In `src/components/CompletionMoment.tsx`:

Add import at the top:

```typescript
import { ReactionRow } from './ReactionRow';
import type { ReactionType } from '@/hooks/useReaction';
```

Add new props to `CompletionMomentProps`:

```typescript
interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName?: string;
  yourImageUrl?: string | null;
  partnerImageUrl?: string | null;
  myReaction?: ReactionType | null;
  partnerReaction?: ReactionType | null;
  onReact?: (reaction: ReactionType | null) => void;
}
```

Update the function signature to receive new props:

```typescript
export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName = 'Partner',
  yourImageUrl,
  partnerImageUrl,
  myReaction = null,
  partnerReaction = null,
  onReact,
}: CompletionMomentProps) {
```

Add `ReactionRow` after the partner's ResponseCard, before the footer:

```typescript
          {/* Partner response - reveals 200ms later */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)}>
            <ResponseCard
              label={partnerName}
              responseText={partnerResponse}
              imageUrl={partnerImageUrl}
              isYours={false}
            />
          </Animated.View>

          {/* Reaction row */}
          {onReact && (
            <Animated.View entering={FadeInUp.duration(400).delay(800)}>
              <ReactionRow
                myReaction={myReaction}
                partnerReaction={partnerReaction}
                onReact={onReact}
              />
            </Animated.View>
          )}
        </View>
```

**Step 2: Add barrel export for ReactionRow**

In `src/components/index.ts`, add under the `// Photos & Milestones` section:

```typescript
// Reactions
export { ReactionRow } from './ReactionRow';
```

**Step 3: Add reactions data to useTodayPrompt**

In `src/hooks/usePrompt.ts`:

Add `reactions` to the `TodayPrompt` interface:

```typescript
interface TodayPrompt {
  assignment: PromptAssignment | null;
  myResponse: PromptResponse | null;
  partnerResponse: PromptResponse | null;
  partnerHasResponded: boolean;
  isComplete: boolean;
  nextPromptAt: string | null;
  reactions: Record<string, string> | null;
}
```

Update `EMPTY_TODAY`:

```typescript
const EMPTY_TODAY: TodayPrompt = {
  assignment: null,
  myResponse: null,
  partnerResponse: null,
  partnerHasResponded: false,
  isComplete: false,
  nextPromptAt: null,
  reactions: null,
};
```

Inside the `onSnapshot` callback for responses (after line 174 where `queryClient.setQueryData` is called), add a listener for the completion doc when the assignment is complete. Replace the `setQueryData` call inside the responses listener with:

```typescript
        // If complete, fetch reactions from completion doc
        let reactions: Record<string, string> | null = null;
        if (latestStatus === 'completed') {
          try {
            const completionDoc = await getDoc(doc(db, 'prompt_completions', assignment.id));
            if (completionDoc.exists()) {
              reactions = completionDoc.data().reactions || null;
            }
          } catch {
            // Reactions are non-critical
          }
        }

        queryClient.setQueryData(['todayPrompt', coupleId], {
          assignment: { ...assignment, status: latestStatus },
          myResponse,
          partnerResponse,
          partnerHasResponded: !!partnerResponse?.submittedAt,
          isComplete: latestStatus === 'completed',
          nextPromptAt: null,
          reactions,
        } as TodayPrompt);
```

Also add `reactions: null` to the empty/no-assignment `setQueryData` calls (lines 107 and 110 area).

**Step 4: Pass reactions through in today.tsx**

In `app/(app)/today.tsx`, find the `<CompletionMoment>` render (around line 532).

Add the `useReaction` import and hook call:

```typescript
import { useReaction, type ReactionType } from '@/hooks/useReaction';
```

Inside the component, add:

```typescript
const reaction = useReaction();
```

Update the `<CompletionMoment>` JSX to pass reaction props:

```typescript
<CompletionMoment
  promptText={assignment!.promptText}
  yourResponse={myResponse!.responseText}
  partnerResponse={partnerResponse?.responseText || ''}
  partnerName={partnerName}
  yourImageUrl={myResponse!.imageUrl}
  partnerImageUrl={partnerResponse?.imageUrl}
  myReaction={todayData?.reactions?.[user!.id] as ReactionType | null ?? null}
  partnerReaction={
    todayData?.reactions
      ? (Object.entries(todayData.reactions).find(([k]) => k !== user!.id)?.[1] as ReactionType | null ?? null)
      : null
  }
  onReact={(r) => reaction.mutate({
    assignmentId: assignment!.id,
    reaction: r,
    promptType: assignment!.promptType,
  })}
/>
```

Note: `todayData` is the return value from `useTodayPrompt()`. Check what variable name is used in `today.tsx` and match accordingly.

**Step 5: Commit**

```bash
git add src/components/CompletionMoment.tsx src/components/ReactionRow.tsx src/components/index.ts src/hooks/usePrompt.ts src/hooks/useReaction.ts "app/(app)/today.tsx"
git commit -m "feat: wire reactions into CompletionMoment with real-time data"
```

---

### Task 5: Reaction Push Notification (Cloud Function)

**Files:**
- Modify: `functions/src/index.ts`

**Step 1: Add a Firestore trigger for reactions**

After the `onResponseSubmitted` function (around line 625), add a new trigger:

```typescript
export const onReactionAdded = functions.firestore
  .document('prompt_completions/{completionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if reactions changed
    const beforeReactions = before.reactions || {};
    const afterReactions = after.reactions || {};

    // Find the user who just reacted
    let reactorId: string | null = null;
    let reactionValue: string | null = null;
    for (const [userId, reaction] of Object.entries(afterReactions)) {
      if (beforeReactions[userId] !== reaction && reaction !== null) {
        reactorId = userId;
        reactionValue = reaction as string;
        break;
      }
    }

    if (!reactorId || !reactionValue) return null;

    // Don't notify if partner already reacted (avoid ping-pong)
    const coupleId = after.couple_id;
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    const coupleData = coupleDoc.data()!;
    const partnerId = coupleData.member_ids.find(
      (id: string) => id !== reactorId
    );

    if (!partnerId) return null;

    // If partner already has a reaction, don't send notification
    if (afterReactions[partnerId]) return null;

    const reactorDoc = await db.collection('users').doc(reactorId).get();
    const reactorName = reactorDoc.data()?.display_name || 'Your partner';

    const REACTION_EMOJIS: Record<string, string> = {
      heart: '\u2764\uFE0F',
      fire: '\uD83D\uDD25',
      laughing: '\uD83D\uDE02',
      teary: '\uD83E\uDD7A',
    };

    await sendPushNotification(partnerId, {
      title: reactorName,
      body: `${REACTION_EMOJIS[reactionValue] || ''} reacted to your response`,
    });

    return null;
  });
```

**Step 2: Commit**

```bash
cd functions && npm run build && cd ..
git add functions/src/index.ts
git commit -m "feat: add onReactionAdded cloud function for push notifications"
```

---

### Task 6: Depth Progression — Data Model and Initialization

**Files:**
- Modify: `functions/src/index.ts`

**Step 1: Add depth initialization helper**

Add this helper function above `selectPromptForCouple` (around line 195):

```typescript
const PROMPT_TYPES = [
  'love_map_update',
  'bid_for_connection',
  'appreciation_expression',
  'dream_exploration',
  'conflict_navigation',
  'repair_attempt',
];

function initializeDepthProgress(): Record<string, { level: string; surface_completions: number; medium_completions: number }> {
  const progress: Record<string, any> = {};
  for (const type of PROMPT_TYPES) {
    progress[type] = { level: 'surface', surface_completions: 0, medium_completions: 0 };
  }
  return progress;
}

const DEPTH_THRESHOLD = 3; // completions needed to unlock next level
const DEEP_WEEK_FLOOR = 4; // minimum weeks before deep prompts
```

**Step 2: Add depth filtering to `selectPromptForCouple`**

In the `selectPromptForCouple` function, after the existing filter chain (around line 258, after the `max_per_week` check), add a depth filter:

```typescript
      // Apply depth progression
      const depthProgress = coupleData.depth_progress || initializeDepthProgress();
      const typeProgress = depthProgress[data.type];
      if (typeProgress) {
        const currentLevel = typeProgress.level;
        const depthOrder = ['surface', 'medium', 'deep'];
        const currentIdx = depthOrder.indexOf(currentLevel);
        const promptIdx = depthOrder.indexOf(data.emotional_depth || 'surface');
        if (promptIdx > currentIdx) return false;
      }
```

Add this inside the `.filter()` callback, after the `max_per_week` check and before `return true`.

**Step 3: Initialize depth_progress on first delivery**

In the `deliverPromptToCouple` function (around the assignment creation), after fetching the couple doc, add initialization if missing:

```typescript
    // Initialize depth progress if not set
    if (!coupleData.depth_progress) {
      await db.collection('couples').doc(coupleId).update({
        depth_progress: initializeDepthProgress(),
      });
    }
```

**Step 4: Commit**

```bash
cd functions && npm run build && cd ..
git add functions/src/index.ts
git commit -m "feat: add depth progression data model and selection filtering"
```

---

### Task 7: Depth Advancement in onResponseSubmitted

**Files:**
- Modify: `functions/src/index.ts`

**Step 1: Add depth advancement logic**

In `onResponseSubmitted`, inside the `if (assignment.response_count === 1)` block (the completion branch), after updating couple stats (around line 567), add depth advancement:

```typescript
      // Advance depth progression
      const promptDoc = await db.collection('prompts').doc(response.prompt_id).get();
      if (promptDoc.exists) {
        const promptData = promptDoc.data()!;
        const promptType = promptData.type;
        const promptDepth = promptData.emotional_depth || 'surface';

        const depthProgress = coupleData.depth_progress || initializeDepthProgress();
        const typeProgress = depthProgress[promptType] || {
          level: 'surface',
          surface_completions: 0,
          medium_completions: 0,
        };

        // Increment counter for the depth level just completed
        if (promptDepth === 'surface') {
          typeProgress.surface_completions += 1;
        } else if (promptDepth === 'medium') {
          typeProgress.medium_completions += 1;
        }

        // Check for level advancement
        if (typeProgress.level === 'surface' && typeProgress.surface_completions >= DEPTH_THRESHOLD) {
          typeProgress.level = 'medium';
        } else if (typeProgress.level === 'medium' && typeProgress.medium_completions >= DEPTH_THRESHOLD && weekNumber >= DEEP_WEEK_FLOOR) {
          typeProgress.level = 'deep';
        }

        depthProgress[promptType] = typeProgress;

        await db.collection('couples').doc(response.couple_id).update({
          depth_progress: depthProgress,
        });
      }
```

Note: `weekNumber` needs to be calculated in this block. Add before the depth advancement code:

```typescript
      const linkedAt = coupleData.linked_at?.toDate() || new Date();
      const weekNumber = Math.floor(
        (Date.now() - linkedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;
```

The `coupleData` variable already exists — it's from `streakCoupleData` (line 544). Use `streakCoupleData` instead, or rename for clarity.

**Step 2: Build and commit**

```bash
cd functions && npm run build && cd ..
git add functions/src/index.ts
git commit -m "feat: advance depth progression on prompt completion"
```

---

### Task 8: Verify and Push

**Step 1: Run type check**

```bash
npm run typecheck
```

Expect: Only pre-existing `admin/` errors. Zero errors in `src/` or `app/`.

**Step 2: Run tests**

```bash
npm test -- --silent
```

Expect: All suites pass.

**Step 3: Build cloud functions**

```bash
cd functions && npm run build
```

Expect: Clean build, no errors.

**Step 4: Push**

```bash
git push origin main
```
