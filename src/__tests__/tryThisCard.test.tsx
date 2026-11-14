/**
 * Tests for the Try This card and pickDailyAction — both shipped to
 * production on 2026-11-07 with zero tests.
 *
 * The four defects pinned here:
 *  1. the feedback doc was keyed on the UTC date, so an evening tap in the
 *     US wrote tomorrow's document (CLAUDE.md forbids toISOString for a
 *     user-facing day);
 *  2. a denied write hit an empty catch, so it was indistinguishable from a
 *     successful one — the write-only-sink shape that hid three outages;
 *  3. the copy promised "More like this coming" although nothing reads
 *     action_feedback and the pick is a deterministic day-of-year index;
 *  4. an unexpected love_language value emptied the action pool, making
 *     `% 0` NaN and the card throw inside a render path.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { pickDailyAction, TOTAL_ACTIONS } from '@/utils/dailyActions';

const mockSetDoc = jest.fn();
const mockDoc = jest.fn((...args: unknown[]) => ({ __path: args.slice(1).join('/') }));
jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => ({ __op: 'serverTimestamp' }),
}));
jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));

const mockReportQueryDenied = jest.fn();
jest.mock('@/utils/logger', () => ({
  logger: {
    reportQueryDenied: (...args: unknown[]) => mockReportQueryDenied(...args),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const mockLogEvent = jest.fn();
jest.mock('@/services/analytics', () => ({ logEvent: (...a: unknown[]) => mockLogEvent(...a) }));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', coupleId: 'couple-1' } }),
}));
jest.mock('@/hooks/usePersonalize', () => ({
  usePersonalize: () => (text: string) => text,
}));

import { TryThisCard } from '@/components/TryThisCard';

describe('pickDailyAction', () => {
  it('is deterministic for the same day and language', () => {
    const a = pickDailyAction('words_of_affirmation', 42);
    const b = pickDailyAction('words_of_affirmation', 42);
    expect(a.id).toBe(b.id);
  });

  it('returns an action for every one of the five love languages', () => {
    for (const lang of [
      'words_of_affirmation',
      'quality_time',
      'physical_touch',
      'acts_of_service',
      'receiving_gifts',
    ]) {
      const action = pickDailyAction(lang, 7);
      expect(action).toBeDefined();
      expect(action.language).toBe(lang);
      expect(typeof action.text).toBe('string');
    }
  });

  it('falls back to the full pool when the love language is unrecognised', () => {
    // love_language is a free string in Firestore; an unexpected value used
    // to empty the pool and make the index NaN.
    const action = pickDailyAction('not_a_real_language', 11);

    expect(action).toBeDefined();
    expect(typeof action.text).toBe('string');
    expect(TOTAL_ACTIONS).toBeGreaterThan(0);
  });

  it('never returns undefined across a full year for any input', () => {
    for (const lang of [null, '', 'quality_time', 'bogus']) {
      for (let day = 0; day <= 366; day++) {
        const action = pickDailyAction(lang, day);
        expect(action?.text).toBeTruthy();
      }
    }
  });
});

describe('TryThisCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('renders an action even when the partner love language is unrecognised', () => {
    // Would previously throw on action.text and take the whole app down
    // through the root ErrorBoundary.
    expect(() => render(<TryThisCard partnerLoveLanguage="bogus_value" />)).not.toThrow();
  });

  it('keys the feedback document on the device-local day, not UTC', async () => {
    // 2026-11-14 at 21:30 US/Eastern is already 2026-11-15 in UTC.
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 14, 21, 30, 0));

    const { getByLabelText } = render(<TryThisCard partnerLoveLanguage="quality_time" />);
    await act(async () => {
      fireEvent.press(getByLabelText('It landed'));
    });

    expect(mockDoc).toHaveBeenCalled();
    const path = mockDoc.mock.calls[0].slice(1).join('/');
    expect(path).toBe('couples/couple-1/action_feedback/2026-11-14_user-1');
    expect(path).not.toContain('2026-11-15');

    jest.useRealTimers();
  });

  it('reports a denied write instead of swallowing it', async () => {
    mockSetDoc.mockRejectedValue(new Error('permission-denied'));

    const { getByLabelText } = render(<TryThisCard partnerLoveLanguage="quality_time" />);
    await act(async () => {
      fireEvent.press(getByLabelText('It landed'));
    });

    expect(mockReportQueryDenied).toHaveBeenCalledWith(
      'TryThisCard.feedback',
      expect.any(Error)
    );
  });

  it('acknowledges the tap without promising a learning loop that does not exist', async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <TryThisCard partnerLoveLanguage="quality_time" />
    );
    await act(async () => {
      fireEvent.press(getByLabelText('It landed'));
    });

    expect(getByText('Noted.')).toBeTruthy();
    expect(queryByText('Noted. More like this coming.')).toBeNull();
  });

  it('logs the feedback event with a typed event name', async () => {
    const { getByLabelText } = render(<TryThisCard partnerLoveLanguage="quality_time" />);
    await act(async () => {
      fireEvent.press(getByLabelText('Not this time'));
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'daily_action_feedback',
      expect.objectContaining({ result: 'missed' })
    );
  });
});
