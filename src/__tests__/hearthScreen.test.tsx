/**
 * Tests for the /(app)/hearth route, which is now ONE dimension in full —
 * its trend and the answers behind it — and nothing else.
 *
 * It used to be the Hearth home: a second grid of the same twelve
 * categories with its own vocabulary (Glowing / Compare notes / warming)
 * competing with the Us map's (Steady / Closing / Opening), on a screen with
 * no tab that a user could land on by pressing Back out of a dimension.
 * The November restructure called Hearth "merged into Us" and left that
 * screen standing; 2026-11-14 finished the job.
 *
 * The grid, header-metrics and tile-tally tests are gone with the UI they
 * described. The queue, stats and gate tests moved to usTogether.test.tsx.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// ─── Mocks ───

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSearchParams = jest.fn(() => ({}) as Record<string, string>);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, setParams: jest.fn() }),
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
  mockSearchParams.mockReturnValue({});
  mockSubscription.mockReturnValue({ isPremium: false, isLoading: false });
  mockPartnerName.mockReturnValue({ name: 'Jordan', isFallback: false });
});

describe('the dimension route', () => {
  it('renders the detail for the category it was opened with', () => {
    mockSearchParams.mockReturnValue({ category: 'communication' });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    const detail = lastProps(mockCategoryDetailProps);
    expect(detail.category.type).toBe('communication');
    expect(detail.entries.length).toBeGreaterThan(0);
  });

  it('passes the resolved partner name into the detail', () => {
    mockSearchParams.mockReturnValue({ category: 'communication' });
    mockPartnerName.mockReturnValue({ name: 'Casey', isFallback: false });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    expect(lastProps(mockCategoryDetailProps).partnerName).toBe('Casey');
  });

  it('routes a detail entry through the reveal sheet', () => {
    mockSearchParams.mockReturnValue({ category: 'communication' });
    const completion = makeCompletion();
    mockHearthQuery.mockReturnValue({ data: [completion], isLoading: false });

    render(<HearthScreen />);
    const detail = lastProps(mockCategoryDetailProps);

    act(() => {
      detail.onOpenReveal(detail.entries[0]);
    });

    expect(logEvent).toHaveBeenCalledWith('hearth_reveal_opened', {
      assignment_id: completion.id,
    });
    expect(lastProps(mockRevealSheetProps).visible).toBe(true);
  });

  /**
   * Not router.back(). This route is a hidden TAB, so "back" from it
   * returns to the FIRST screen declared in the navigator — home, which is
   * flagged off for v1. On 2026-11-14 that is exactly what happened: a
   * founder backed out of a dimension and landed on a screen that does not
   * exist in v1, showing "16 best streak" on a product whose doctrine bans
   * streak language outright. Navigating explicitly is deterministic from
   * every entry point.
   */
  it('backing out goes to Us explicitly, never wherever the tab stack lands', () => {
    mockSearchParams.mockReturnValue({ category: 'communication' });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    act(() => {
      lastProps(mockCategoryDetailProps).onBack();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(app)/us');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('redirects to Us when opened without a category', () => {
    // Nothing lives at this route without one any more, so it must not
    // render an empty screen and strand the user.
    mockSearchParams.mockReturnValue({});
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/(app)/us');
  });

  it('redirects when the category is not one we recognise', () => {
    mockSearchParams.mockReturnValue({ category: 'not_a_category' });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    expect(mockReplace).toHaveBeenCalled();
  });

  it('gives a free couple current-month entries and no trend series', () => {
    mockSearchParams.mockReturnValue({ category: 'communication' });
    mockSubscription.mockReturnValue({ isPremium: false, isLoading: false });
    mockHearthQuery.mockReturnValue({ data: [makeCompletion()], isLoading: false });

    render(<HearthScreen />);

    // The talk ritual on those entries stays open; only the trend is gated.
    expect(lastProps(mockCategoryDetailProps).series).toEqual([]);
    expect(lastProps(mockCategoryDetailProps).entries.length).toBeGreaterThan(0);
  });
});
