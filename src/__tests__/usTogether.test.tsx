/**
 * Tests for the tending half of the Us view — the week, the couch queue and
 * the month's two numbers, with the talk and reveal sheets they open.
 *
 * These moved here from hearthScreen.test.tsx on 2026-11-14 when the Hearth
 * home was retired. The behaviour did not change: a free couple keeps the
 * current month's queue and the whole talk ritual, history is what the gate
 * holds back, and the queue card body opens the talk sheet while "read the
 * answers" opens the reveal.
 *
 * The tests that did NOT move are gone on purpose: the ember grid, the
 * header metrics strip and the per-tile tallies described a second grid of
 * the same twelve categories, which the Us map replaced.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// ─── Mocks ───

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSearchParams = jest.fn(() => ({}) as Record<string, string>);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, setParams: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams(),
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

// Resolve t() against the real en.json so tests assert shipped copy —
// including i18next v4 plural keys (key_one / key_other via options.count).
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let value = lookup(key);
        if (typeof value !== 'string' && typeof options?.count === 'number') {
          value = lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`);
        }
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

// The screen resolves the partner's name through the single source of truth
// (partner display_name → pet name → quiet fallback), never user.partnerName
// directly — the live rerun showed "your partner" while display_name was set.
const mockPartnerName = jest.fn();
jest.mock('@/hooks/usePartnerName', () => ({
  usePartnerName: () => mockPartnerName(),
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

import { UsTogether } from '@/components/UsTogether';
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
  mockSearchParams.mockReturnValue({});
  mockSubscription.mockReturnValue({ isPremium: false, isLoading: false });
  mockPartnerName.mockReturnValue({ name: 'Jordan', isFallback: false });
});

describe('UsTogether queue meta partner name (via usePartnerName)', () => {
  function repairCompletion(overrides: Record<string, unknown> = {}) {
    return makeCompletion({
      id: 'c-meta',
      category: 'money',
      signal: 'repair' as const,
      responses: [
        { userId: 'user-1', responseText: 'a', responseScore: 2, imageUrl: null, submittedAt: null },
        { userId: 'user-2', responseText: 'b', responseScore: 3, imageUrl: null, submittedAt: null },
      ],
      ...overrides,
    });
  }

  it('shows the partner display name in the queue meta line', () => {
    mockPartnerName.mockReturnValue({ name: 'Casey', isFallback: false });
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByText } = render(<UsTogether />);

    expect(getByText('You 2 · Casey 3')).toBeTruthy();
  });

  it('falls back to the quiet lowercase "your partner" when no name is known', () => {
    mockPartnerName.mockReturnValue({ name: 'your partner', isFallback: true });
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByText } = render(<UsTogether />);

    expect(getByText('You 2 · your partner 3')).toBeTruthy();
  });

});

describe('UsTogether monthly stat labels pluralize', () => {
  it('1 answered reads singular; 0 tended stays plural', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    const { getByText } = render(<UsTogether />);

    expect(getByText('question answered together')).toBeTruthy();
    expect(getByText('conversations tended')).toBeTruthy();
  });

  it('2 answered reads plural; 1 tended reads singular', () => {
    mockHearthQuery.mockReturnValue({
      data: [
        makeCompletion(),
        makeCompletion({ id: 'c-2', category: 'money', discussedAt: new Date() }),
      ],
      isLoading: false,
    });
    const { getByText } = render(<UsTogether />);

    expect(getByText('questions answered together')).toBeTruthy();
    expect(getByText('conversation tended')).toBeTruthy();
  });
});

describe('UsTogether free-couple couch queue (current month free, history gated)', () => {
  function repairCompletion(overrides: Record<string, unknown> = {}) {
    return makeCompletion({
      id: 'c-repair',
      category: 'money',
      signal: 'repair' as const,
      responses: [
        { userId: 'user-1', responseText: 'a', responseScore: 2, imageUrl: null, submittedAt: null },
        { userId: 'user-2', responseText: 'b', responseScore: 3, imageUrl: null, submittedAt: null },
      ],
      ...overrides,
    });
  }
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

  it('free couples see the current-month couch queue — the advertised conversation is never locked', () => {
    // Default free subscription from beforeEach.
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByTestId, getByText } = render(<UsTogether />);

    expect(getByTestId('us-queue-c-repair')).toBeTruthy();
    // The month's own numbers sit below the queue.
    expect(getByTestId('us-stats')).toBeTruthy();
    // History/trends stay gated below.
    expect(getByTestId('hearth-gate')).toBeTruthy();
  });

  it('hides past-month queue entries from free couples and keeps the header count matching', () => {
    mockHearthQuery.mockReturnValue({
      data: [
        repairCompletion({ id: 'c-now' }),
        repairCompletion({ id: 'c-old', completedAt: lastMonth }),
      ],
      isLoading: false,
    });
    const { getByTestId, queryByTestId } = render(<UsTogether />);

    expect(getByTestId('us-queue-c-now')).toBeTruthy();
    expect(queryByTestId('us-queue-c-old')).toBeNull();
  });

  it('a free couple whose only waiting entry is last month gets no queue, and the gate', () => {
    mockHearthQuery.mockReturnValue({
      data: [repairCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByTestId, queryByTestId } = render(<UsTogether />);

    expect(queryByTestId('us-queue-c-repair')).toBeNull();
    expect(getByTestId('hearth-gate')).toBeTruthy();
  });

  it('premium couples keep the full queue, past months included, with no gate card', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [repairCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByTestId, queryByTestId } = render(<UsTogether />);

    expect(getByTestId('us-queue-c-repair')).toBeTruthy();
    expect(queryByTestId('hearth-gate')).toBeNull();
  });

  it('the talk flow works on a free couple queue entry (open the sheet, no paywall in the way)', () => {
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByTestId } = render(<UsTogether />);

    fireEvent.press(getByTestId('us-queue-c-repair'));

    expect(logEvent).toHaveBeenCalledWith('talk_sheet_opened', {
      completion_id: 'c-repair',
      signal: 'repair',
    });
  });
});

describe('UsTogether past-day reveal wiring', () => {
  it('the reveal sheet starts closed', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    render(<UsTogether />);

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
    const { getByTestId } = render(<UsTogether />);

    fireEvent.press(getByTestId('us-queue-c-1-read'));

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
    const { getByTestId } = render(<UsTogether />);

    fireEvent.press(getByTestId('us-queue-c-1'));

    expect(logEvent).toHaveBeenCalledWith('talk_sheet_opened', {
      completion_id: 'c-1',
      signal: 'repair',
    });
    expect(lastProps(mockRevealSheetProps).visible).toBe(false);
  });


  it('closing the sheet settles it back to closed', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion({ signal: 'repair' })],
      isLoading: false,
    });
    const { getByTestId } = render(<UsTogether />);

    fireEvent.press(getByTestId('us-queue-c-1-read'));
    expect(lastProps(mockRevealSheetProps).visible).toBe(true);

    act(() => {
      lastProps(mockRevealSheetProps).onClose();
    });
    const sheet = lastProps(mockRevealSheetProps);
    expect(sheet.visible).toBe(false);
    expect(sheet.completion).toBeNull();
  });
});
