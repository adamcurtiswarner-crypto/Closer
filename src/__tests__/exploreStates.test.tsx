import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

const mockSearchParams = jest.fn(() => ({} as Record<string, string>));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams(),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

// Reveal reactions write through useReaction (completion doc id = assignment id)
const mockReact = jest.fn();
jest.mock('@/hooks/useReaction', () => ({
  REACTIONS: [
    { type: 'heart', icon: 'heart' },
    { type: 'fire', icon: 'flame' },
    { type: 'laughing', icon: 'smiley' },
    { type: 'teary', icon: 'drop' },
  ],
  useReaction: () => ({ mutate: mockReact, isPending: false }),
}));

// CompletionMoment pulls in the couch-flag hooks (firebase/firestore) —
// mocked at the module boundary like useReaction above.
jest.mock('@/hooks/useCouchFlag', () => ({
  isCouchFlagged: (s: { couchFlagged?: boolean } | null | undefined) =>
    s?.couchFlagged === true,
  useCouchFlagState: () => ({ data: null }),
  useCouchFlag: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/SafetyResources', () => ({ SafetyResources: () => null }));

// Couple-scoped entitlement — controllable per test (default: free couple)
const mockSubscription = jest.fn();
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockSubscription(),
}));

// Paywall stub that surfaces visibility + source without the real sheet
jest.mock('@/components/Paywall', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Paywall: ({ visible, source }: { visible: boolean; source?: string }) =>
      visible
        ? React.createElement(Text, { testID: 'paywall' }, `paywall:${source}`)
        : null,
  };
});

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

const mockUser: { id: string; coupleId: string | null } = {
  id: 'user-1',
  coupleId: 'couple-1',
};
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockPartnerQuery = jest.fn();
jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => mockPartnerQuery(),
}));

const mockSubmitResponse = jest.fn();
jest.mock('@/hooks/usePrompt', () => ({
  useSubmitResponse: () => ({ mutateAsync: mockSubmitResponse, isPending: false }),
}));

const mockPromptsQuery = jest.fn();
const mockAssignmentsQuery = jest.fn();
const mockResponsesQuery = jest.fn();
const mockReactionsQuery = jest.fn();
const mockStartExplore = jest.fn();
jest.mock('@/hooks/useExplorePrompts', () => {
  class NoCoupleLinkedError extends Error {}
  return {
    NoCoupleLinkedError,
    // Real filter logic — expired assignments behave as "never started"
    isLiveExploreAssignment: (a: { status: string }) => a.status !== 'expired',
    usePromptsByCategory: (category: string | null) => mockPromptsQuery(category),
    useExploreAssignments: () => mockAssignmentsQuery(),
    useStartExplorePrompt: () => ({ mutateAsync: mockStartExplore, isPending: false }),
    useExploreResponses: (assignmentId: string | null, status?: string) =>
      mockResponsesQuery(assignmentId, status),
    useCompletionReactions: (assignmentId: string | null) =>
      mockReactionsQuery(assignmentId),
  };
});

import ExploreScreen from '../../app/(app)/explore';

const PROMPT = {
  id: 'prompt-1',
  text: 'What made you smile today?',
  hint: null,
  type: 'daily_connection',
  emotionalDepth: 'surface',
};

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assign-1',
    promptId: 'prompt-1',
    promptText: PROMPT.text,
    promptHint: null,
    category: 'daily_connection',
    status: 'delivered',
    firstResponderId: null,
    responseCount: 0,
    createdAt: new Date('2026-07-08T10:00:00'),
    ...overrides,
  };
}

function setQueries({
  prompts = { data: [PROMPT], isLoading: false, isError: false, refetch: jest.fn() },
  assignments = { data: [] },
  responses = { data: null, isLoading: false },
  reactions = { data: null },
}: {
  prompts?: object;
  assignments?: object;
  responses?: object;
  reactions?: object;
} = {}) {
  mockPromptsQuery.mockReturnValue(prompts);
  mockAssignmentsQuery.mockReturnValue(assignments);
  mockResponsesQuery.mockReturnValue(responses);
  mockReactionsQuery.mockReturnValue(reactions);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams.mockReturnValue({});
  mockUser.coupleId = 'couple-1';
  mockPartnerQuery.mockReturnValue({
    data: { id: 'user-2', email: 'j@example.com', displayName: 'Jordan' },
  });
  mockSubscription.mockReturnValue({ isPremium: false, isLoading: false });
});

describe('ExploreScreen states', () => {
  describe('prompts load failure', () => {
    it('renders a quiet in-shell error card while the header and chips stay', () => {
      const refetch = jest.fn();
      setQueries({
        prompts: { data: undefined, isLoading: false, isError: true, refetch },
      });
      const { getByText } = render(<ExploreScreen />);

      // Shell stays put
      expect(getByText('Categories')).toBeTruthy();
      expect(getByText('Browse by category')).toBeTruthy();
      // Error card with one-line message and retry
      expect(
        getByText("These prompts didn't load. Check your connection and try again.")
      ).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('retries the query when the retry pill is pressed', () => {
      const refetch = jest.fn();
      setQueries({
        prompts: { data: undefined, isLoading: false, isError: true, refetch },
      });
      const { getByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('Retry'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('respond without a linked couple', () => {
    it('shows a quiet inline notice and keeps the user on the screen', () => {
      mockUser.coupleId = null;
      setQueries();
      const { getByText, queryByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      expect(
        getByText('Link with your partner first — questions are answered together.')
      ).toBeTruthy();
      // Still in browse mode — prompt list is visible, no respond editor
      expect(getByText(PROMPT.text)).toBeTruthy();
      expect(queryByText('Ready to share')).toBeNull();
      expect(mockStartExplore).not.toHaveBeenCalled();
    });
  });

  describe('depth taxonomy', () => {
    it('does not leak internal depth vocabulary on prompt cards', () => {
      setQueries();
      const { queryByText } = render(<ExploreScreen />);
      expect(queryByText('surface')).toBeNull();
      expect(queryByText('Surface')).toBeNull();
    });
  });

  describe('no assignment yet', () => {
    it('shows Respond, and an expired assignment counts as never started', () => {
      setQueries({
        assignments: { data: [makeAssignment({ status: 'expired' })] },
      });
      const { getByText, queryByText } = render(<ExploreScreen />);

      expect(getByText('Respond')).toBeTruthy();
      expect(queryByText('Waiting on Jordan')).toBeNull();
    });
  });

  describe("partial — I answered (sealed-waiting)", () => {
    const myPartial = makeAssignment({
      status: 'partial',
      firstResponderId: 'user-1',
      responseCount: 1,
    });

    it('shows the waiting-on-partner state with the sealed line, no Respond button', () => {
      setQueries({ assignments: { data: [myPartial] } });
      const { getByText, queryByText } = render(<ExploreScreen />);

      expect(getByText('Waiting on Jordan')).toBeTruthy();
      expect(getByText('Your answer is sealed until they respond.')).toBeTruthy();
      expect(queryByText('Respond')).toBeNull();
      expect(queryByText('See both answers')).toBeNull();
    });

    it('tapping the waiting state reveals MY answer only', () => {
      setQueries({
        assignments: { data: [myPartial] },
        responses: {
          // The hook seals partials to the current user's own response
          data: [
            { id: 'r1', userId: 'user-1', text: 'My sealed answer', isCurrentUser: true, submittedAt: null },
          ],
          isLoading: false,
        },
      });
      const { getByText, queryByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('Waiting on Jordan'));

      expect(mockResponsesQuery).toHaveBeenCalledWith('assign-1', 'partial');
      expect(getByText('You')).toBeTruthy();
      expect(getByText('My sealed answer')).toBeTruthy();
      expect(queryByText('Jordan')).toBeNull();
    });

    it('falls back to "your partner" when there is no partner display name', () => {
      mockPartnerQuery.mockReturnValue({ data: null });
      setQueries({ assignments: { data: [myPartial] } });
      const { getByText } = render(<ExploreScreen />);

      expect(getByText('Waiting on your partner')).toBeTruthy();
    });
  });

  describe('partial — PARTNER answered (their question waits)', () => {
    const partnerPartial = makeAssignment({
      status: 'partial',
      firstResponderId: 'user-2',
      responseCount: 1,
    });

    it('invites me to answer with a Respond button and no hourglass dead-end', () => {
      setQueries({ assignments: { data: [partnerPartial] } });
      const { getByText, queryByText } = render(<ExploreScreen />);

      expect(getByText('Jordan asked you this')).toBeTruthy();
      expect(getByText('Respond')).toBeTruthy();
      expect(queryByText('Waiting on Jordan')).toBeNull();
    });

    it('pressing Respond starts the respond flow against the existing assignment', async () => {
      mockStartExplore.mockResolvedValue({
        assignmentId: 'assign-1',
        prompt: PROMPT,
        reused: true,
      });
      setQueries({ assignments: { data: [partnerPartial] } });
      const { getByText, findByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      // Respond editor opens on the same prompt (guard reuses assign-1)
      expect(mockStartExplore).toHaveBeenCalledWith(PROMPT);
      expect(await findByText(`${PROMPT.text}`)).toBeTruthy();
    });

    it('never shows the partner answer while partial', () => {
      setQueries({ assignments: { data: [partnerPartial] } });
      const { queryByText } = render(<ExploreScreen />);
      expect(queryByText('See both answers')).toBeNull();
    });
  });

  describe('premium gate on sending (premiumGates on)', () => {
    it('free couple tapping Respond on a fresh prompt opens the paywall, not the editor', () => {
      const { logEvent } = require('@/services/analytics');
      setQueries();
      const { getByText, getByTestId, queryByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      expect(getByTestId('paywall')).toBeTruthy();
      expect(getByText('paywall:explore_send')).toBeTruthy();
      expect(mockStartExplore).not.toHaveBeenCalled();
      expect(queryByText('Ready to share')).toBeNull();
      expect(logEvent).toHaveBeenCalledWith('gate_hit', { surface: 'explore_send' });
    });

    it('ANSWERING a question the partner sent stays free — no paywall for the recipient', async () => {
      mockStartExplore.mockResolvedValue({ assignmentId: 'assign-1', reused: true });
      setQueries({
        assignments: {
          data: [
            makeAssignment({
              status: 'partial',
              firstResponderId: 'user-2',
              responseCount: 1,
            }),
          ],
        },
      });
      const { getByText, findByText, queryByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      expect(queryByTestId('paywall')).toBeNull();
      expect(mockStartExplore).toHaveBeenCalledWith(PROMPT);
      expect(await findByText(`${PROMPT.text}`)).toBeTruthy();
    });

    it('a premium couple sends freely', async () => {
      mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
      mockStartExplore.mockResolvedValue({ assignmentId: 'assign-1', reused: false });
      setQueries();
      const { getByText, findByText, queryByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      expect(queryByTestId('paywall')).toBeNull();
      expect(mockStartExplore).toHaveBeenCalledWith(PROMPT);
      expect(await findByText(`${PROMPT.text}`)).toBeTruthy();
    });
  });

  describe('completed — the reveal ceremony (CompletionMoment sheet)', () => {
    const completed = makeAssignment({ status: 'completed', responseCount: 2 });
    const bothResponses = {
      data: [
        { id: 'r1', userId: 'user-1', text: 'Mine', isCurrentUser: true, submittedAt: null },
        { id: 'r2', userId: 'user-2', text: 'Theirs', isCurrentUser: false, submittedAt: null },
      ],
      isLoading: false,
    };

    it('shows a quiet loading state in the reveal sheet while answers load', () => {
      setQueries({
        assignments: { data: [completed] },
        responses: { data: null, isLoading: true },
      });
      const { getByText, getByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      expect(getByTestId('explore-reveal-loading')).toBeTruthy();
    });

    it('opens the CompletionMoment reveal with both answers and the partner name', async () => {
      setQueries({
        assignments: { data: [completed] },
        responses: bothResponses,
      });
      const { getByText, getAllByText, findByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      await act(async () => {});

      // Responses are fetched for the completed assignment (seal is open)
      expect(mockResponsesQuery).toHaveBeenCalledWith('assign-1', 'completed');
      // The reveal ceremony card — same component as the daily reveal.
      // The prompt text appears twice: the list card behind the sheet and
      // the reveal card itself (unquoted since the design unification).
      expect(await findByText('You both answered')).toBeTruthy();
      expect(getAllByText(`${PROMPT.text}`).length).toBeGreaterThanOrEqual(2);
      expect(getByText('You')).toBeTruthy();
      expect(getByText('Mine')).toBeTruthy();
      expect(getByText('Jordan')).toBeTruthy();
      expect(getByText('Theirs')).toBeTruthy();
    });

    it('choreography is gated per assignment via the reveal_seen key', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      setQueries({
        assignments: { data: [completed] },
        responses: bothResponses,
      });
      const { getByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      await act(async () => {});

      // First open marks this assignment's reveal as seen — revisits flatten
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('reveal_seen_assign-1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('reveal_seen_assign-1', 'true');
    });

    it('keeps the card compact after viewing — no inline accordion, sheet closes back to the badge', async () => {
      setQueries({
        assignments: { data: [completed] },
        responses: bothResponses,
      });
      const { getByText, getByTestId, queryByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      await act(async () => {});
      fireEvent.press(getByTestId('explore-reveal-close'));

      // Card returns to its compact state — answers never render inline
      expect(getByText('See both answers')).toBeTruthy();
      expect(queryByText('Mine')).toBeNull();
      expect(queryByText('Theirs')).toBeNull();
    });

    it('wires reactions to the completion doc (doc id = assignment id)', async () => {
      setQueries({
        assignments: { data: [completed] },
        responses: bothResponses,
        reactions: { data: { 'user-2': 'fire' } },
      });
      const { getByText, findByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      await act(async () => {});

      // Reactions were read for this assignment's completion doc
      expect(mockReactionsQuery).toHaveBeenCalledWith('assign-1');
      // The partner's existing reaction shows on the row
      expect(await findByText('Jordan felt the spark')).toBeTruthy();

      // Tapping a reaction writes through useReaction with the assignment id
      fireEvent.press(getByText('Love'));
      expect(mockReact).toHaveBeenCalledWith({
        assignmentId: 'assign-1',
        reaction: 'heart',
        promptType: 'daily_connection',
      });
    });

    it('surfaces a quiet retry when the answers fail to load', async () => {
      const refetch = jest.fn();
      setQueries({
        assignments: { data: [completed] },
        responses: { data: null, isLoading: false, isError: true, refetch },
      });
      const { getByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      expect(getByText("Couldn't load the answers.")).toBeTruthy();
      fireEvent.press(getByText('Try again'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('deep-linking to a completed assignment opens the reveal sheet directly', async () => {
      mockSearchParams.mockReturnValue({ assignmentId: 'assign-1' });
      setQueries({
        assignments: { data: [completed] },
        responses: bothResponses,
      });
      const { findByText } = render(<ExploreScreen />);
      await act(async () => {});

      expect(await findByText('You both answered')).toBeTruthy();
    });
  });
});
