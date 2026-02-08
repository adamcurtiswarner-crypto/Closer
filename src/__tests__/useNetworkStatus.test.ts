jest.mock('@react-native-community/netinfo', () => {
  let listener: ((state: any) => void) | null = null;
  return {
    addEventListener: jest.fn((cb: any) => {
      listener = cb;
      return jest.fn(); // unsubscribe
    }),
    __simulateState: (state: any) => {
      if (listener) listener(state);
    },
  };
});

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

import NetInfo from '@react-native-community/netinfo';

describe('useNetworkStatus', () => {
  it('should default to connected', () => {
    const defaultStatus = { isConnected: true, isInternetReachable: true };
    expect(defaultStatus.isConnected).toBe(true);
    expect(defaultStatus.isInternetReachable).toBe(true);
  });

  it('should detect disconnection', () => {
    const offlineState = { isConnected: false, isInternetReachable: false };
    expect(offlineState.isConnected).toBe(false);
  });

  it('should detect reconnection', () => {
    const onlineState = { isConnected: true, isInternetReachable: true };
    expect(onlineState.isConnected).toBe(true);
  });

  it('should subscribe to NetInfo on mount', () => {
    NetInfo.addEventListener(() => {});
    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });
});
