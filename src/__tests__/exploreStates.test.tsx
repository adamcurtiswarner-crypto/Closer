import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
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
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
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
}: {
  prompts?: object;
  assignments?: object;
  responses?: object;
} = {}) {
  mockPromptsQuery.mockReturnValue(prompts);
  mockAssignmentsQuery.mockReturnValue(assignments);
  mockResponsesQuery.mockReturnValue(responses);
}

beforeEach(() => {
  jest.clearAllMocks();
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

      expect(mockResponsesQuery).toHaveBeenLastCalledWith('assign-1', 'partial');
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
      expect(await findByText(`“${PROMPT.text}”`)).toBeTruthy();
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
      expect(await findByText(`“${PROMPT.text}”`)).toBeTruthy();
    });

    it('a premium couple sends freely', async () => {
      mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
      mockStartExplore.mockResolvedValue({ assignmentId: 'assign-1', reused: false });
      setQueries();
      const { getByText, findByText, queryByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('Respond'));

      expect(queryByTestId('paywall')).toBeNull();
      expect(mockStartExplore).toHaveBeenCalledWith(PROMPT);
      expect(await findByText(`“${PROMPT.text}”`)).toBeTruthy();
    });
  });

  describe('viewing a completed response', () => {
    it('shows a skeleton while responses load', () => {
      setQueries({
        assignments: { data: [makeAssignment({ status: 'completed', responseCount: 2 })] },
        responses: { data: null, isLoading: true },
      });
      const { getByText, getByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      expect(getByTestId('explore-responses-loading')).toBeTruthy();
    });

    it('shows both answers labeled You / partner name once loaded', () => {
      setQueries({
        assignments: { data: [makeAssignment({ status: 'completed', responseCount: 2 })] },
        responses: {
          data: [
            { id: 'r1', userId: 'user-1', text: 'Mine', isCurrentUser: true, submittedAt: null },
            { id: 'r2', userId: 'user-2', text: 'Theirs', isCurrentUser: false, submittedAt: null },
          ],
          isLoading: false,
        },
      });
      const { getByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('See both answers'));
      expect(mockResponsesQuery).toHaveBeenLastCalledWith('assign-1', 'completed');
      expect(getByText('You')).toBeTruthy();
      expect(getByText('Mine')).toBeTruthy();
      expect(getByText('Jordan')).toBeTruthy();
      expect(getByText('Theirs')).toBeTruthy();
      expect(getByText('Hide')).toBeTruthy();
    });
  });
});
