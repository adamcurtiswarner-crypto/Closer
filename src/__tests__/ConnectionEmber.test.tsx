import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/components/Icon', () => ({ Icon: () => null }));

import { ConnectionEmber } from '../components/ConnectionEmber';
import { ConnectionHeader } from '../components/ConnectionHeader';

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

  it('mounting an already-complete day does not re-run the ignition', () => {
    // The ceremony belongs to the moment it happened — a remount (tab
    // switch, app resume) settles straight to the breath.
    const { UNSAFE_getByType } = render(
      <ConnectionHeader {...baseProps} bothAnswered />
    );
    expect(UNSAFE_getByType(ConnectionEmber).props.igniting).toBe(false);
  });

  it('ignites when the day completes while on screen', () => {
    const { rerender, UNSAFE_getByType } = render(
      <ConnectionHeader {...baseProps} bothAnswered={false} />
    );
    rerender(<ConnectionHeader {...baseProps} bothAnswered />);
    expect(UNSAFE_getByType(ConnectionEmber).props.igniting).toBe(true);
  });
});
