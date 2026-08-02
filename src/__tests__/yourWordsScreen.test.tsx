import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

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
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/Skeleton', () => ({ Skeleton: () => null }));

jest.mock('@/hooks/usePersonalize', () => ({
  usePersonalize: () => (text: string) => text.replace('{partner}', 'Sam'),
}));

const mockUseYourWords = jest.fn();
jest.mock('@/hooks/useYourWords', () => ({
  useYourWords: () => mockUseYourWords(),
}));

import YourWordsScreen from '../../app/(app)/your-words';
import type { YourWordsEntry } from '@/hooks/useYourWords';

function makeEntry(overrides: Partial<YourWordsEntry> = {}): YourWordsEntry {
  return {
    id: 'r1',
    assignmentId: 'a1',
    promptText: 'What made you feel close to {partner} this week?',
    category: 'intimacy',
    responseText: 'The quiet Tuesday dinner.',
    responseScore: null,
    submittedAt: new Date(2026, 6, 30),
    ...overrides,
  };
}

describe('YourWordsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the journal with personalized prompt text', () => {
    mockUseYourWords.mockReturnValue({
      data: [makeEntry()],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { getByText } = render(<YourWordsScreen />);
    expect(getByText('Your words')).toBeTruthy();
    expect(getByText('What made you feel close to Sam this week?')).toBeTruthy();
    expect(getByText('The quiet Tuesday dinner.')).toBeTruthy();
  });

  it('shows a scale answer as "You said N"', () => {
    mockUseYourWords.mockReturnValue({
      data: [makeEntry({ responseScore: 7, responseText: '' })],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { getByText, queryByText } = render(<YourWordsScreen />);
    expect(getByText('You said 7')).toBeTruthy();
    expect(queryByText('The quiet Tuesday dinner.')).toBeNull();
  });

  it('never mentions the partner state — no waiting or unanswered labels', () => {
    mockUseYourWords.mockReturnValue({
      data: [makeEntry()],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { queryByText } = render(<YourWordsScreen />);
    // The anti-resentment-ledger constraint: an unreciprocated answer looks
    // exactly like any other entry.
    expect(queryByText(/waiting/i)).toBeNull();
    expect(queryByText(/hasn't answered/i)).toBeNull();
    expect(queryByText(/never answered/i)).toBeNull();
  });

  it('shows the quiet empty state', () => {
    mockUseYourWords.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { getByTestId, getByText } = render(<YourWordsScreen />);
    expect(getByTestId('your-words-empty')).toBeTruthy();
    expect(getByText('Your words will gather here')).toBeTruthy();
  });

  it('shows skeletons while loading', () => {
    mockUseYourWords.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    expect(render(<YourWordsScreen />).getByTestId('your-words-loading')).toBeTruthy();
  });

  it('shows a retry on error', () => {
    mockUseYourWords.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    const { getByTestId, getByText } = render(<YourWordsScreen />);
    expect(getByTestId('your-words-error')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });
});
