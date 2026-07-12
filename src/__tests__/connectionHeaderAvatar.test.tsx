import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('@/components/Icon', () => ({ Icon: () => null }));

// The avatar initial derives from the shared hook — control it here instead
// of the Firestore stack.
let mockPartnerName: { name: string; isFallback: boolean } = {
  name: 'your partner',
  isFallback: true,
};
jest.mock('@/hooks/usePartnerName', () => ({
  usePartnerName: () => mockPartnerName,
}));

import { ConnectionHeader } from '../components/ConnectionHeader';

const baseProps = {
  userName: 'Adam',
  isPartnerOnline: true,
  isPartnerTyping: false,
  lastSeen: null,
  currentStreak: 0,
  isStreakActive: false,
};

describe('ConnectionHeader partner avatar', () => {
  beforeEach(() => {
    mockPartnerName = { name: 'your partner', isFallback: true };
  });

  it('shows the first grapheme of a real partner name, uppercased', () => {
    mockPartnerName = { name: 'maya', isFallback: false };
    const { getByText, queryByTestId } = render(<ConnectionHeader {...baseProps} />);
    expect(getByText('M')).toBeTruthy();
    expect(queryByTestId('partner-avatar-fallback')).toBeNull();
  });

  it('handles non-BMP initials as one whole glyph', () => {
    mockPartnerName = { name: '\u{1F98A} Fox', isFallback: false };
    const { getByText } = render(<ConnectionHeader {...baseProps} />);
    expect(getByText('\u{1F98A}')).toBeTruthy();
  });

  it('renders a neutral glyph in the fallback state — never "P" or "Y"', () => {
    const { getByTestId, queryByText } = render(<ConnectionHeader {...baseProps} />);
    expect(getByTestId('partner-avatar-fallback')).toBeTruthy();
    expect(queryByText('P')).toBeNull();
    expect(queryByText('Y')).toBeNull();
  });

  it('a partnerName prop overrides the status line but never fabricates an initial', () => {
    const { getByText, getByTestId } = render(
      <ConnectionHeader {...baseProps} partnerName="Snookums" />
    );
    expect(getByText('Snookums is here')).toBeTruthy();
    expect(getByTestId('partner-avatar-fallback')).toBeTruthy();
  });

  it('sentence-cases the fallback in the status line', () => {
    const { getByText } = render(<ConnectionHeader {...baseProps} />);
    expect(getByText('Your partner is here')).toBeTruthy();
  });

  it('still shows "?" for a missing user name', () => {
    const { getByText } = render(
      <ConnectionHeader {...baseProps} userName={null} />
    );
    expect(getByText('?')).toBeTruthy();
  });
});
