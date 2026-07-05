import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  OAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/config/theme';
interface ReauthModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReauthModal({ visible, onSuccess, onCancel }: ReauthModalProps) {
  const { firebaseUser } = useAuth();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerId = firebaseUser?.providerData[0]?.providerId;

  const handlePasswordReauth = async () => {
    if (!firebaseUser?.email || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      setPassword('');
      onSuccess();
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleReauth = async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('Google sign-in failed: no ID token');

      const credential = GoogleAuthProvider.credential(idToken);
      await reauthenticateWithCredential(firebaseUser, credential);
      onSuccess();
    } catch (err: any) {
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleReauth = async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const rawNonce = Math.random().toString(36).substring(2, 34);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple sign-in failed: no identity token');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });
      await reauthenticateWithCredential(firebaseUser, credential);
      onSuccess();
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        // User cancelled
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('settings.reauth.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.reauth.subtitle')}</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          {providerId === 'password' && (
            <>
              <Text style={styles.emailLabel}>{firebaseUser?.email}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('settings.reauth.password')}
                placeholderTextColor={colors.border.default}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.button, !password && styles.buttonDisabled]}
                onPress={handlePasswordReauth}
                disabled={!password || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.buttonText}>{t('settings.reauth.confirm')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {providerId === 'google.com' && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleReauth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Text style={styles.socialButtonText}>{t('settings.reauth.googleButton')}</Text>
              )}
            </TouchableOpacity>
          )}

          {providerId === 'apple.com' && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={handleAppleReauth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  {t('settings.reauth.appleButton')}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.cardPad,
  },
  error: {
    ...typography.bodySm,
    color: colors.semantic.destructive,
    marginBottom: spacing.smd,
  },
  emailLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.smd,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.h3,
    color: colors.text.inverse,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  socialButtonText: {
    ...typography.h3,
    color: colors.text.primary,
  },
  appleButton: {
    backgroundColor: colors.external.apple,
    borderColor: colors.external.apple,
  },
  appleButtonText: {
    color: colors.text.inverse,
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
