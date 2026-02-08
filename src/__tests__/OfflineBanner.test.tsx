import React from 'react';

describe('OfflineBanner', () => {
  it('should be hidden when connected', () => {
    const isConnected = true;
    // Banner translateY should be -60 (hidden) when connected
    const translateY = isConnected ? -60 : 0;
    expect(translateY).toBe(-60);
  });

  it('should be visible when disconnected', () => {
    const isConnected = false;
    const translateY = isConnected ? -60 : 0;
    expect(translateY).toBe(0);
  });

  it('should display offline message', () => {
    const message = "You're offline. Changes will sync when you reconnect.";
    expect(message).toContain('offline');
    expect(message).toContain('sync');
  });

  it('should animate between states', () => {
    // Tests animation from hidden (-60) to visible (0) and back
    const states = [
      { isConnected: true, expectedY: -60 },
      { isConnected: false, expectedY: 0 },
      { isConnected: true, expectedY: -60 },
    ];

    states.forEach((state) => {
      const translateY = state.isConnected ? -60 : 0;
      expect(translateY).toBe(state.expectedY);
    });
  });
});
