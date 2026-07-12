import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

/**
 * Today screen — "How did this feel?" persistence (doctrine: ask once).
 * The answer lives on the response doc (emotional_response); a remount must
 * never re-ask once it is recorded. Local state only bridges the beat
 * between the tap and the snapshot settling.
 */

// ─── Mocks ───

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({ db: {}, functions: {} }));

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/services/imageUpload', () => ({ pickImage: jest.fn() }));
jest.mock('@/services/widgetBridge', () => ({
  updateWidgetData: jest.fn(),
  buildWidgetData: jest.fn(() => ({})),
}));
jest.mock('@/config/milestones', () => ({
  getAnniversaryCountdown: jest.fn(() => ({ days: 10, isToday: false })),
}));

// Lightweight stubs for the component barrel — the feedback card itself is
// rendered by the screen, not by any of these.
jest.mock('@components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const Null = () => null;
  return {
    AccentBar: Null,
    PromptCard: Null,
    CompletionMoment: () => React.createElement(Text, null, 'completion-moment'),
    PulsingDots: Null,
    Icon: Null,
    TodayScreenHeader: ({ greeting }: { greeting: string }) =>
      React.createElement(Text, null, greeting),
    RelationshipStagePrompt: Null,
    EngagementCards: Null,
    RespondingScreen: Null,
    TodayBottomSections: Null,
    ConversationStarterModal: Null,
    SafetyResources: Null,
    ScalePromptCard: Null,
    FollowUpContextLine: Null,
    FollowUpSkip: Null,
    FollowUpLockedCard: Null,
    getFollowUpContextLine: () => null,
    PartnerQuestionCard: Null,
    OpenDayChip: Null,
    Paywall: Null,
    __esModule: true,
    // Unused in these tests but kept harmless
    Wrapper: View,
  };
});

jest.mock('@/components/StreakRing', () => ({ StreakRing: () => null }));
jest.mock('@/components/Skeleton', () => ({
  Skeleton: () => null,
  PromptCardSkeleton: () => null,
}));
jest.mock('@/components/UnpairedTodayCard', () => ({ UnpairedTodayCard: () => null }));
jest.mock('@/components/NotificationPrePrompt', () => ({ NotificationPrePrompt: () => null }));

// Resolve t() against the real en.json so tests assert shipped copy
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let value = lookup(key);
        if (typeof value !== 'string') return key;
        if (options) {
          Object.entries(options).forEach(([name, v]) => {
            value = (value as string).replace(`{{${name}}}`, String(v));
          });
        }
        return value;
      },
    }),
  };
});

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      coupleId: 'couple-1',
      displayName: 'Riley',
      partnerName: 'Jordan',
      isOnboarded: true,
      relationshipStage: 'settled',
    },
    refreshUser: jest.fn(),
  }),
}));

// usePartnerName runs for real (fallback register under test elsewhere);
// it needs usePartner stubbed so no React Query client is required.
jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => ({ data: null }),
}));

jest.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({
    isPartnerOnline: false,
    isPartnerTyping: false,
    partnerTypingContext: null,
    partnerLastSeen: null,
    setTyping: jest.fn(),
    markResponseViewed: jest.fn(),
  }),
}));

const mockTodayPrompt = jest.fn();
const mockSubmitFeedback = jest.fn();
jest.mock('@/hooks/usePrompt', () => ({
  useTodayPrompt: () => mockTodayPrompt(),
  useSubmitResponse: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSubmitFeedback: () => ({ mutate: mockSubmitFeedback, isPending: false }),
  useTriggerPrompt: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipFollowUp: () => ({ mutate: jest.fn(), isPending: false }),
  useAssignmentReveal: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePersonalize', () => ({
  usePersonalize: () => (s: string) => s,
}));
jest.mock('@/hooks/useExplorePrompts', () => ({
  useExploreAssignments: () => ({ data: [] }),
  useCompletionReactions: () => ({ data: null }),
  pendingPartnerQuestions: () => [],
}));
jest.mock('@/hooks/useReaction', () => ({
  useReaction: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({ currentStreak: 0, isStreakActive: false }),
}));
jest.mock('@/hooks/useMonthlyActivity', () => ({
  useMonthlyActivity: () => ({
    days: [],
    completedCount: 0,
    month: 6,
    year: 2026,
    startDayOffset: 0,
  }),
}));
jest.mock('@/hooks/useCouple', () => ({ useCouple: () => ({ data: null }) }));
jest.mock('@/hooks/useCheckIn', () => ({
  useCheckIn: () => ({
    hasPendingCheckIn: false,
    submitCheckIn: { mutate: jest.fn() },
    dismissCheckIn: { mutate: jest.fn() },
  }),
}));
jest.mock('@/hooks/useCoachingInsight', () => ({
  useCoachingInsight: () => ({
    latestInsight: null,
    dismissInsight: { mutate: jest.fn() },
    markActedOn: { mutate: jest.fn() },
  }),
}));
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPremium: true, isLoading: false }),
}));
jest.mock('@/hooks/useNotificationPrePrompt', () => ({
  useNotificationPrePrompt: () => ({
    visible: false,
    offer: jest.fn(),
    accept: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

import TodayScreen from '../../app/(app)/today';

const assignment = {
  id: 'a-1',
  coupleId: 'couple-1',
  promptId: 'p-1',
  promptText: 'How connected did you feel this week?',
  promptHint: null,
  promptType: 'communication',
  requiresConversation: false,
  assignedDate: '2026-07-09',
  status: 'completed',
  assignmentKind: 'daily',
  responseFormat: 'scale',
  scaleConfig: null,
  followUp: null,
  closingText: null,
  skippedBy: [],
};

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    responseText: 'Felt close after our walk.',
    imageUrl: null,
    submittedAt: new Date(),
    status: 'submitted',
    responseScore: 8,
    emotionalResponse: null,
    ...overrides,
  };
}

function setToday(myResponse: ReturnType<typeof makeResponse>) {
  mockTodayPrompt.mockReturnValue({
    data: {
      assignment,
      myResponse,
      partnerResponse: makeResponse({ id: 'r-2', responseScore: 9 }),
      partnerHasResponded: true,
      isComplete: true,
      nextPromptAt: null,
      reactions: null,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TodayScreen feedback persistence (ask once, doctrine)', () => {
  it('asks "How did this feel?" when no feedback has been recorded yet', async () => {
    setToday(makeResponse({ emotionalResponse: null }));
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('How did this feel?')).toBeTruthy();
    expect(getByText('Warm')).toBeTruthy();
  });

  it('never re-asks on a fresh mount once emotional_response is on the response doc', async () => {
    setToday(makeResponse({ emotionalResponse: 'positive' }));
    const { queryByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(queryByText('How did this feel?')).toBeNull();
    // And no stale "thanks" line lingering on later visits either
    expect(queryByText('Thanks for sharing')).toBeNull();
  });

  it('submits the tapped feeling against the response doc and thanks quietly', async () => {
    setToday(makeResponse({ emotionalResponse: null }));
    const { getByText, queryByText } = render(<TodayScreen />);
    await act(async () => {});

    fireEvent.press(getByText('Warm'));

    expect(mockSubmitFeedback).toHaveBeenCalledWith({
      responseId: 'r-1',
      emotionalResponse: 'positive',
    });
    // The ask is replaced by the quiet thanks in the same session
    expect(queryByText('How did this feel?')).toBeNull();
    expect(getByText('Thanks for sharing')).toBeTruthy();
  });

  it('uses the renamed wellDone greeting on the complete screen', async () => {
    setToday(makeResponse({ emotionalResponse: 'neutral' }));
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('Well done')).toBeTruthy();
  });
});
