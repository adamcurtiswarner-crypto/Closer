import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AntDesign } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuth } from '@hooks/useAuth';
import { getPendingInviteCode, clearPendingInviteCode } from '@/hooks/useDeepLink';
import { getAuthErrorMessage } from '@/utils/authErrors';

interface SocialAuthButtonsProps {
  animationDelay?: number;
  dividerText?: string;
}

export function SocialAuthButtons({ animationDelay = 0, dividerText = 'or' }: SocialAuthButtonsProps) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handlePostAuth = async (isNewUser: boolean) => {
    const pendingCode = await getPendingInviteCode();
    if (pendingCode) {
      await clearPendingInviteCode();
      router.replace({
        pathname: '/(onboarding)/accept-invite',
        params: { code: pendingCode },
      });
    } else if (isNewUser) {
      // New social auth users skip email verification, go to invite-partner
      router.replace('/(onboarding)/invite-partner');
    } else {
      router.replace('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      await handlePostAuth(result.isNewUser);
    } catch (error: any) {
      // User cancelled — not an error
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Sign in failed', getAuthErrorMessage(error));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const result = await signInWithApple();
      await handlePostAuth(result.isNewUser);
    } catch (error: any) {
      // User cancelled — not an error
      if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === 'ERR_CANCELED') return;
      Alert.alert('Sign in failed', getAuthErrorMessage(error));
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(animationDelay)}>
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={isGoogleLoading}
        activeOpacity={0.8}
      >
        <AntDesign name="google" size={20} color="#4285F4" />
        <Text style={styles.googleButtonText}>
          {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{dividerText}</Text>
        <View style={styles.dividerLine} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    height: 52,
    marginBottom: 12,
  },
  googleButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 115, 85, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
