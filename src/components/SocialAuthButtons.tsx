import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AntDesign } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuth } from '@hooks/useAuth';
import { getPendingInviteCode, clearPendingInviteCode } from '@/hooks/useDeepLink';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { colors, radius, spacing, typography } from '@config/theme';

// Google brand color — exempt from theme tokens
const GOOGLE_BLUE = colors.external.google;

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
      // New accounts confirm their name first; the name screen carries the
      // invite code into accept-invite. Existing accounts already named
      // themselves — never ask twice, go straight to the join screen.
      if (isNewUser) {
        router.replace({
          pathname: '/(onboarding)/name',
          params: { code: pendingCode },
        });
      } else {
        router.replace({
          pathname: '/(onboarding)/accept-invite',
          params: { code: pendingCode },
        });
      }
    } else if (isNewUser) {
      // Name step first — pre-filled when Apple/Google shared a name, so
      // it's a one-tap confirm. Then value-prop → invite-partner.
      router.replace('/(onboarding)/name');
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
          cornerRadius={radius.input}
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
        <AntDesign name="google" size={20} color={GOOGLE_BLUE} />
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
    marginBottom: spacing.smd,
  },
  googleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.smd,
  },
  googleButtonText: {
    ...typography.h3,
    color: colors.text.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
});
