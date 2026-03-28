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
                placeholderTextColor="#d6d3d1"
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
                  <ActivityIndicator size="small" color="#ffffff" />
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
                <ActivityIndicator size="small" color="#c97454" />
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
                <ActivityIndicator size="small" color="#ffffff" />
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  emailLabel: {
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1917',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d6c4b8',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#ffffff',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#78716c',
  },
});
