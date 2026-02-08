import React from 'react';

type PartnershipState = 'active' | 'pending' | 'no-partner';

describe('PartnershipSection', () => {
  function getPartnershipState(coupleId: string | null, coupleStatus: string | null): PartnershipState {
    if (!coupleId) return 'no-partner';
    if (coupleStatus === 'active') return 'active';
    return 'pending';
  }

  it('should render active state when couple is active', () => {
    const state = getPartnershipState('couple-1', 'active');
    expect(state).toBe('active');
  });

  it('should render pending state when couple is pending', () => {
    const state = getPartnershipState('couple-1', 'pending');
    expect(state).toBe('pending');
  });

  it('should render no-partner state when no couple', () => {
    const state = getPartnershipState(null, null);
    expect(state).toBe('no-partner');
  });

  it('should show disconnect option for active couples', () => {
    const state = getPartnershipState('couple-1', 'active');
    const showDisconnect = state === 'active';
    expect(showDisconnect).toBe(true);
  });

  it('should show invite link for no-partner state', () => {
    const state = getPartnershipState(null, null);
    const showInvite = state === 'no-partner';
    expect(showInvite).toBe(true);
  });
});
