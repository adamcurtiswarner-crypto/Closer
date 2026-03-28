import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const BIOMETRIC_ENABLED_KEY = 'stoke_biometric_enabled';

type BiometricType = 'Face ID' | 'Touch ID' | 'Biometric Unlock';

interface UseBiometricAuth {
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  biometricType: BiometricType;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticate: () => Promise<boolean>;
}

export function useBiometricAuth(): UseBiometricAuth {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('Biometric Unlock');

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(hasHardware && isEnrolled);

        if (hasHardware && isEnrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Touch ID');
          }
        }

        const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        setIsBiometricEnabled(stored === 'true');
      } catch (error) {
        logger.error('Error checking biometric availability:', error);
      }
    })();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Stoke',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      logger.error('Biometric authentication error:', error);
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    const success = await authenticate();
    if (success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setIsBiometricEnabled(true);
    }
    return success;
  }, [authenticate]);

  const disableBiometric = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    setIsBiometricEnabled(false);
  }, []);

  return {
    isBiometricAvailable,
    isBiometricEnabled,
    biometricType,
    enableBiometric,
    disableBiometric,
    authenticate,
  };
}

export { BIOMETRIC_ENABLED_KEY };
