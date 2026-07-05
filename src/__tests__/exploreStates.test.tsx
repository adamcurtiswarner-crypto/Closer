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

jest.mock('@/hooks/usePrompt', () => ({
  useSubmitResponse: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockPromptsQuery = jest.fn();
const mockAssignmentsQuery = jest.fn();
const mockResponsesQuery = jest.fn();
const mockStartExplore = jest.fn();
jest.mock('@/hooks/useExplorePrompts', () => {
  class NoCoupleLinkedError extends Error {}
  return {
    NoCoupleLinkedError,
    usePromptsByCategory: (category: string | null) => mockPromptsQuery(category),
    useExploreAssignments: () => mockAssignmentsQuery(),
    useStartExplorePrompt: () => ({ mutateAsync: mockStartExplore, isPending: false }),
    useExploreResponses: (assignmentId: string | null) => mockResponsesQuery(assignmentId),
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

  describe('viewing a completed response', () => {
    it('shows a skeleton while responses load', () => {
      setQueries({
        assignments: { data: [{ id: 'assign-1', promptId: 'prompt-1', status: 'completed' }] },
        responses: { data: null, isLoading: true },
      });
      const { getByText, getByTestId } = render(<ExploreScreen />);

      fireEvent.press(getByText('View responses'));
      expect(getByTestId('explore-responses-loading')).toBeTruthy();
    });

    it('shows both responses once loaded', () => {
      setQueries({
        assignments: { data: [{ id: 'assign-1', promptId: 'prompt-1', status: 'completed' }] },
        responses: {
          data: [
            { id: 'r1', userId: 'user-1', text: 'Mine', isCurrentUser: true, submittedAt: null },
            { id: 'r2', userId: 'user-2', text: 'Theirs', isCurrentUser: false, submittedAt: null },
          ],
          isLoading: false,
        },
      });
      const { getByText } = render(<ExploreScreen />);

      fireEvent.press(getByText('View responses'));
      expect(getByText('You')).toBeTruthy();
      expect(getByText('Mine')).toBeTruthy();
      expect(getByText('Partner')).toBeTruthy();
      expect(getByText('Theirs')).toBeTruthy();
    });
  });
});
