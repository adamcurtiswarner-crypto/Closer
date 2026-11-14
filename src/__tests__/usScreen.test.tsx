import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// ─── Mocks ───

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  Redirect: () => null,
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('@/config/firebase', () => ({ db: {}, functions: {} }));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/Paywall', () => ({ Paywall: () => null }));
jest.mock('@/components/HearthSparkline', () => ({ HearthSparkline: () => null }));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'me',
      coupleId: 'couple-1',
      displayName: 'Adam',
      photoUrl: null,
      partnerPhotoUrl: null,
      loveLanguage: 'quality_time',
    },
  }),
}));

jest.mock('@/hooks/useCouple', () => ({
  useCouple: () => ({
    data: {
      id: 'couple-1',
      memberIds: ['me', 'partner'],
      anniversaryDate: new Date('2020-07-20T12:00:00Z'),
    },
  }),
}));

jest.mock('@/hooks/usePartnerName', () => ({
  usePartnerName: () => ({ name: 'Masha', isFallback: false }),
}));

jest.mock('@/hooks/usePartnerLoveLanguage', () => ({
  usePartnerLoveLanguage: () => ({ data: 'words_of_affirmation' }),
}));

const mockUseSubscription = jest.fn();
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

const mockUseHearth = jest.fn();
jest.mock('@/hooks/useHearth', () => {
  const actual = jest.requireActual('@/hooks/useHearth');
  return {
    ...actual,
    useHearth: () => mockUseHearth(),
  };
});

// Resolve t() against the real en.json so tests assert shipped copy.
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

import UsScreen from '../../app/(app)/us';
import { logEvent } from '@/services/analytics';

// ─── Fixtures ───

function scoredCompletion(
  id: string,
  category: string,
  daysAgo: number,
  scoreA: number,
  scoreB: number
) {
  return {
    id,
    category,
    promptText: 'How connected did you feel?',
    isScale: true,
    responses: [
      { userId: 'me', responseText: '', responseScore: scoreA, imageUrl: null, submittedAt: null },
      { userId: 'partner', responseText: '', responseScore: scoreB, imageUrl: null, submittedAt: null },
    ],
    reactions: {},
    signal: null,
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    clarify: [],
    completedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

const APART_MONEY = [
  scoredCompletion('m1', 'money', 1, 2, 9),
  scoredCompletion('m2', 'money', 2, 3, 8),
  scoredCompletion('m3', 'money', 3, 2, 8),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSubscription.mockReturnValue({ isPremium: true, isLoading: false });
  mockUseHearth.mockReturnValue({ data: APART_MONEY });
});

// ─── Tests ───

describe('UsScreen', () => {
  it('renders the couple header with names and days together', () => {
    const { getByText } = render(<UsScreen />);
    expect(getByText('You & Masha')).toBeTruthy();
    expect(getByText(/days together/)).toBeTruthy();
  });

  /**
   * Replaced 2026-11-14. The old assertion was `getByText('Money')`, which
   * passed whether the category rendered as a graded tile, a map row, or a
   * "not enough answers yet" line — so it never actually tested the grid it
   * was named for.
   */
  it('leads with the widest gap as a conversation, not a grade', () => {
    const { getByTestId, getByText, queryByText } = render(<UsScreen />);

    // money is 2v9, 3v8, 2v8 — far and away the widest gap here.
    expect(getByTestId('us-lead-money')).toBeTruthy();
    expect(getByText(/see money differently/i)).toBeTruthy();

    // None of the report-card vocabulary the tile grid invented.
    expect(queryByText('GOOD')).toBeNull();
    expect(queryByText('GROWING')).toBeNull();
    expect(queryByText('STRONG')).toBeNull();
  });

  it('puts every measurable category on the shared map', () => {
    const { getByTestId } = render(<UsScreen />);

    expect(getByTestId('us-map')).toBeTruthy();
    expect(getByTestId('us-row-money')).toBeTruthy();
  });

  it('says a thin category is still forming instead of scoring it', () => {
    // One answer is not a measurement, and the old grid would still have
    // printed an average to one decimal and graded it.
    mockUseHearth.mockReturnValue({
      data: [...APART_MONEY, scoredCompletion('f1', 'family', 1, 7, 8)],
    });
    const { getByTestId, queryByTestId } = render(<UsScreen />);

    expect(getByTestId('us-forming-family')).toBeTruthy();
    expect(queryByTestId('us-row-family')).toBeNull();
  });

  it('shows love languages side by side', () => {
    const { getByText } = render(<UsScreen />);
    expect(getByText('Quality Time')).toBeTruthy();
    expect(getByText('Words of Affirmation')).toBeTruthy();
  });

  it('locks the grid for free couples with gate CTA', () => {
    mockUseSubscription.mockReturnValue({ isPremium: false, isLoading: false });
    const { getByText, getByTestId } = render(<UsScreen />);
    expect(getByText('Your dimensions are building')).toBeTruthy();
    expect(getByTestId('us-gate-cta')).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith('gate_hit', { surface: 'us_view' });
  });

  it('shows the quiet empty state before any scored answers exist', () => {
    mockUseHearth.mockReturnValue({ data: [] });
    const { getByText, queryByText } = render(<UsScreen />);
    expect(getByText('A few more days together')).toBeTruthy();
    expect(queryByText('The full picture is part of Stoke Premium')).toBeNull();
  });
});
