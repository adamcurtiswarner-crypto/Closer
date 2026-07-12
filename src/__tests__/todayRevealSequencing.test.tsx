import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Today screen — the reveal presents itself and nothing covers it.
 * (Sim walkthrough 2026-07-12: both partners completed while on Today and
 * neither phone got the ceremony — one was covered by the notification
 * pre-prompt.) Under test:
 *  1. isComplete flipping true moves the screen to the reveal immediately;
 *  2. the push pre-prompt yields to an UNSEEN reveal (both seams) and only
 *     returns once the reveal has been seen (next mount);
 *  3. the "Help us personalize" stage card yields the same way;
 *  4. the lowercase "your partner" fallback reads naturally in shipped copy.
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

// Latest PromptCard / RespondingScreen props — lets tests drive the flow.
let promptCardProps: any = null;
let respondingProps: any = null;

jest.mock('@components', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Null = () => null;
  return {
    AccentBar: Null,
    PromptCard: (props: any) => {
      promptCardProps = props;
      return React.createElement(Text, null, 'prompt-card');
    },
    CompletionMoment: ({ assignmentId }: any) =>
      React.createElement(Text, null, `completion-moment:${assignmentId}`),
    PulsingDots: Null,
    Icon: Null,
    TodayScreenHeader: ({ greeting }: { greeting: string }) =>
      React.createElement(Text, null, greeting),
    RelationshipStagePrompt: () => React.createElement(Text, null, 'stage-prompt'),
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
    OpenDayChip: Null,
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

// Mutable user — fallback-register tests clear the pet name.
let mockUser: Record<string, unknown>;
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: jest.fn() }),
}));

// usePartnerName runs for real; usePartner is stubbed (no query client needed).
let mockPartner: { id: string; email: string; displayName: string | null } | null = null;
jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => ({ data: mockPartner }),
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
jest.mock('@/hooks/usePrompt', () => ({
  useTodayPrompt: () => mockTodayPrompt(),
  useSubmitResponse: () => ({ mutateAsync: mockSubmitResponse, isPending: false }),
  useSubmitFeedback: () => ({ mutate: jest.fn(), isPending: false }),
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

const mockOffer = jest.fn();
jest.mock('@/hooks/useNotificationPrePrompt', () => ({
  useNotificationPrePrompt: () => ({
    visible: false,
    offer: mockOffer,
    accept: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

import TodayScreen from '../../app/(app)/today';

/** Seed AsyncStorage.getItem responses by key; unknown keys resolve null. */
function seedStorage(store: Record<string, string>) {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(store[key] ?? null)
  );
}

const assignment = {
  id: 'a-1',
  coupleId: 'couple-1',
  promptId: 'p-1',
  promptText: 'What made you smile today?',
  promptHint: null,
  promptType: 'communication',
  requiresConversation: false,
  assignedDate: '2026-07-12',
  status: 'delivered',
  assignmentKind: 'daily',
  responseFormat: 'text',
  scaleConfig: null,
  followUp: null,
  closingText: null,
  skippedBy: [],
};

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    responseText: 'The walk after dinner.',
    imageUrl: null,
    submittedAt: new Date(),
    status: 'submitted',
    responseScore: null,
    emotionalResponse: 'positive',
    ...overrides,
  };
}

function setToday(overrides: Record<string, unknown>) {
  mockTodayPrompt.mockReturnValue({
    data: {
      assignment,
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
  promptCardProps = null;
  respondingProps = null;
  seedStorage({});
  mockPartner = null;
  mockUser = {
    id: 'user-1',
    coupleId: 'couple-1',
    displayName: 'Riley',
    partnerName: 'Jordan',
    isOnboarded: true,
    relationshipStage: 'settled',
  };
});

describe('the reveal presents itself', () => {
  it('moves to the completion ceremony the moment isComplete flips while on screen', async () => {
    // Waiting on the partner — sealed card is up
    setToday({ myResponse: makeResponse() });
    const { queryByText, getByText, rerender } = render(<TodayScreen />);
    await act(async () => {});
    expect(getByText('Sealed until Jordan answers.')).toBeTruthy();
    expect(queryByText('completion-moment:a-1')).toBeNull();

    // The partner's answer lands via the snapshot — completion is live
    setToday({
      myResponse: makeResponse(),
      partnerResponse: makeResponse({ id: 'r-2', responseText: 'Coffee in bed.' }),
      partnerHasResponded: true,
      isComplete: true,
    });
    rerender(<TodayScreen />);
    await act(async () => {});

    expect(getByText('completion-moment:a-1')).toBeTruthy();
  });
});

describe('push pre-prompt yields to an unseen reveal', () => {
  it('flags the reveal seam as revealUnseen on the first viewing (gate blocks the card)', async () => {
    setToday({
      myResponse: makeResponse(),
      partnerResponse: makeResponse({ id: 'r-2' }),
      partnerHasResponded: true,
      isComplete: true,
    });
    render(<TodayScreen />);
    await act(async () => {});

    expect(mockOffer).toHaveBeenCalledWith('reveal', { revealUnseen: true });
    expect(mockOffer).not.toHaveBeenCalledWith('reveal', { revealUnseen: false });
  });

  it('offers cleanly at the next mount once the reveal has been seen', async () => {
    seedStorage({ 'reveal_seen_a-1': 'true' });
    setToday({
      myResponse: makeResponse(),
      partnerResponse: makeResponse({ id: 'r-2' }),
      partnerHasResponded: true,
      isComplete: true,
    });
    render(<TodayScreen />);
    await act(async () => {});

    expect(mockOffer).toHaveBeenCalledWith('reveal', { revealUnseen: false });
  });

  it('flags a completing submit (partner already answered) so the card never covers the reveal', async () => {
    mockSubmitResponse.mockResolvedValue({ safetyMatch: false });
    setToday({
      partnerResponse: makeResponse({ id: 'r-2' }),
      partnerHasResponded: true,
    });
    render(<TodayScreen />);
    await act(async () => {});

    await act(async () => {
      promptCardProps.onRespond();
    });
    await act(async () => {
      respondingProps.onChangeText('A real answer with enough length.');
    });
    await act(async () => {
      await respondingProps.onSubmit();
    });

    expect(mockOffer).toHaveBeenCalledWith('first_submit', { revealUnseen: true });
  });

  it('offers normally on a first submit that leaves the day sealed (no reveal imminent)', async () => {
    mockSubmitResponse.mockResolvedValue({ safetyMatch: false });
    setToday({});
    render(<TodayScreen />);
    await act(async () => {});

    await act(async () => {
      promptCardProps.onRespond();
    });
    await act(async () => {
      respondingProps.onChangeText('A real answer with enough length.');
    });
    await act(async () => {
      await respondingProps.onSubmit();
    });

    expect(mockOffer).toHaveBeenCalledWith('first_submit', { revealUnseen: false });
  });
});

describe('stage card yields to an unseen reveal', () => {
  beforeEach(() => {
    mockUser = { ...mockUser, relationshipStage: null };
  });

  it('shows below the day card in ordinary modes', async () => {
    setToday({});
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});
    expect(getByText('stage-prompt')).toBeTruthy();
  });

  it('never renders while an unseen reveal is on screen', async () => {
    setToday({
      myResponse: makeResponse(),
      partnerResponse: makeResponse({ id: 'r-2' }),
      partnerHasResponded: true,
      isComplete: true,
    });
    const { queryByText, getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('completion-moment:a-1')).toBeTruthy();
    expect(queryByText('stage-prompt')).toBeNull();
  });

  it('returns on the next mount once the reveal has been seen', async () => {
    seedStorage({ 'reveal_seen_a-1': 'true' });
    setToday({
      myResponse: makeResponse(),
      partnerResponse: makeResponse({ id: 'r-2' }),
      partnerHasResponded: true,
      isComplete: true,
    });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('stage-prompt')).toBeTruthy();
  });
});

describe('partner-name register (lowercase fallback reads naturally)', () => {
  beforeEach(() => {
    mockUser = { ...mockUser, partnerName: null };
  });

  it('seals until "your partner" answers — never robot-register "Partner"', async () => {
    setToday({ myResponse: makeResponse() });
    const { getByText, queryByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('Sealed until your partner answers.')).toBeTruthy();
    expect(queryByText('Sealed until Partner answers.')).toBeNull();
    expect(getByText('Send your partner a question while you wait')).toBeTruthy();
  });

  it("prefers the partner's own display name over the fallback", async () => {
    mockPartner = { id: 'user-2', email: 's@x.com', displayName: 'Sam' };
    setToday({ myResponse: makeResponse() });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(getByText('Sealed until Sam answers.')).toBeTruthy();
  });

  it('capitalizes the fallback when it opens a sentence (partner set-aside line)', async () => {
    setToday({
      assignment: {
        ...assignment,
        assignmentKind: 'follow_up',
        followUp: { branch: 'repair', parentAssignmentId: 'a-0' },
        skippedBy: ['user-2'],
      },
      myResponse: makeResponse(),
    });
    const { getByText } = render(<TodayScreen />);
    await act(async () => {});

    expect(
      getByText("Your partner set this one aside for today — it'll keep. Your answer is saved.")
    ).toBeTruthy();
  });
});
