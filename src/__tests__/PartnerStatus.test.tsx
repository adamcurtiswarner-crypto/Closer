import React from 'react';
import { render } from '@testing-library/react-native';

// The component resolves the partner's name through the shared hook when no
// prop is passed — control the hook here instead of the Firestore stack.
let mockPartnerName: { name: string; isFallback: boolean } = {
  name: 'your partner',
  isFallback: true,
};
jest.mock('@/hooks/usePartnerName', () => ({
  usePartnerName: () => mockPartnerName,
}));

import { PartnerStatus } from '../components/PartnerStatus';

describe('PartnerStatus', () => {
  beforeEach(() => {
    mockPartnerName = { name: 'your partner', isFallback: true };
  });
  it('shows online status', () => {
    const { getByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={false}
        lastSeen={null}
        partnerName="Alex"
      />
    );
    expect(getByText('Alex is online')).toBeTruthy();
  });

  it('shows typing status for prompt context', () => {
    const { getByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={true}
        typingContext="prompt"
        lastSeen={null}
        partnerName="Alex"
      />
    );
    expect(getByText('Alex is responding...')).toBeTruthy();
  });

  it('shows generic typing status without context', () => {
    const { getByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={true}
        lastSeen={null}
        partnerName="Alex"
      />
    );
    expect(getByText('Alex is typing...')).toBeTruthy();
  });

  it('shows offline when not online and no lastSeen', () => {
    const { getByText } = render(
      <PartnerStatus
        isOnline={false}
        isTyping={false}
        lastSeen={null}
        partnerName="Alex"
      />
    );
    expect(getByText('Offline')).toBeTruthy();
  });

  it('resolves the name via the shared hook when no prop is passed', () => {
    mockPartnerName = { name: 'Jess', isFallback: false };
    const { getByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={false}
        lastSeen={null}
      />
    );
    expect(getByText('Jess is online')).toBeTruthy();
  });

  it('falls back to sentence-cased "Your partner", never robotic "Partner"', () => {
    const { getByText, queryByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={false}
        lastSeen={null}
      />
    );
    expect(getByText('Your partner is online')).toBeTruthy();
    expect(queryByText('Partner is online')).toBeNull();
  });
});
