/**
 * Tests for the "what this came from" block on a follow-up prompt.
 *
 * Why it exists: a follow-up card asserts something about a conversation
 * you already had — "You two saw this one differently" — and named none of
 * it. Divergence and repair are delivered the day AFTER the question that
 * triggered them, so the context is a day gone by the time the card is
 * read. The join was always possible: every follow-up assignment carries
 * follow_up.parent_assignment_id.
 *
 * The contract: it opens by default only on divergence (where the gap IS
 * the question), it never blocks answering, and it renders NOTHING rather
 * than an empty drawer when the join fails or returns no answers.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseFollowUpSource = jest.fn();
jest.mock('@/hooks/usePrompt', () => ({
  useFollowUpSource: (id: string | null) => mockUseFollowUpSource(id),
}));

jest.mock('@/hooks/usePersonalize', () => ({
  usePersonalize: () => (text: string) => text.replace('{partner}', 'Masha'),
}));

jest.mock('@/components/Icon', () => ({ Icon: () => null }));

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

import { FollowUpSource } from '@/components/FollowUpSource';

const response = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  responseText: 'It felt like a good week.',
  imageUrl: null,
  submittedAt: null,
  status: 'submitted',
  responseScore: 9,
  emotionalResponse: null,
  ...overrides,
});

function setSource(data: unknown, isLoading = false) {
  mockUseFollowUpSource.mockReturnValue({ data, isLoading });
}

const FULL = {
  promptText: 'How connected did you feel to {partner} this week?',
  assignedDate: '2026-11-13',
  myResponse: response({ responseScore: 9, responseText: 'Really close.' }),
  partnerResponse: response({ id: 'r2', responseScore: 3, responseText: 'Felt distant.' }),
};

describe('FollowUpSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 14, 8, 35));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing without a parent assignment', () => {
    setSource(null);
    const { toJSON } = render(
      <FollowUpSource parentAssignmentId={null} partnerName="Masha" />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when the join fails or is denied', () => {
    // useFollowUpSource reports the denial and resolves to null; the card
    // keeps its plain context line and stays answerable.
    setSource(null);
    const { toJSON } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when neither partner has an answer to show', () => {
    setSource({ ...FULL, myResponse: null, partnerResponse: null });
    const { toJSON } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );
    expect(toJSON()).toBeNull();
  });

  it('stays collapsed by default, naming when the question was asked', () => {
    setSource(FULL);
    const { getByText, queryByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );

    expect(getByText("From yesterday's question")).toBeTruthy();
    expect(queryByTestId('follow-up-source-panel')).toBeNull();
  });

  it('opens by default on divergence, where the gap is the question', () => {
    setSource(FULL);
    const { getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" defaultOpen />
    );

    expect(getByTestId('follow-up-source-panel')).toBeTruthy();
  });

  it('shows the originating question and both answers when opened', () => {
    setSource(FULL);
    const { getByText, getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );

    fireEvent.press(getByTestId('follow-up-source-toggle'));

    // Personalized, like every other surface that renders prompt text.
    expect(getByText('How connected did you feel to Masha this week?')).toBeTruthy();
    expect(getByText('Really close.')).toBeTruthy();
    expect(getByText('Felt distant.')).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
    expect(getByText('Masha')).toBeTruthy();
  });

  it('states the gap that triggered the follow-up', () => {
    setSource(FULL);
    const { getByText, getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );

    fireEvent.press(getByTestId('follow-up-source-toggle'));

    expect(getByText('You were 6 apart')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('omits the gap line when the two agreed, or when a score is missing', () => {
    setSource({
      ...FULL,
      myResponse: response({ responseScore: 8 }),
      partnerResponse: response({ id: 'r2', responseScore: 8 }),
    });
    const { queryByText, getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );
    fireEvent.press(getByTestId('follow-up-source-toggle'));
    expect(queryByText('You were 0 apart')).toBeNull();

    jest.clearAllMocks();
    setSource({
      ...FULL,
      myResponse: response({ responseScore: null }),
    });
    const second = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );
    fireEvent.press(second.getByTestId('follow-up-source-toggle'));
    expect(second.queryByText(/apart/)).toBeNull();
  });

  it('collapses again on a second tap', () => {
    setSource(FULL);
    const { getByTestId, queryByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );

    fireEvent.press(getByTestId('follow-up-source-toggle'));
    expect(queryByTestId('follow-up-source-panel')).toBeTruthy();

    fireEvent.press(getByTestId('follow-up-source-toggle'));
    expect(queryByTestId('follow-up-source-panel')).toBeNull();
  });

  it('shows a quiet skeleton while the join is in flight', () => {
    setSource(undefined, true);
    const { getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );
    expect(getByTestId('follow-up-source-loading')).toBeTruthy();
  });

  it('still renders the question when only one answer survives', () => {
    setSource({ ...FULL, partnerResponse: null });
    const { getByText, getByTestId } = render(
      <FollowUpSource parentAssignmentId="assign-parent" partnerName="Masha" />
    );

    fireEvent.press(getByTestId('follow-up-source-toggle'));
    expect(getByText('Really close.')).toBeTruthy();
  });
});
