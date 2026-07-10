jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
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
import { FollowUpLockedCard } from '../components/FollowUpLockedCard';
import { logEvent } from '@/services/analytics';

const PROMPT_TEXT = 'What would feeling met on this look like?';

describe('FollowUpLockedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the context line visible — the locked state tells the truth', () => {
    const { getByTestId, getByText } = render(
      <FollowUpLockedCard
        branch="divergence"
        promptText={PROMPT_TEXT}
        onSeePremium={jest.fn()}
      />
    );

    expect(getByTestId('follow-up-context')).toBeTruthy();
    expect(getByText(/saw this one differently/)).toBeTruthy();
  });

  it('renders the question (blurred, never hidden) with the quiet premium line', () => {
    const { getByText, queryByText } = render(
      <FollowUpLockedCard
        branch="deepener"
        promptText={PROMPT_TEXT}
        onSeePremium={jest.fn()}
      />
    );

    // The question is on screen (the follow-up EXISTS and we say so) but
    // hidden from accessibility so the visual blur cannot be bypassed.
    expect(queryByText(PROMPT_TEXT)).toBeNull();
    expect(getByText(PROMPT_TEXT, { includeHiddenElements: true })).toBeTruthy();
    expect(getByText('Follow-ups are part of Stoke Premium')).toBeTruthy();
  });

  it('opens the paywall from the quiet button', () => {
    const onSeePremium = jest.fn();
    const { getByTestId } = render(
      <FollowUpLockedCard
        branch="repair"
        promptText={PROMPT_TEXT}
        onSeePremium={onSeePremium}
      />
    );

    fireEvent.press(getByTestId('follow-up-locked-cta'));
    expect(onSeePremium).toHaveBeenCalledTimes(1);
  });

  it('logs gate_hit for the follow_up surface once on mount', () => {
    render(
      <FollowUpLockedCard
        branch="deepener"
        promptText={PROMPT_TEXT}
        onSeePremium={jest.fn()}
      />
    );

    expect(logEvent).toHaveBeenCalledWith('gate_hit', { surface: 'follow_up' });
    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('omits the context line when the branch is unknown', () => {
    const { queryByTestId, getByText } = render(
      <FollowUpLockedCard promptText={PROMPT_TEXT} onSeePremium={jest.fn()} />
    );

    expect(queryByTestId('follow-up-context')).toBeNull();
    expect(getByText('Follow-ups are part of Stoke Premium')).toBeTruthy();
  });
});
