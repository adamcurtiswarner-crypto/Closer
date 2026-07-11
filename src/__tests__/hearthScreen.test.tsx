import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

// useHearth pulls firebase through its listener plumbing
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
  functions: {},
}));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/HearthTalkSheet', () => ({ HearthTalkSheet: () => null }));
jest.mock('@/components/Paywall', () => ({ Paywall: () => null }));

// Prop-capturing mocks — the screen's wiring into the detail view and the
// reveal sheet is what's under test, not their internals.
const mockCategoryDetailProps = jest.fn();
jest.mock('@/components/HearthCategoryDetail', () => ({
  HearthCategoryDetail: (props: Record<string, unknown>) => {
    mockCategoryDetailProps(props);
    return null;
  },
}));
const mockRevealSheetProps = jest.fn();
jest.mock('@/components/HearthRevealSheet', () => ({
  HearthRevealSheet: (props: Record<string, unknown>) => {
    mockRevealSheetProps(props);
    return null;
  },
}));

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
    user: { id: 'user-1', coupleId: 'couple-1', partnerName: 'Jordan' },
  }),
}));

jest.mock('@/hooks/usePersonalize', () => ({
  usePersonalize: () => (s: string) => s,
}));

const mockSubscription = jest.fn();
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockSubscription(),
}));

// Real pure helpers (couchQueue, perCategoryState, monthlyStats, ...) with
// controllable query hooks — the screen's gating logic is what's under test.
const mockHearthQuery = jest.fn();
jest.mock('@/hooks/useHearth', () => {
  const actual = jest.requireActual('@/hooks/useHearth');
  return {
    ...actual,
    useHearth: () => mockHearthQuery(),
    useMarkDiscussed: () => ({ mutate: jest.fn(), isPending: false }),
  };
});

import HearthScreen from '../../app/(app)/hearth';
import { logEvent } from '@/services/analytics';

function lastProps(mock: jest.Mock): Record<string, any> {
  const calls = mock.mock.calls;
  return calls[calls.length - 1][0];
}

function makeCompletion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    category: 'communication',
    promptText: 'How connected did you feel this week?',
    isScale: true,
    responses: [
      { userId: 'user-1', responseText: 'a', responseScore: 8, imageUrl: null, submittedAt: null },
      { userId: 'user-2', responseText: 'b', responseScore: 9, imageUrl: null, submittedAt: null },
    ],
    signal: 'deepener' as const,
    discussed: {},
    discussedAt: null,
    completedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscription.mockReturnValue({ isPremium: false, isLoading: false });
});

describe('HearthScreen first-run states', () => {
  describe('loading', () => {
    it('shows neutral shimmer tiles — never the 12 dead Steady embers', () => {
      mockHearthQuery.mockReturnValue({ data: [], isLoading: true });
      const { getByTestId, queryByTestId, queryAllByText, queryByText } = render(
        <HearthScreen />
      );

      expect(getByTestId('hearth-loading')).toBeTruthy();
      // No ember grid flash while loading
      expect(queryByTestId('hearth-tile-communication')).toBeNull();
      expect(queryAllByText('Steady')).toHaveLength(0);
      // And no premature empty state either
      expect(queryByText('Your first answered question will glow here.')).toBeNull();
    });
  });

  describe('zero completions (brand-new couple)', () => {
    it('shows the first-ember empty state INSTEAD of the grid', () => {
      mockHearthQuery.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId, getByText, queryByTestId, queryAllByText } = render(
        <HearthScreen />
      );

      expect(getByTestId('hearth-empty')).toBeTruthy();
      expect(getByText('Your first answered question will glow here.')).toBeTruthy();
      expect(getByText("It starts with today's question.")).toBeTruthy();
      // The grid of unlit tiles never renders for a couple with no completions
      expect(queryByTestId('hearth-tile-communication')).toBeNull();
      expect(queryAllByText('Steady')).toHaveLength(0);
      // Nothing to gate on an empty hearth
      expect(queryByTestId('hearth-gate')).toBeNull();
    });
  });

  describe('with completions', () => {
    it('renders the ember grid with the completed category glowing', () => {
      mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
      const { getByTestId, queryByTestId } = render(<HearthScreen />);

      expect(getByTestId('hearth-tile-communication')).toBeTruthy();
      expect(getByTestId('hearth-tile-intimacy')).toBeTruthy();
      expect(queryByTestId('hearth-empty')).toBeNull();
      expect(queryByTestId('hearth-loading')).toBeNull();
    });

    it('keeps the HearthGateCard below the grid for free couples', () => {
      mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
      const { getByTestId } = render(<HearthScreen />);

      expect(getByTestId('hearth-gate')).toBeTruthy();
    });

    it('premium couples see no gate card', () => {
      mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
      mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
      const { queryByTestId } = render(<HearthScreen />);

      expect(queryByTestId('hearth-gate')).toBeNull();
    });
  });
});

describe('HearthScreen past-day reveal wiring', () => {
  it('the reveal sheet starts closed', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    render(<HearthScreen />);

    const sheet = lastProps(mockRevealSheetProps);
    expect(sheet.visible).toBe(false);
    expect(sheet.completion).toBeNull();
  });

  it('the queue card’s "Read the answers" line opens the reveal and logs it', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion({ signal: 'repair' })],
      isLoading: false,
    });
    const { getByTestId } = render(<HearthScreen />);

    fireEvent.press(getByTestId('hearth-queue-c-1-read'));

    expect(logEvent).toHaveBeenCalledWith('hearth_reveal_opened', {
      assignment_id: 'c-1',
    });
    const sheet = lastProps(mockRevealSheetProps);
    expect(sheet.visible).toBe(true);
    expect(sheet.completion?.id).toBe('c-1');
    expect(sheet.myUid).toBe('user-1');
    expect(sheet.partnerName).toBe('Jordan');
  });

  it('the queue card body still opens the talk sheet, not the reveal', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion({ signal: 'repair' })],
      isLoading: false,
    });
    const { getByTestId } = render(<HearthScreen />);

    fireEvent.press(getByTestId('hearth-queue-c-1'));

    expect(logEvent).toHaveBeenCalledWith('talk_sheet_opened', {
      completion_id: 'c-1',
      signal: 'repair',
    });
    expect(lastProps(mockRevealSheetProps).visible).toBe(false);
  });

  it('category detail entries route through the same reveal opener', () => {
    const completion = makeCompletion();
    mockHearthQuery.mockReturnValue({ data: [completion], isLoading: false });
    const { getByTestId } = render(<HearthScreen />);

    // Enter detail mode via the ember tile, then open a day from the
    // captured detail props (the detail view itself is prop-tested).
    fireEvent.press(getByTestId('hearth-tile-communication'));
    const detail = lastProps(mockCategoryDetailProps);

    act(() => {
      detail.onOpenReveal(detail.entries[0]);
    });

    expect(logEvent).toHaveBeenCalledWith('hearth_reveal_opened', {
      assignment_id: 'c-1',
    });
    const sheet = lastProps(mockRevealSheetProps);
    expect(sheet.visible).toBe(true);
    expect(sheet.completion?.id).toBe('c-1');
  });

  it('closing the sheet settles it back to closed', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion({ signal: 'repair' })],
      isLoading: false,
    });
    const { getByTestId } = render(<HearthScreen />);

    fireEvent.press(getByTestId('hearth-queue-c-1-read'));
    expect(lastProps(mockRevealSheetProps).visible).toBe(true);

    act(() => {
      lastProps(mockRevealSheetProps).onClose();
    });
    const sheet = lastProps(mockRevealSheetProps);
    expect(sheet.visible).toBe(false);
    expect(sheet.completion).toBeNull();
  });
});
