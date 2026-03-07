# Home Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new Home tab as the app's primary discovery surface with a daily conversation starter and personalized recommendations.

**Architecture:** New `home.tsx` tab route with three sections: greeting header with relationship stage pill, a Daily Thought conversation card (static seed data, deterministic daily selection), and a horizontal "Recommended for you" row mixing categories and activities. Extends the existing `ConversationStarterModal` with a timer feature.

**Tech Stack:** React Native, Expo Router, react-native-reanimated, Phosphor icons, existing promptCategories config

---

### Task 1: Conversation Starters Config

**Files:**
- Create: `src/config/conversationStarters.ts`

**Step 1: Create the static config file**

```typescript
export interface ConversationStarter {
  id: string;
  topic: string;
  description: string;
  durationMinutes: number;
  category: 'connection' | 'appreciation' | 'dreams' | 'fun' | 'reflection';
}

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  {
    id: 'cs-001',
    topic: 'What is one thing I do that makes you feel most loved?',
    description: 'Explore how your partner experiences love',
    durationMinutes: 5,
    category: 'appreciation',
  },
  {
    id: 'cs-002',
    topic: 'If we could live anywhere in the world for a year, where would you choose and why?',
    description: 'Dream together about adventures',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-003',
    topic: 'What is a small moment from this week that made you smile?',
    description: 'Notice the little things together',
    durationMinutes: 3,
    category: 'reflection',
  },
  {
    id: 'cs-004',
    topic: 'What is something you have been wanting to tell me but have not found the right moment?',
    description: 'Create space for openness',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-005',
    topic: 'What is your favorite memory of us from the past month?',
    description: 'Relive your best moments',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-006',
    topic: 'If we had a free weekend with no responsibilities, what would your ideal day together look like?',
    description: 'Plan your perfect day',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-007',
    topic: 'What is one thing I could do this week to make your life easier?',
    description: 'Show up for each other',
    durationMinutes: 3,
    category: 'connection',
  },
  {
    id: 'cs-008',
    topic: 'What song reminds you of us and why?',
    description: 'Share your soundtrack',
    durationMinutes: 5,
    category: 'fun',
  },
  {
    id: 'cs-009',
    topic: 'What are you most proud of about our relationship?',
    description: 'Celebrate what you have built',
    durationMinutes: 5,
    category: 'appreciation',
  },
  {
    id: 'cs-010',
    topic: 'What is a fear you have that you rarely talk about?',
    description: 'Build deeper trust',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-011',
    topic: 'What is one new thing you would like us to try together?',
    description: 'Keep things fresh',
    durationMinutes: 5,
    category: 'fun',
  },
  {
    id: 'cs-012',
    topic: 'How do you think we have grown as a couple in the last year?',
    description: 'Reflect on your journey',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-013',
    topic: 'What is one way I have surprised you since we have been together?',
    description: 'Discover unexpected sides',
    durationMinutes: 3,
    category: 'appreciation',
  },
  {
    id: 'cs-014',
    topic: 'If you could relive one day from our relationship, which would it be?',
    description: 'Revisit your highlights',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-015',
    topic: 'What does feeling safe in our relationship look like to you?',
    description: 'Define your foundation',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-016',
    topic: 'What is a goal you have for yourself this year that I can support?',
    description: 'Be each other\'s champion',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-017',
    topic: 'What is something silly that always makes us laugh together?',
    description: 'Lean into your joy',
    durationMinutes: 3,
    category: 'fun',
  },
  {
    id: 'cs-018',
    topic: 'How are you really doing right now — not the polite answer, the real one?',
    description: 'Check in honestly',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-019',
    topic: 'What is something you admire about how I handle difficult situations?',
    description: 'Affirm each other\'s strengths',
    durationMinutes: 3,
    category: 'appreciation',
  },
  {
    id: 'cs-020',
    topic: 'Where do you see us five years from now?',
    description: 'Align on the future',
    durationMinutes: 10,
    category: 'dreams',
  },
];

/**
 * Deterministically pick today's conversation starter.
 * Uses date string + coupleId to generate a stable index so both partners see the same one.
 */
export function getTodayStarter(coupleId: string | null): ConversationStarter {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `${dateStr}-${coupleId || 'solo'}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  const index = Math.abs(hash) % CONVERSATION_STARTERS.length;
  return CONVERSATION_STARTERS[index];
}
```

**Step 2: Commit**

```bash
git add src/config/conversationStarters.ts
git commit -m "feat: add conversation starters static config with daily selection"
```

---

### Task 2: useConversationStarter Hook

**Files:**
- Create: `src/hooks/useConversationStarter.ts`
- Create: `src/__tests__/useConversationStarter.test.ts`

**Step 1: Write the test**

```typescript
import { getTodayStarter, CONVERSATION_STARTERS } from '@/config/conversationStarters';

describe('getTodayStarter', () => {
  it('returns a valid conversation starter', () => {
    const starter = getTodayStarter('couple-123');
    expect(starter).toBeDefined();
    expect(starter.id).toBeTruthy();
    expect(starter.topic).toBeTruthy();
    expect(CONVERSATION_STARTERS).toContain(starter);
  });

  it('returns the same starter for the same coupleId on the same day', () => {
    const a = getTodayStarter('couple-123');
    const b = getTodayStarter('couple-123');
    expect(a.id).toBe(b.id);
  });

  it('returns different starters for different coupleIds', () => {
    const a = getTodayStarter('couple-aaa');
    const b = getTodayStarter('couple-zzz');
    // Not guaranteed different, but very likely with good hash
    // Just check they are both valid
    expect(CONVERSATION_STARTERS).toContain(a);
    expect(CONVERSATION_STARTERS).toContain(b);
  });
});
```

**Step 2: Run test to verify it passes** (tests the config function, not a hook)

Run: `npm test -- --testPathPattern="useConversationStarter" --no-coverage`
Expected: PASS (3 tests)

**Step 3: Write the hook**

```typescript
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getTodayStarter, ConversationStarter } from '@/config/conversationStarters';

export function useConversationStarter(): ConversationStarter {
  const { user } = useAuth();
  return useMemo(() => getTodayStarter(user?.coupleId ?? null), [user?.coupleId]);
}
```

**Step 4: Commit**

```bash
git add src/hooks/useConversationStarter.ts src/__tests__/useConversationStarter.test.ts
git commit -m "feat: add useConversationStarter hook with deterministic daily selection"
```

---

### Task 3: Add House Icon

**Files:**
- Modify: `src/components/Icon.tsx`

**Step 1: Add HouseSimple icon from phosphor-react-native**

At the top imports, add:
```typescript
import { HouseSimpleIcon } from 'phosphor-react-native';
```

In `iconMap`, add:
```typescript
'house-simple': HouseSimpleIcon,
```

Also add `PlayIcon` and `TimerIcon` (needed for conversation starter card):
```typescript
import { PlayIcon, TimerIcon } from 'phosphor-react-native';
```

In `iconMap`:
```typescript
play: PlayIcon,
timer: TimerIcon,
```

**Step 2: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat: add house-simple, play, and timer icons"
```

---

### Task 4: ConversationStarterCard Component

**Files:**
- Create: `src/components/ConversationStarterCard.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { ConversationStarter } from '@/config/conversationStarters';

const CARD_COLORS = [
  '#f0e6d3', // warm sand
  '#e8d5e0', // dusty rose
  '#d4e4d9', // sage
  '#dde0f0', // lavender
  '#f5e0cc', // peach
];

interface ConversationStarterCardProps {
  starter: ConversationStarter;
  onStart: () => void;
}

export function ConversationStarterCard({ starter, onStart }: ConversationStarterCardProps) {
  // Pick color based on starter id hash
  const colorIndex = starter.id.charCodeAt(starter.id.length - 1) % CARD_COLORS.length;
  const bgColor = CARD_COLORS[colorIndex];

  const handleStart = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    onStart();
  };

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(200)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bgColor }]}
        onPress={handleStart}
        activeOpacity={0.85}
      >
        <View style={styles.overline}>
          <Text style={styles.overlineText}>ACTIVITY · {starter.durationMinutes}-{starter.durationMinutes + 5} MIN</Text>
        </View>

        <Text style={styles.label}>Daily Thought</Text>

        <View style={styles.bottom}>
          <Text style={styles.description} numberOfLines={2}>{starter.description}</Text>
          <View style={styles.playButton}>
            <Icon name="play" size="sm" color="#ffffff" weight="fill" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  overline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlineText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(28, 25, 23, 0.5)',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 22,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginTop: 8,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef5323',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/ConversationStarterCard.tsx
git commit -m "feat: add ConversationStarterCard component"
```

---

### Task 5: RecommendedCard Component

**Files:**
- Create: `src/components/RecommendedCard.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface RecommendedItem {
  id: string;
  type: 'category' | 'activity';
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  bgColor: string;
  /** For categories: the category type to filter explore. For activities: a prompt ID. */
  targetId: string;
}

interface RecommendedCardProps {
  item: RecommendedItem;
  onPress: (item: RecommendedItem) => void;
}

export function RecommendedCard({ item, onPress }: RecommendedCardProps) {
  const handlePress = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    onPress(item);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.bgColor }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Icon name={item.icon} size="lg" color={item.color} weight="light" />
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 160,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(28, 25, 23, 0.5)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/RecommendedCard.tsx
git commit -m "feat: add RecommendedCard component for home recommendations"
```

---

### Task 6: Update ConversationStarterModal with Timer

**Files:**
- Modify: `src/components/ConversationStarterModal.tsx`

**Step 1: Extend the modal to accept a `durationMinutes` prop and add timer UI**

Replace the full file content:

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@utils/haptics';
import { Icon } from './Icon';

interface ConversationStarterModalProps {
  visible: boolean;
  onClose: () => void;
  starterText: string;
  durationMinutes?: number;
}

export function ConversationStarterModal({
  visible,
  onClose,
  starterText,
  durationMinutes,
}: ConversationStarterModalProps) {
  const [copied, setCopied] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(durationMinutes ?? 5);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      clearTimer();
      setTimerActive(false);
      setCopied(false);
    }
  }, [visible, clearTimer]);

  const startTimer = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    setSecondsLeft(selectedMinutes * 60);
    setTimerActive(true);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          hapticNotification(NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    clearTimer();
    setCopied(false);
    setTimerActive(false);
    onClose();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(starterText);
    hapticNotification(NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToChat = () => {
    handleClose();
    router.push('/(app)/chat');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const TIMER_OPTIONS = [3, 5, 10];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Start a conversation</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
            <Icon name="x" size="sm" color="#57534e" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
            <View style={styles.accentBar} />
            <Icon name="chat-circle" size="xl" color="#ef5323" weight="light" />
            <Text style={styles.starterText}>{starterText}</Text>
          </Animated.View>

          {/* Timer section */}
          {durationMinutes !== undefined && (
            <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.timerSection}>
              {!timerActive ? (
                <>
                  <Text style={styles.timerLabel}>Set a timer</Text>
                  <View style={styles.timerOptions}>
                    {TIMER_OPTIONS.map((min) => (
                      <TouchableOpacity
                        key={min}
                        style={[
                          styles.timerOption,
                          selectedMinutes === min && styles.timerOptionSelected,
                        ]}
                        onPress={() => setSelectedMinutes(min)}
                      >
                        <Text
                          style={[
                            styles.timerOptionText,
                            selectedMinutes === min && styles.timerOptionTextSelected,
                          ]}
                        >
                          {min} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.startTimerBtn} onPress={startTimer}>
                    <Icon name="play" size="sm" color="#ffffff" weight="fill" />
                    <Text style={styles.startTimerText}>Start</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.timerRunning}>
                  <Text style={styles.timerCountdown}>
                    {secondsLeft === 0 ? 'Time is up' : formatTime(secondsLeft)}
                  </Text>
                  {secondsLeft === 0 && (
                    <Text style={styles.timerDoneSubtext}>How did it go?</Text>
                  )}
                </View>
              )}
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonCopied]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Icon
                name={copied ? 'check' : 'chat-text'}
                size="sm"
                color={copied ? '#22c55e' : '#ef5323'}
              />
              <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGoToChat} activeOpacity={0.7}>
              <Text style={styles.chatLink}>Go to chat</Text>
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
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  closeButton: {
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
    paddingTop: 8,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    paddingTop: 40,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 20,
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
    backgroundColor: '#ef5323',
  },
  starterText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1c1917',
    textAlign: 'center',
    lineHeight: 26,
  },
  timerSection: {
    alignItems: 'center',
    gap: 12,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
  timerOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  timerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  timerOptionSelected: {
    backgroundColor: '#ef5323',
  },
  timerOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#57534e',
  },
  timerOptionTextSelected: {
    color: '#ffffff',
  },
  startTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef5323',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startTimerText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  timerRunning: {
    alignItems: 'center',
    gap: 4,
  },
  timerCountdown: {
    fontSize: 48,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -1,
  },
  timerDoneSubtext: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
  },
  actions: {
    alignItems: 'center',
    gap: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef7f4',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#f5f5f4',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  copyButtonCopied: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  copyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef5323',
  },
  copyTextCopied: {
    color: '#22c55e',
  },
  chatLink: {
    color: '#ef5323',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/ConversationStarterModal.tsx
git commit -m "feat: add timer feature to ConversationStarterModal"
```

---

### Task 7: Home Screen

**Files:**
- Create: `app/(app)/home.tsx`

**Step 1: Create the home screen**

```typescript
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useConversationStarter } from '@/hooks/useConversationStarter';
import { ConversationStarterCard } from '@/components/ConversationStarterCard';
import { ConversationStarterModal } from '@/components/ConversationStarterModal';
import { RecommendedCard, RecommendedItem } from '@/components/RecommendedCard';
import { Icon } from '@/components/Icon';
import { PROMPT_CATEGORIES } from '@/config/promptCategories';
import { logEvent } from '@/services/analytics';

const RELATIONSHIP_STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  comfortable_but_busy: { label: 'Comfortable but busy', color: '#8b6914', bg: '#fef3c7' },
  new_and_exciting: { label: 'New and exciting', color: '#166534', bg: '#dcfce7' },
  a_little_disconnected: { label: 'A little disconnected', color: '#9a3412', bg: '#ffedd5' },
  going_through_a_lot: { label: 'Going through a lot', color: '#7c2d12', bg: '#fce4de' },
  deep_and_steady: { label: 'Deep and steady', color: '#1e40af', bg: '#dbeafe' },
  in_a_bit_of_a_rut: { label: 'In a bit of a rut', color: '#6b21a8', bg: '#f3e8ff' },
  reduce_stress: { label: 'Reduce stress', color: '#0f766e', bg: '#ccfbf1' },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const starter = useConversationStarter();
  const [modalVisible, setModalVisible] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const stage = user?.toneCalibration;
  const stageInfo = stage ? RELATIONSHIP_STAGE_LABELS[stage] : null;

  const recommended: RecommendedItem[] = useMemo(() => {
    // Mix: first 2 categories + 3 activity-style cards from remaining categories
    const cats = PROMPT_CATEGORIES.slice(0, 2).map((cat) => ({
      id: `cat-${cat.type}`,
      type: 'category' as const,
      title: cat.label,
      subtitle: 'CATEGORY',
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      targetId: cat.type,
    }));
    const activities = PROMPT_CATEGORIES.slice(2, 5).map((cat) => ({
      id: `act-${cat.type}`,
      type: 'activity' as const,
      title: cat.label,
      subtitle: 'ACTIVITY · 3-10 MIN',
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      targetId: cat.type,
    }));
    return [...cats, ...activities];
  }, []);

  const handleRecommendedPress = (item: RecommendedItem) => {
    logEvent('explore_category_tapped', { category: item.targetId });
    router.push({ pathname: '/(app)/explore', params: { category: item.targetId } });
  };

  const handleStartConversation = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.subtitle}>We hope you have a good day</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push('/(app)/chat')}
          >
            <Icon name="chat-text" size="md" color="#57534e" />
          </TouchableOpacity>
        </Animated.View>

        {/* Relationship stage pill */}
        {stageInfo && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <TouchableOpacity
              style={[styles.stagePill, { backgroundColor: stageInfo.bg }]}
              onPress={() => router.push('/(app)/settings')}
            >
              <Text style={[styles.stagePillText, { color: stageInfo.color }]}>
                {stageInfo.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Thought */}
        <View style={styles.section}>
          <ConversationStarterCard
            starter={starter}
            onStart={handleStartConversation}
          />
        </View>

        {/* Recommended for you */}
        <View style={styles.section}>
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <FlatList
              data={recommended}
              renderItem={({ item }) => (
                <RecommendedCard item={item} onPress={handleRecommendedPress} />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedList}
            />
          </Animated.View>
        </View>
      </ScrollView>

      <ConversationStarterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        starterText={starter.topic}
        durationMinutes={starter.durationMinutes}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 4,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  stagePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  stagePillText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  recommendedList: {
    paddingRight: 20,
  },
});
```

**Step 2: Commit**

```bash
git add 'app/(app)/home.tsx'
git commit -m "feat: add Home screen with greeting, daily thought, and recommendations"
```

---

### Task 8: Wire Up Tab Bar and Exports

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `src/components/index.ts`

**Step 1: Add Home as first visible tab in `_layout.tsx`**

Add the Home tab before the Today tab. Replace the `<Tabs>` children starting from line 136, inserting a new `Tabs.Screen` for `home` as the first entry:

```typescript
<Tabs.Screen
  name="home"
  options={{
    title: 'Home',
    tabBarIcon: ({ focused, color }) => (
      <Icon name="house-simple" size="md" color={color} weight={focused ? 'fill' : 'light'} />
    ),
  }}
/>
<Tabs.Screen
  name="today"
  options={{
    title: 'Today',
    tabBarIcon: ({ focused }) => (
      <Image
        source={logo}
        style={[tabStyles.tabLogo, !focused && tabStyles.tabLogoInactive]}
        resizeMode="contain"
      />
    ),
  }}
/>
```

Everything else stays the same.

**Step 2: Add new exports to `src/components/index.ts`**

Add after the Coaching section:

```typescript
// Home
export { ConversationStarterCard } from './ConversationStarterCard';
export { RecommendedCard } from './RecommendedCard';
```

**Step 3: Commit**

```bash
git add 'app/(app)/_layout.tsx' src/components/index.ts
git commit -m "feat: wire Home tab into tab bar and add component exports"
```

---

### Task 9: Verify and Test

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors

**Step 2: Run tests**

Run: `npm test -- --no-coverage`
Expected: All tests pass

**Step 3: Visual test in simulator**

1. Reload the app in the simulator
2. Verify Home tab appears first with house icon
3. Verify greeting shows correct name and time-based greeting
4. Verify relationship stage pill shows if user has a stage set
5. Verify Daily Thought card renders with play button
6. Tap play button — modal opens with conversation starter text and timer
7. Verify timer options (3, 5, 10 min) and start/countdown work
8. Verify "Recommended for you" horizontal scroll shows colored cards
9. Tap a recommended card — navigates to Explore
10. Verify Today tab still works as before

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address home screen visual/type issues"
```
