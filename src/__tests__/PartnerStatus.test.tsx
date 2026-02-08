import React from 'react';
import { render } from '@testing-library/react-native';
import { PartnerStatus } from '../components/PartnerStatus';

describe('PartnerStatus', () => {
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

  it('uses default partner name', () => {
    const { getByText } = render(
      <PartnerStatus
        isOnline={true}
        isTyping={false}
        lastSeen={null}
      />
    );
    expect(getByText('Partner is online')).toBeTruthy();
  });
});
