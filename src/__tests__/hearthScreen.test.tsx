import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
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
  mockPartnerName.mockReturnValue({ name: 'Jordan', isFallback: false });
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

describe('HearthScreen header metrics strip', () => {
  function repairCompletion(overrides: Record<string, unknown> = {}) {
    return makeCompletion({
      id: 'c-2',
      category: 'money',
      signal: 'repair' as const,
      responses: [
        { userId: 'user-1', responseText: 'a', responseScore: 2, imageUrl: null, submittedAt: null },
        { userId: 'user-2', responseText: 'b', responseScore: 3, imageUrl: null, submittedAt: null },
      ],
      ...overrides,
    });
  }

  it('composes answered and glowing from live data, omitting zero segments', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    const { getByText } = render(<HearthScreen />);

    // 1 answered, communication glowing (8/9 average), nothing waiting —
    // the waiting segment is omitted, not rendered as zero.
    expect(getByText('1 answered this month · 1 glowing')).toBeTruthy();
  });

  it('adds the waiting segment when the couch queue has entries', () => {
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion(), repairCompletion()],
      isLoading: false,
    });
    const { getByText } = render(<HearthScreen />);

    expect(
      getByText('2 answered this month · 1 glowing · 1 waiting for you two')
    ).toBeTruthy();
  });

  it('omits the glowing segment when no category glows', () => {
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByText } = render(<HearthScreen />);

    expect(getByText('1 answered this month · 1 waiting for you two')).toBeTruthy();
  });

  it('falls back to the waiting copy when nothing was answered this month', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    mockHearthQuery.mockReturnValue({
      data: [repairCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByText } = render(<HearthScreen />);

    expect(getByText('1 conversation waiting for you two')).toBeTruthy();
  });

  it('falls back to the steady copy when nothing answered and nothing waiting', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    mockHearthQuery.mockReturnValue({
      data: [makeCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByText } = render(<HearthScreen />);

    expect(getByText('Nothing waiting — your fire is steady')).toBeTruthy();
  });
});

describe('HearthScreen tile states and tallies', () => {
  it('the answered category shows Glowing with its tally; the rest sit unlit with the invite line', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    const { getByText, queryAllByText } = render(<HearthScreen />);

    expect(getByText('Glowing')).toBeTruthy();
    expect(getByText('1 answered')).toBeTruthy();
    expect(queryAllByText('Not yet lit')).toHaveLength(11);
    expect(queryAllByText('Ask one tonight')).toHaveLength(11);
  });

  it('a couch-flagged steady entry says Talk about it on BOTH the tile and the queue card', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [
        makeCompletion({
          signal: 'steady' as const,
          couchFlagged: true,
          couchFlaggedBy: 'user-2',
          responses: [
            { userId: 'user-1', responseText: 'a', responseScore: 6, imageUrl: null, submittedAt: null },
            { userId: 'user-2', responseText: 'b', responseScore: 6, imageUrl: null, submittedAt: null },
          ],
        }),
      ],
      isLoading: false,
    });
    const { getByTestId, queryAllByText } = render(<HearthScreen />);

    // The founder-caught contradiction: tile and queue can never disagree.
    expect(getByTestId('hearth-queue-c-1')).toBeTruthy();
    expect(queryAllByText('Talk about it')).toHaveLength(2);
  });
});

describe('HearthScreen queue meta partner name (via usePartnerName)', () => {
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
    const { getByText } = render(<HearthScreen />);

    expect(getByText('You 2 · Casey 3')).toBeTruthy();
  });

  it('falls back to the quiet lowercase "your partner" when no name is known', () => {
    mockPartnerName.mockReturnValue({ name: 'your partner', isFallback: true });
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByText } = render(<HearthScreen />);

    expect(getByText('You 2 · your partner 3')).toBeTruthy();
  });

  it('passes the resolved name into the category detail meta too', () => {
    mockPartnerName.mockReturnValue({ name: 'Casey', isFallback: false });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    const { getByTestId } = render(<HearthScreen />);

    fireEvent.press(getByTestId('hearth-tile-communication'));
    expect(lastProps(mockCategoryDetailProps).partnerName).toBe('Casey');
  });
});

describe('HearthScreen monthly stat labels pluralize', () => {
  it('1 answered reads singular; 0 tended stays plural', () => {
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });
    const { getByText } = render(<HearthScreen />);

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
    const { getByText } = render(<HearthScreen />);

    expect(getByText('questions answered together')).toBeTruthy();
    expect(getByText('conversation tended')).toBeTruthy();
  });
});

describe('HearthScreen free-couple couch queue (current month free, history gated)', () => {
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
    const { getByTestId, getByText } = render(<HearthScreen />);

    // Header advertises it AND the queue delivers it, on the same screen.
    expect(getByText('1 answered this month · 1 waiting for you two')).toBeTruthy();
    expect(getByTestId('hearth-queue-c-repair')).toBeTruthy();
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
    const { getByTestId, queryByTestId, getByText } = render(<HearthScreen />);

    expect(getByTestId('hearth-queue-c-now')).toBeTruthy();
    expect(queryByTestId('hearth-queue-c-old')).toBeNull();
    // The metrics strip counts only what the queue below actually shows.
    expect(getByText('1 answered this month · 1 waiting for you two')).toBeTruthy();
  });

  it('a free couple whose only waiting entry is last month sees the steady header, no queue, and the gate', () => {
    mockHearthQuery.mockReturnValue({
      data: [repairCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByTestId, queryByTestId, getByText } = render(<HearthScreen />);

    expect(getByText('Nothing waiting — your fire is steady')).toBeTruthy();
    expect(queryByTestId('hearth-queue-c-repair')).toBeNull();
    expect(getByTestId('hearth-gate')).toBeTruthy();
  });

  it('premium couples keep the full queue, past months included, with no gate card', () => {
    mockSubscription.mockReturnValue({ isPremium: true, isLoading: false });
    mockHearthQuery.mockReturnValue({
      data: [repairCompletion({ completedAt: lastMonth })],
      isLoading: false,
    });
    const { getByTestId, queryByTestId } = render(<HearthScreen />);

    expect(getByTestId('hearth-queue-c-repair')).toBeTruthy();
    expect(queryByTestId('hearth-gate')).toBeNull();
  });

  it('the talk flow works on a free couple queue entry (open the sheet, no paywall in the way)', () => {
    mockHearthQuery.mockReturnValue({ data: [repairCompletion()], isLoading: false });
    const { getByTestId } = render(<HearthScreen />);

    fireEvent.press(getByTestId('hearth-queue-c-repair'));

    expect(logEvent).toHaveBeenCalledWith('talk_sheet_opened', {
      completion_id: 'c-repair',
      signal: 'repair',
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
