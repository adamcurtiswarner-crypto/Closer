import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logEvent } from '@/services/analytics';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let wasConnected = true;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? true;

      setStatus({ isConnected: connected, isInternetReachable: reachable });

      // Track disconnect/reconnect events
      if (!connected && wasConnected) {
        logEvent('network_disconnected', {});
      } else if (connected && !wasConnected) {
        logEvent('network_reconnected', {});
      }
      wasConnected = connected;
    });

    return () => unsubscribe();
  }, []);

  return status;
}
