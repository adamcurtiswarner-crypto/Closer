import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, AppState, StyleSheet } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

export function BiometricGate() {
  const { isAuthenticated } = useAuth();
  const { isBiometricEnabled, authenticate } = useBiometricAuth();
  const [isLocked, setIsLocked] = useState(true); // Start locked on cold start
  const [authFailed, setAuthFailed] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isPromptingRef = useRef(false);
  const hasUnlockedRef = useRef(false);

  const promptBiometric = useCallback(async () => {
    if (isPromptingRef.current) return;
    isPromptingRef.current = true;
    setAuthFailed(false);

    const success = await authenticate();
    isPromptingRef.current = false;

    if (success) {
      setIsLocked(false);
    } else {
      setAuthFailed(true);
    }
  }, [authenticate]);

  // Prompt once on cold start, then stay unlocked for the session
  useEffect(() => {
    if (!isAuthenticated || !isBiometricEnabled || hasUnlockedRef.current) {
      setIsLocked(false);
      return;
    }
    promptBiometric().then(() => {
      hasUnlockedRef.current = true;
    });
  }, [isAuthenticated, isBiometricEnabled]);

  if (!isLocked || !isAuthenticated || !isBiometricEnabled) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.appName}>Stoke</Text>
        {authFailed ? (
          <TouchableOpacity style={styles.tryAgainButton} onPress={promptBiometric}>
            <Text style={styles.tryAgainText}>Try again</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>Authenticating...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fef7f4',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Alexandria-Bold',
    color: '#c97454',
    marginBottom: 8,
  },
  hint: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
  },
  tryAgainButton: {
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  tryAgainText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#ffffff',
  },
});
