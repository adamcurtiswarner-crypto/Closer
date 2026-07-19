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

  it('shows the alignment state for a divergent category (premium)', () => {
    const { getByText } = render(<UsScreen />);
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('You two see this differently')).toBeTruthy();
  });

  it('routes an alignment row into the Hearth category detail', () => {
    const { getByTestId } = render(<UsScreen />);
    fireEvent.press(getByTestId('us-alignment-money'));
    expect(logEvent).toHaveBeenCalledWith('us_view_category_opened', {
      category: 'money',
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/hearth',
      params: { category: 'money' },
    });
  });

  it('shows love languages side by side', () => {
    const { getByText } = render(<UsScreen />);
    expect(getByText('Quality Time')).toBeTruthy();
    expect(getByText('Words of Affirmation')).toBeTruthy();
  });

  it('locks the map for free couples: gate line, CTA, no row navigation', () => {
    mockUseSubscription.mockReturnValue({ isPremium: false, isLoading: false });
    const { getByText, getByTestId } = render(<UsScreen />);

    // Real category name stays visible (honest teaser)...
    expect(getByText('Money')).toBeTruthy();
    // ...the gate line and CTA are present...
    expect(getByText('The full picture is part of Stoke Premium')).toBeTruthy();
    expect(getByTestId('us-gate-cta')).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith('gate_hit', { surface: 'us_view' });

    // ...and tapping a row goes nowhere.
    fireEvent.press(getByTestId('us-alignment-money'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the quiet empty state before any scored answers exist', () => {
    mockUseHearth.mockReturnValue({ data: [] });
    const { getByText, queryByText } = render(<UsScreen />);
    expect(getByText('Your map starts with your answers')).toBeTruthy();
    expect(queryByText('The full picture is part of Stoke Premium')).toBeNull();
  });
});
