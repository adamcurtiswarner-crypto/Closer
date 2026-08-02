import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/components/Icon', () => ({ Icon: () => null }));

import { ConnectionEmber } from '../components/ConnectionEmber';
import { ConnectionHeader } from '../components/ConnectionHeader';
import {
  INITIAL_EMBER_IGNITION,
  isEmberIgniting,
  nextEmberIgnition,
} from '../utils/emberIgnition';

jest.mock('@/hooks/usePartnerName', () => ({
  usePartnerName: () => ({ name: 'Masha', isFallback: false }),
}));

describe('ConnectionEmber', () => {
  it('renders nothing until both partners have answered', () => {
    const { queryByTestId } = render(
      <ConnectionEmber lit={false} igniting={false} />
    );
    // Anti-guilt: an unanswered day is a plain thread. Absence is never
    // marked on the header — only presence is.
    expect(queryByTestId('connection-ember')).toBeNull();
  });

  it('lights once both have answered', () => {
    const { getByTestId } = render(<ConnectionEmber lit igniting={false} />);
    expect(getByTestId('connection-ember')).toBeTruthy();
  });

  it('renders while igniting', () => {
    const { getByTestId } = render(<ConnectionEmber lit igniting />);
    expect(getByTestId('connection-ember')).toBeTruthy();
  });
});

describe('ConnectionHeader ember wiring', () => {
  const baseProps = {
    userName: 'Adam',
    isPartnerOnline: true,
    isPartnerTyping: false,
    typingContext: null,
    lastSeen: null,
    currentStreak: 0,
    isStreakActive: false,
  };

  it('shows no ember on an unanswered day', () => {
    const { queryByTestId } = render(<ConnectionHeader {...baseProps} />);
    expect(queryByTestId('connection-ember')).toBeNull();
  });

  it('shows the ember when the day is complete', () => {
    const { getByTestId } = render(
      <ConnectionHeader {...baseProps} bothAnswered />
    );
    expect(getByTestId('connection-ember')).toBeTruthy();
  });

  it('passes the ignition decision straight through — it never guesses', () => {
    // The header is REMOUNTED by Today's <Animated.View key={mode}> exactly
    // when the day completes, so a mount-time guess here would always see an
    // already-complete day and the ignition could never fire. The decision
    // belongs to the Today screen (src/utils/emberIgnition.ts).
    const { UNSAFE_getByType, rerender } = render(
      <ConnectionHeader {...baseProps} bothAnswered emberIgniting />
    );
    expect(UNSAFE_getByType(ConnectionEmber).props.igniting).toBe(true);

    rerender(<ConnectionHeader {...baseProps} bothAnswered emberIgniting={false} />);
    expect(UNSAFE_getByType(ConnectionEmber).props.igniting).toBe(false);
  });

  it('a freshly mounted complete day does not ignite by default', () => {
    const { UNSAFE_getByType } = render(
      <ConnectionHeader {...baseProps} bothAnswered />
    );
    expect(UNSAFE_getByType(ConnectionEmber).props.igniting).toBe(false);
  });
});

describe('ember ignition decision (survives the keyed remount)', () => {
  const A = 'assignment-a';

  it('ignites when the day completes while the screen is open', () => {
    let state = INITIAL_EMBER_IGNITION;
    state = nextEmberIgnition(state, A, false); // arrived incomplete
    expect(isEmberIgniting(state, false)).toBe(false);
    state = nextEmberIgnition(state, A, true); // partner answers
    expect(isEmberIgniting(state, true)).toBe(true);
  });

  it('stays lit-but-quiet when arriving at an already-complete day', () => {
    // Fresh launch or tab return: the ceremony belongs to the moment.
    let state = INITIAL_EMBER_IGNITION;
    state = nextEmberIgnition(state, A, true);
    expect(isEmberIgniting(state, true)).toBe(false);
  });

  it('holds the decision steady across re-renders (no mid-animation flip)', () => {
    let state = nextEmberIgnition(INITIAL_EMBER_IGNITION, A, false);
    state = nextEmberIgnition(state, A, true);
    for (let i = 0; i < 5; i += 1) {
      state = nextEmberIgnition(state, A, true);
      expect(isEmberIgniting(state, true)).toBe(true);
    }
  });

  it('resets for the next day', () => {
    let state = nextEmberIgnition(INITIAL_EMBER_IGNITION, A, false);
    state = nextEmberIgnition(state, A, true);
    // Tomorrow arrives already complete (partner answered before you looked).
    state = nextEmberIgnition(state, 'assignment-b', true);
    expect(isEmberIgniting(state, true)).toBe(false);
  });

  it('an unpaired/absent day never ignites', () => {
    const state = nextEmberIgnition(INITIAL_EMBER_IGNITION, null, false);
    expect(isEmberIgniting(state, false)).toBe(false);
  });
});
