jest.mock('@/components/Icon', () => ({ Icon: () => null }));

// Resolve t() against the real en.json so tests assert shipped copy
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string) => {
        const value = lookup(key);
        return typeof value === 'string' ? value : key;
      },
    }),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HearthQueueCard } from '../components/HearthQueueCard';
import type { HearthCompletion } from '../hooks/useHearth';

function makeCompletion(overrides: Partial<HearthCompletion> = {}): HearthCompletion {
  return {
    id: 'c1',
    category: 'money',
    promptText: 'How fair does the money feel right now?',
    isScale: true,
    responses: [],
    reactions: {},
    signal: 'repair',
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    completedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

function renderCard(props: Record<string, unknown> = {}) {
  const onPress = jest.fn();
  const utils = render(
    <HearthQueueCard
      completion={makeCompletion()}
      categoryLabel="Money"
      meta="You 3 · Sam 8"
      stateLabel="Talk about it"
      onPress={onPress}
      testID="hearth-queue-c1"
      {...props}
    />
  );
  return { ...utils, onPress };
}

describe('HearthQueueCard', () => {
  it('the card body still opens the talk sheet (primary action untouched)', () => {
    const { getByTestId, onPress } = renderCard();
    fireEvent.press(getByTestId('hearth-queue-c1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('the quiet "Read the answers" line opens the reveal, not the talk sheet', () => {
    const onReadAnswers = jest.fn();
    const { getByTestId, onPress } = renderCard({ onReadAnswers });
    fireEvent.press(getByTestId('hearth-queue-c1-read'));
    expect(onReadAnswers).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('carries the shipped copy and a button role for a11y', () => {
    const onReadAnswers = jest.fn();
    const { getByLabelText, getByText } = renderCard({ onReadAnswers });
    expect(getByText('Read the answers')).toBeTruthy();
    expect(getByLabelText('Read the answers').props.accessibilityRole).toBe('button');
  });

  it('renders no read affordance when the callback is not provided', () => {
    const { queryByTestId, queryByText } = renderCard();
    expect(queryByTestId('hearth-queue-c1-read')).toBeNull();
    expect(queryByText('Read the answers')).toBeNull();
  });
});
