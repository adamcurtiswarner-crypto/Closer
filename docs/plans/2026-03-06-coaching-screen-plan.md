# Coaching Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated `/(app)/coaching` screen with pulse tier badge, current insight card with action confirmation, paginated past insights, and non-clinical disclaimer.

**Architecture:** New route file + new hook (`useCoachingHistory`) + new component (`CoachingScreen` inlined in route file). Extends existing `useCouple` to include `currentPulseScore`. Adds 3 new analytics events. CoachingCard gets an acted-on state variant. Navigation from Today tab's CoachingCard.

**Tech Stack:** React Native, Expo Router, React Query (infinite query), Firestore, react-native-reanimated

---

### Task 1: Add `currentPulseScore` to useCouple hook

**Files:**
- Modify: `src/hooks/useCouple.ts:22-36` (Couple interface)
- Modify: `src/hooks/useCouple.ts:69-83` (query return)

**Step 1: Add field to Couple interface**

In `src/hooks/useCouple.ts`, add to the `Couple` interface after `currentPulseTier`:

```typescript
currentPulseScore: number | null;
```

**Step 2: Add field to query return**

In the `queryFn` return object, add after `currentPulseTier`:

```typescript
currentPulseScore: data.current_pulse_score ?? null,
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumers break — new optional field)

**Step 4: Commit**

```bash
git add src/hooks/useCouple.ts
git commit -m "feat: expose currentPulseScore from useCouple hook"
```

---

### Task 2: Add new analytics events

**Files:**
- Modify: `src/services/analytics.ts:6-61` (AnalyticsEvent type)

**Step 1: Add 3 new event names to the AnalyticsEvent union**

Add these after `coaching_insight_dismissed`:

```typescript
| 'coaching_screen_viewed'
| 'coaching_action_confirmed'
| 'pulse_score_viewed'
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/analytics.ts
git commit -m "feat: add coaching screen analytics events"
```

---

### Task 3: Create `useCoachingHistory` hook

**Files:**
- Create: `src/hooks/useCoachingHistory.ts`

**Step 1: Write the hook**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export interface CoachingInsightHistoryItem {
  id: string;
  pulseScore: number;
  insightText: string;
  actionType: string;
  actionText: string;
  createdAt: Date;
  dismissedAt: Date | null;
  actedOn: Date | null;
}

const PAGE_SIZE = 10;

export function useCoachingHistory() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['coachingHistory', user?.coupleId],
    queryFn: async ({ pageParam }: { pageParam: QueryDocumentSnapshot | null }) => {
      if (!user?.coupleId) return { items: [], lastDoc: null };

      let q = query(
        collection(db, 'couples', user.coupleId, 'coaching_insights'),
        orderBy('created_at', 'desc'),
        limit(PAGE_SIZE),
      );

      if (pageParam) {
        q = query(
          collection(db, 'couples', user.coupleId, 'coaching_insights'),
          orderBy('created_at', 'desc'),
          startAfter(pageParam),
          limit(PAGE_SIZE),
        );
      }

      const snap = await getDocs(q);
      const items: CoachingInsightHistoryItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          pulseScore: data.pulse_score,
          insightText: data.insight_text,
          actionType: data.action_type,
          actionText: data.action_text,
          createdAt: data.created_at?.toDate(),
          dismissedAt: data.dismissed_at?.toDate() || null,
          actedOn: data.acted_on?.toDate() || null,
        };
      });

      const lastDoc = snap.docs[snap.docs.length - 1] || null;
      return { items, lastDoc };
    },
    initialPageParam: null as QueryDocumentSnapshot | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      return lastPage.lastDoc;
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useCoachingHistory.ts
git commit -m "feat: add useCoachingHistory hook with pagination"
```

---

### Task 4: Create the coaching screen route

**Files:**
- Create: `app/(app)/coaching.tsx`
- Modify: `app/(app)/_layout.tsx` (register hidden tab)

**Step 1: Register the route as a hidden tab**

In `app/(app)/_layout.tsx`, add a new `Tabs.Screen` entry after the `date-nights` entry (before `settings`):

```tsx
<Tabs.Screen
  name="coaching"
  options={{
    href: null,
  }}
/>
```

**Step 2: Create the coaching screen**

Create `app/(app)/coaching.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Icon, Paywall } from '@components';
import type { IconName } from '@components';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useCoachingInsight } from '@/hooks/useCoachingInsight';
import { useCoachingHistory } from '@/hooks/useCoachingHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { logEvent } from '@/services/analytics';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { ConversationStarterModal } from '@/components/ConversationStarterModal';

const TIER_COLORS: Record<string, string> = {
  thriving: '#22c55e',
  steady: '#ef5323',
  cooling: '#f59e0b',
  needs_attention: '#ef4444',
};

const TIER_LABELS: Record<string, string> = {
  thriving: 'Thriving',
  steady: 'Steady',
  cooling: 'Cooling',
  needs_attention: 'Needs attention',
};

const ACTION_CONFIG: Record<string, { icon: IconName; label: string }> = {
  goal: { icon: 'target', label: 'Set a goal' },
  date_night: { icon: 'heart', label: 'Plan a date' },
  conversation: { icon: 'chat-circle', label: 'Start a conversation' },
  revisit: { icon: 'clock-counter-clockwise', label: 'Look back' },
  check_in: { icon: 'heart', label: 'Check in' },
};

function StatusIcon({ actedOn, dismissedAt }: { actedOn: Date | null; dismissedAt: Date | null }) {
  if (actedOn) return <Icon name="check" size="xs" color="#22c55e" />;
  if (dismissedAt) return <Icon name="x" size="xs" color="#a8a29e" />;
  return <Icon name="minus" size="xs" color="#d6d3d1" />;
}

export default function CoachingScreen() {
  const { user, refreshUser } = useAuth();
  const { data: couple } = useCouple();
  const { latestInsight, markActedOn } = useCoachingInsight();
  const { data: historyData, fetchNextPage, hasNextPage, isFetchingNextPage } = useCoachingHistory();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationStarterText, setConversationStarterText] = useState('');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  const pulseTier = couple?.currentPulseTier || 'steady';
  const pulseScore = couple?.currentPulseScore;
  const tierColor = TIER_COLORS[pulseTier] || TIER_COLORS.steady;
  const tierLabel = TIER_LABELS[pulseTier] || 'Steady';

  useEffect(() => {
    logEvent('coaching_screen_viewed', { pulse_tier: pulseTier });
  }, []);

  // Premium gate
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <Paywall visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    );
  }

  const handlePillTap = () => {
    setShowScoreTooltip(!showScoreTooltip);
    if (!showScoreTooltip && pulseScore != null) {
      logEvent('pulse_score_viewed', { score: pulseScore, tier: pulseTier });
    }
  };

  const handleAction = (actionType: string, actionText: string, insightId?: string) => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    if (insightId) {
      markActedOn.mutate(insightId);
      logEvent('coaching_insight_acted', {
        action_type: actionType,
        pulse_tier: pulseTier,
        pulse_score: pulseScore,
      });
    }

    switch (actionType) {
      case 'goal':
        setShowAddGoalModal(true);
        break;
      case 'date_night':
        router.push('/(app)/date-nights');
        break;
      case 'conversation':
        setConversationStarterText(actionText);
        setShowConversationModal(true);
        break;
      case 'revisit':
        router.push('/(app)/memories');
        break;
      case 'check_in':
        refreshUser();
        break;
    }
  };

  // Flatten paginated history, skip the latest (shown separately)
  const pastInsights = (historyData?.pages ?? [])
    .flatMap(p => p.items)
    .filter(i => i.id !== latestInsight?.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size="sm" color="#292524" />
          </TouchableOpacity>
          <Text style={styles.title}>Coaching</Text>
          <TouchableOpacity onPress={handlePillTap} style={[styles.tierPill, { backgroundColor: tierColor + '18' }]}>
            <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Score tooltip */}
        {showScoreTooltip && pulseScore != null && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
            <Text style={styles.tooltipText}>Your pulse score: {pulseScore}</Text>
          </Animated.View>
        )}

        {/* Current insight */}
        {latestInsight && !latestInsight.dismissedAt && (
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.currentCard}>
            <View style={styles.accentBar} />
            <View style={styles.cardHeader}>
              <Icon name="lightbulb" size="sm" color="#ef5323" weight="light" />
              <Text style={styles.cardHeaderText}>This week</Text>
            </View>
            <Text style={styles.insightText}>{latestInsight.insightText}</Text>

            {latestInsight.actedOn ? (
              <View style={styles.actedRow}>
                <Icon name="check-circle" size="sm" color="#22c55e" weight="fill" />
                <Text style={styles.actedText}>
                  You did this on {format(latestInsight.actedOn, 'EEEE')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleAction(latestInsight.actionType, latestInsight.actionText, latestInsight.id)}
                activeOpacity={0.8}
              >
                <Icon
                  name={ACTION_CONFIG[latestInsight.actionType]?.icon || 'chat-circle'}
                  size="sm"
                  color="#ffffff"
                  weight="bold"
                />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>
                    {ACTION_CONFIG[latestInsight.actionType]?.label || 'Take action'}
                  </Text>
                  <Text style={styles.actionDetail} numberOfLines={2}>
                    {latestInsight.actionText}
                  </Text>
                </View>
                <Icon name="arrow-right" size="sm" color="#ffffff" />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Past insights */}
        {pastInsights.length > 0 && (
          <Animated.View entering={FadeInUp.duration(500).delay(300)}>
            <Text style={styles.sectionHeader}>Past insights</Text>
            {pastInsights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={styles.pastRow}
                onPress={() => setExpandedInsightId(
                  expandedInsightId === insight.id ? null : insight.id
                )}
                activeOpacity={0.7}
              >
                <View style={styles.pastRowTop}>
                  <Text style={styles.pastDate}>
                    {format(insight.createdAt, 'MMM d')}
                  </Text>
                  <Text style={styles.pastPreview} numberOfLines={expandedInsightId === insight.id ? 0 : 1}>
                    {insight.insightText}
                  </Text>
                  <StatusIcon actedOn={insight.actedOn} dismissedAt={insight.dismissedAt} />
                </View>
                {expandedInsightId === insight.id && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.pastExpanded}>
                    <Text style={styles.pastFullText}>{insight.insightText}</Text>
                    <View style={styles.pastActionRow}>
                      <Icon
                        name={ACTION_CONFIG[insight.actionType]?.icon || 'chat-circle'}
                        size="xs"
                        color="#78716c"
                      />
                      <Text style={styles.pastActionText}>{insight.actionText}</Text>
                    </View>
                    {insight.actedOn && (
                      <Text style={styles.pastActedDate}>
                        Acted on {format(insight.actedOn, 'MMM d')}
                      </Text>
                    )}
                  </Animated.View>
                )}
              </TouchableOpacity>
            ))}

            {hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color="#ef5323" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerText}>
            Stoke offers reflections, not therapy. For professional support, consult a licensed counselor.
          </Text>
        </View>
      </ScrollView>

      <ConversationStarterModal
        visible={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        starterText={conversationStarterText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.5,
    flex: 1,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  // Tooltip
  tooltip: {
    alignSelf: 'flex-end',
    backgroundColor: '#292524',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: -16,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  // Current card
  currentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ef5323',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    letterSpacing: -0.3,
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 22,
    marginBottom: 16,
  },
  // Action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ef5323',
    borderRadius: 14,
    padding: 16,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  actionDetail: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    lineHeight: 19,
  },
  // Acted state
  actedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actedText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
  },
  // Past insights
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#78716c',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  pastRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pastRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pastDate: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
    width: 48,
  },
  pastPreview: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 19,
  },
  pastExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  pastFullText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
    marginBottom: 8,
  },
  pastActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastActionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
  },
  pastActedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    marginTop: 4,
  },
  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef5323',
  },
  // Disclaimer
  disclaimerWrap: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 16,
  },
});
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run tests**

Run: `npm test -- --silent`
Expected: 23/23 passing (no test regressions)

**Step 5: Commit**

```bash
git add 'app/(app)/coaching.tsx' 'app/(app)/_layout.tsx'
git commit -m "feat: add dedicated coaching screen with pulse tier and insight history"
```

---

### Task 5: Add navigation from Today tab to coaching screen

**Files:**
- Modify: `app/(app)/today.tsx:140-167` (handleCoachingAction)
- Modify: `src/components/CoachingCard.tsx` (add "View coaching" link)

**Step 1: Add "View coaching" link to CoachingCard**

In `src/components/CoachingCard.tsx`, add a `onViewCoaching` optional prop and a link below the action button:

Add to interface:
```typescript
onViewCoaching?: () => void;
```

Add after the action button `</Animated.View>` (line 57), before the closing `</Animated.View>`:

```tsx
{onViewCoaching && (
  <TouchableOpacity onPress={onViewCoaching} style={styles.viewCoachingLink}>
    <Text style={styles.viewCoachingText}>View all insights</Text>
    <Icon name="arrow-right" size="xs" color="#78716c" />
  </TouchableOpacity>
)}
```

Add styles:
```typescript
viewCoachingLink: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  marginTop: 12,
  paddingVertical: 4,
},
viewCoachingText: {
  fontSize: 13,
  fontFamily: 'Inter-Medium',
  color: '#78716c',
},
```

**Step 2: Wire navigation in EngagementCards**

In `src/components/EngagementCards.tsx`, add `onViewCoaching` to the interface:

```typescript
onViewCoaching?: () => void;
```

Pass it through to CoachingCard:
```tsx
<CoachingCard
  insightText={latestInsight.insightText}
  actionType={latestInsight.actionType}
  actionText={latestInsight.actionText}
  onAction={onCoachingAction}
  onDismiss={onCoachingDismiss}
  onViewCoaching={onViewCoaching}
/>
```

**Step 3: Wire in today.tsx**

In `app/(app)/today.tsx`, add to the `engagementProps` object (around line 330):

```typescript
onViewCoaching: () => router.push('/(app)/coaching'),
```

**Step 4: Run typecheck and tests**

Run: `npm run typecheck && npm test -- --silent`
Expected: All pass

**Step 5: Commit**

```bash
git add src/components/CoachingCard.tsx src/components/EngagementCards.tsx 'app/(app)/today.tsx'
git commit -m "feat: add navigation from Today coaching card to coaching screen"
```

---

### Task 6: Enrich coaching_insight_acted analytics

**Files:**
- Modify: `app/(app)/today.tsx:143-146` (handleCoachingAction analytics call)

**Step 1: Add pulse_score and week_id to the event**

In `app/(app)/today.tsx`, update the `logEvent` call inside `handleCoachingAction` (around line 143):

```typescript
logEvent('coaching_insight_acted', {
  action_type: actionType,
  pulse_tier: couple?.currentPulseTier,
  pulse_score: couple?.currentPulseScore,
  week_id: latestInsight?.createdAt ? format(latestInsight.createdAt, "yyyy-'W'ww") : undefined,
});
```

Note: `format` from `date-fns` is already imported in today.tsx.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add 'app/(app)/today.tsx'
git commit -m "feat: enrich coaching_insight_acted with pulse_score and week_id"
```

---

### Task 7: Write test for useCoachingHistory hook

**Files:**
- Create: `src/__tests__/useCoachingHistory.test.ts`

**Step 1: Write the test**

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { getDocs } from 'firebase/firestore';
import { useCoachingHistory } from '@hooks/useCoachingHistory';

// Mock firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { coupleId: 'couple-123' },
  }),
}));

// Mock React Query wrapper
const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query');
const React = require('react');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCoachingHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty items when no insights exist', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [],
    });

    const { result } = renderHook(() => useCoachingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toEqual([]);
  });

  it('maps Firestore documents to CoachingInsightHistoryItem', async () => {
    const mockDate = new Date('2026-03-01');
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: 'insight-1',
          data: () => ({
            pulse_score: 72,
            insight_text: 'You had a steady week.',
            action_type: 'conversation',
            action_text: 'Try asking about their day.',
            created_at: { toDate: () => mockDate },
            dismissed_at: null,
            acted_on: null,
          }),
        },
      ],
    });

    const { result } = renderHook(() => useCoachingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const item = result.current.data?.pages[0].items[0];
    expect(item).toEqual({
      id: 'insight-1',
      pulseScore: 72,
      insightText: 'You had a steady week.',
      actionType: 'conversation',
      actionText: 'Try asking about their day.',
      createdAt: mockDate,
      dismissedAt: null,
      actedOn: null,
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test -- --testPathPattern=useCoachingHistory --silent`
Expected: PASS

**Step 3: Commit**

```bash
git add src/__tests__/useCoachingHistory.test.ts
git commit -m "test: add useCoachingHistory hook tests"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test -- --silent`
Expected: 24/24 suites, all passing

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors

**Step 3: Verify git log**

Run: `git log --oneline -8`
Expected: 7 new commits for Feature #5

---

## Summary

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 1 | Add pulseScore to useCouple | 1 modify | S |
| 2 | Add analytics events | 1 modify | S |
| 3 | Create useCoachingHistory hook | 1 create | M |
| 4 | Create coaching screen route | 1 create, 1 modify | L |
| 5 | Add navigation from Today | 3 modify | M |
| 6 | Enrich analytics event | 1 modify | S |
| 7 | Write hook test | 1 create | M |
| 8 | Final verification | 0 | S |
