// Prop-capturing mock: the ceremony itself is covered by
// CompletionMoment.test.tsx — here we verify the sheet feeds it correctly
// from the completion's embedded data (no fetch).
const mockCompletionMoment = jest.fn();
jest.mock('../components/CompletionMoment', () => ({
  CompletionMoment: (props: Record<string, unknown>) => {
    mockCompletionMoment(props);
    return null;
  },
}));

const mockMutate = jest.fn();
jest.mock('@/hooks/useReaction', () => ({
  useReaction: () => ({ mutate: mockMutate, isPending: false }),
}));

const mockCompletionReactions = jest.fn();
jest.mock('@/hooks/useExplorePrompts', () => ({
  useCompletionReactions: (assignmentId: string | null) =>
    mockCompletionReactions(assignmentId),
}));

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
import { HearthRevealSheet } from '../components/HearthRevealSheet';
import type { HearthCompletion } from '../hooks/useHearth';

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
        imageUrl: 'https://img',
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

function renderSheet(
  completion: HearthCompletion | null,
  props: Record<string, unknown> = {}
) {
  const onClose = jest.fn();
  const utils = render(
    <HearthRevealSheet
      visible
      completion={completion}
      myUid="me"
      partnerName="Sam"
      onClose={onClose}
      {...props}
    />
  );
  return { ...utils, onClose };
}

function lastMomentProps(): Record<string, any> {
  const calls = mockCompletionMoment.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCompletionReactions.mockReturnValue({ data: undefined });
});

describe('HearthRevealSheet', () => {
  it('feeds CompletionMoment both answers, mine first, from the embedded data', () => {
    renderSheet(makeCompletion());
    const props = lastMomentProps();
    expect(props.assignmentId).toBe('c1');
    expect(props.promptText).toBe('How fair does the money feel right now?');
    expect(props.yourResponse).toBe('Mine');
    expect(props.partnerResponse).toBe('Theirs');
    expect(props.yourImageUrl).toBeNull();
    expect(props.partnerImageUrl).toBe('https://img');
    expect(props.yourScore).toBe(3);
    expect(props.partnerScore).toBe(8);
    expect(props.partnerName).toBe('Sam');
  });

  it('the mine/partner split follows the signed-in uid, not response order', () => {
    renderSheet(makeCompletion(), { myUid: 'partner' });
    const props = lastMomentProps();
    expect(props.yourResponse).toBe('Theirs');
    expect(props.partnerResponse).toBe('Mine');
    expect(props.yourScore).toBe(8);
    expect(props.partnerScore).toBe(3);
  });

  it('text prompts pass no scores', () => {
    renderSheet(makeCompletion({ isScale: false }));
    const props = lastMomentProps();
    expect(props.yourScore).toBeNull();
    expect(props.partnerScore).toBeNull();
    expect(props.showMidScaleLine).toBe(false);
  });

  it('shows the mid-scale line (and with it the couch state) on middle outcomes only', () => {
    renderSheet(
      makeCompletion({
        responses: [
          { userId: 'me', responseText: '', responseScore: 6, imageUrl: null, submittedAt: null },
          { userId: 'partner', responseText: '', responseScore: 7, imageUrl: null, submittedAt: null },
        ],
        signal: null,
      })
    );
    expect(lastMomentProps().showMidScaleLine).toBe(true);
  });

  it('divergent scores are not a middle outcome', () => {
    renderSheet(makeCompletion());
    expect(lastMomentProps().showMidScaleLine).toBe(false);
  });

  it('seeds reactions from the embedded map while the fetch settles', () => {
    renderSheet(makeCompletion({ reactions: { me: 'heart', partner: 'fire' } }));
    const props = lastMomentProps();
    expect(props.myReaction).toBe('heart');
    expect(props.partnerReaction).toBe('fire');
  });

  it('fetched reactions win over the embedded snapshot', () => {
    mockCompletionReactions.mockReturnValue({ data: { me: 'teary' } });
    renderSheet(makeCompletion({ reactions: { me: 'heart', partner: 'fire' } }));
    const props = lastMomentProps();
    expect(props.myReaction).toBe('teary');
    expect(props.partnerReaction).toBeNull();
  });

  it('reacting writes through useReaction with the assignment id', () => {
    renderSheet(makeCompletion());
    lastMomentProps().onReact('heart');
    expect(mockMutate).toHaveBeenCalledWith({
      assignmentId: 'c1',
      reaction: 'heart',
      promptType: 'money',
    });
  });

  it('Done closes the sheet', () => {
    const { getByTestId, onClose } = renderSheet(makeCompletion());
    fireEvent.press(getByTestId('hearth-reveal-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing without a completion', () => {
    const { queryByTestId } = renderSheet(null);
    expect(queryByTestId('hearth-reveal-close')).toBeNull();
    expect(mockCompletionMoment).not.toHaveBeenCalled();
  });

  it('only fetches reactions while the sheet is up', () => {
    renderSheet(makeCompletion(), { visible: false });
    expect(mockCompletionReactions).toHaveBeenCalledWith(null);
    renderSheet(makeCompletion());
    expect(mockCompletionReactions).toHaveBeenLastCalledWith('c1');
  });
});
