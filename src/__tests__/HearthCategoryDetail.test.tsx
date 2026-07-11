// useHearth pulls firebase through its listener plumbing — the detail view
// only uses its pure selectors, so the SDK is stubbed out.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('../components/HearthSparkline', () => ({
  HearthSparkline: () => null,
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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HearthCategoryDetail } from '../components/HearthCategoryDetail';
import { getCategoryByType } from '@/config/promptCategories';
import type { HearthCompletion } from '../hooks/useHearth';

const CATEGORY = getCategoryByType('money')!;

function makeCompletion(overrides: Partial<HearthCompletion> = {}): HearthCompletion {
  return {
    id: 'c1',
    category: 'money',
    promptText: 'How fair does the money feel right now?',
    isScale: true,
    responses: [
      {
        userId: 'me',
        responseText: 'Mine',
        responseScore: 3,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
      {
        userId: 'partner',
        responseText: 'Theirs',
        responseScore: 8,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
    ],
    reactions: {},
    signal: 'divergence',
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    completedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

function renderDetail(
  entries: HearthCompletion[],
  props: Record<string, unknown> = {}
) {
  const onBack = jest.fn();
  const onOpenTalkSheet = jest.fn();
  const onOpenReveal = jest.fn();
  const utils = render(
    <HearthCategoryDetail
      category={CATEGORY}
      entries={entries}
      series={[]}
      myUid="me"
      partnerName="Sam"
      onBack={onBack}
      onOpenTalkSheet={onOpenTalkSheet}
      onOpenReveal={onOpenReveal}
      {...props}
    />
  );
  return { ...utils, onBack, onOpenTalkSheet, onOpenReveal };
}

describe('HearthCategoryDetail', () => {
  it('tapping an entry opens that day’s reveal', () => {
    const completion = makeCompletion();
    const { getByTestId, onOpenReveal } = renderDetail([completion]);
    fireEvent.press(getByTestId('hearth-entry-c1'));
    expect(onOpenReveal).toHaveBeenCalledWith(completion);
  });

  it('entries carry the "Read this day" accessibility label and button role', () => {
    const { getByLabelText } = renderDetail([makeCompletion()]);
    expect(getByLabelText('Read this day').props.accessibilityRole).toBe('button');
  });

  it('shows the compact score meta on scored entries', () => {
    const { getByText } = renderDetail([makeCompletion()]);
    expect(getByText('You 3 · Sam 8')).toBeTruthy();
  });

  it('the couch pill on an un-tended entry opens the talk sheet, not the reveal', () => {
    const completion = makeCompletion();
    const { getByTestId, onOpenTalkSheet, onOpenReveal } = renderDetail([completion]);
    fireEvent.press(getByTestId('hearth-entry-couch-c1'));
    expect(onOpenTalkSheet).toHaveBeenCalledWith(completion);
    expect(onOpenReveal).not.toHaveBeenCalled();
  });

  it('tended entries drop the couch pill but stay readable', () => {
    const completion = makeCompletion({ discussedAt: new Date('2026-07-02') });
    const { getByTestId, queryByTestId, onOpenReveal } = renderDetail([completion]);
    expect(queryByTestId('hearth-entry-couch-c1')).toBeNull();
    fireEvent.press(getByTestId('hearth-entry-c1'));
    expect(onOpenReveal).toHaveBeenCalledWith(completion);
  });

  it('steady text entries are readable too (no scores, no pill)', () => {
    const completion = makeCompletion({
      id: 't1',
      isScale: false,
      signal: null,
      responses: [
        {
          userId: 'me',
          responseText: 'just words',
          responseScore: null,
          imageUrl: null,
          submittedAt: null,
        },
      ],
    });
    const { getByTestId, queryByText, onOpenReveal } = renderDetail([completion]);
    expect(queryByText(/You \d/)).toBeNull();
    fireEvent.press(getByTestId('hearth-entry-t1'));
    expect(onOpenReveal).toHaveBeenCalledWith(completion);
  });

  it('renders the empty state when the category has no entries', () => {
    const { getByText } = renderDetail([]);
    expect(getByText('Your first answered question will glow here.')).toBeTruthy();
  });

  it('back button calls onBack', () => {
    const { getByTestId, onBack } = renderDetail([makeCompletion()]);
    fireEvent.press(getByTestId('hearth-category-back'));
    expect(onBack).toHaveBeenCalled();
  });
});
