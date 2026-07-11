import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

/**
 * Today screen — sealed days coexist ("the day always arrives").
 * The window can hold TWO live daily-flow assignments (yesterday + today):
 * the open-day chip gives yesterday's question a quiet row under the primary
 * card, and the sealed-waiting card gets one agency CTA into Explore.
 */

// ─── Mocks ───

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: jest.fn(),
  },
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

const mockLogEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));
jest.mock('@/services/imageUpload', () => ({ pickImage: jest.fn() }));
jest.mock('@/services/widgetBridge', () => ({
  updateWidgetData: jest.fn(),
  buildWidgetData: jest.fn(() => ({})),
}));
jest.mock('@/config/milestones', () => ({
  getAnniversaryCountdown: jest.fn(() => ({ days: 10, isToday: false })),
}));

// Latest RespondingScreen props — lets tests drive the editor directly.
let respondingProps: any = null;

jest.mock('@components', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const Null = () => null;
  return {
    AccentBar: Null,
    PromptCard: Null,
    CompletionMoment: ({ assignmentId, promptText }: any) =>
      React.createElement(Text, null, `completion-moment:${assignmentId}:${promptText}`),
    PulsingDots: Null,
    Icon: Null,
    TodayScreenHeader: ({ greeting }: { greeting: string }) =>
      React.createElement(Text, null, greeting),
    RelationshipStagePrompt: Null,
    EngagementCards: Null,
    RespondingScreen: (props: any) => {
      respondingProps = props;
      return React.createElement(Text, null, `responding:${props.promptText}`);
    },
    TodayBottomSections: Null,
    ConversationStarterModal: Null,
    SafetyResources: Null,
    ScalePromptCard: Null,
    FollowUpContextLine: Null,
    FollowUpSkip: Null,
    FollowUpLockedCard: Null,
    getFollowUpContextLine: () => null,
    PartnerQuestionCard: Null,
    // The real chip — its states and tap wiring are under test
    OpenDayChip: require('@/components/OpenDayChip').OpenDayChip,
    Paywall: Null,
    __esModule: true,
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
const mockSubmitResponse = jest.fn();
const mockUseAssignmentReveal = jest.fn();
jest.mock('@/hooks/usePrompt', () => ({
  useTodayPrompt: () => mockTodayPrompt(),
  useSubmitResponse: () => ({ mutateAsync: mockSubmitResponse, isPending: false }),
  useSubmitFeedback: () => ({ mutate: jest.fn(), isPending: false }),
  useTriggerPrompt: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipFollowUp: () => ({ mutate: jest.fn(), isPending: false }),
  useAssignmentReveal: (id: string | null) => mockUseAssignmentReveal(id),
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

const primaryAssignment = {
  id: 'a-today',
  coupleId: 'couple-1',
  promptId: 'p-1',
  promptText: "Today's question",
  promptHint: null,
  promptType: 'communication',
  requiresConversation: false,
  assignedDate: '2026-07-10',
  status: 'delivered',
  assignmentKind: 'daily',
  responseFormat: 'text',
  scaleConfig: null,
  followUp: null,
  closingText: null,
  skippedBy: [],
};

const secondaryAssignmentBase = {
  ...primaryAssignment,
  id: 'a-yesterday',
  promptText: "Yesterday's question",
  assignedDate: '2026-07-09',
};

const myResponse = {
  id: 'r-1',
  responseText: 'My saved answer.',
  imageUrl: null,
  submittedAt: new Date(),
  status: 'submitted',
  responseScore: null,
  emotionalResponse: 'positive',
};

function setToday(overrides: Record<string, unknown>) {
  mockTodayPrompt.mockReturnValue({
    data: {
      assignment: primaryAssignment,
      myResponse: null,
      partnerResponse: null,
      partnerHasResponded: false,
      isComplete: false,
      nextPromptAt: null,
      reactions: null,
      secondaryAssignment: null,
      ...overrides,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  respondingProps = null;
  mockUseAssignmentReveal.mockReturnValue({
    data: {
      myResponse: { ...myResponse, responseText: 'Mine from yesterday.' },
      partnerResponse: { ...myResponse, id: 'r-2', responseText: 'Theirs from yesterday.' },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
});

describe('waiting-card agency CTA', () => {
  it('shows one quiet action while sealed and routes to Explore with analytics', async () => {
    setToday({ myResponse, partnerHasResponded: false });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    const cta = getByText('Send Jordan a question while you wait');
    fireEvent.press(cta);

    expect(mockLogEvent).toHaveBeenCalledWith('waiting_cta_tapped');
    expect(mockRouterPush).toHaveBeenCalledWith('/(app)/explore');
  });
});

describe('open-day chip on the Today screen', () => {
  it('renders nothing extra when no secondary day exists (the 99% case)', async () => {
    setToday({});
    const { queryByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(queryByText('Yesterday · sealed until Jordan answers')).toBeNull();
    expect(queryByText("Yesterday's question is still open")).toBeNull();
    expect(queryByText('Yesterday · you both answered — see it')).toBeNull();
  });

  it('shows the sealed line under the prompt card when I answered yesterday first', async () => {
    setToday({
      secondaryAssignment: {
        assignment: secondaryAssignmentBase,
        iAnswered: true,
        partnerAnswered: false,
        isComplete: false,
      },
    });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('Yesterday · sealed until Jordan answers')).toBeTruthy();
  });

  it("routes yesterday's still-open question into the responding flow and submits with ITS id", async () => {
    mockSubmitResponse.mockResolvedValue({ safetyMatch: false });
    setToday({
      secondaryAssignment: {
        assignment: secondaryAssignmentBase,
        iAnswered: false,
        partnerAnswered: true,
        isComplete: false,
      },
    });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    fireEvent.press(getByText("Yesterday's question is still open"));

    // The full-screen editor opens on the SECONDARY assignment's text
    expect(getByText("responding:Yesterday's question")).toBeTruthy();
    expect(mockLogEvent).toHaveBeenCalledWith('prompt_started', {
      assignment_id: 'a-yesterday',
      source: 'open_day_chip',
    });

    // Drive the editor: type enough, submit — the write targets a-yesterday
    await act(async () => {
      respondingProps.onChangeText('A real answer with enough length.');
    });
    await act(async () => {
      await respondingProps.onSubmit();
    });
    expect(mockSubmitResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'a-yesterday',
        responseText: 'A real answer with enough length.',
      })
    );
  });

  it('offers the unseen finished day and presents its CompletionMoment in the sheet', async () => {
    setToday({
      secondaryAssignment: {
        assignment: { ...secondaryAssignmentBase, status: 'completed' },
        iAnswered: true,
        partnerAnswered: true,
        isComplete: true,
      },
    });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    // Chip shows because the reveal is unseen (AsyncStorage has no seen key)
    const chip = getByText('Yesterday · you both answered — see it');

    // Sheet closed — no reveal fetch yet
    expect(mockUseAssignmentReveal).toHaveBeenLastCalledWith(null);

    fireEvent.press(chip);
    await act(async () => {});

    // Sheet open — the reveal fetch targets the secondary assignment
    expect(mockUseAssignmentReveal).toHaveBeenLastCalledWith('a-yesterday');
    expect(
      getByText("completion-moment:a-yesterday:Yesterday's question")
    ).toBeTruthy();
  });
});
