import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@components';
import { useAuth } from '@hooks/useAuth';
import { getPendingInviteCode, clearPendingInviteCode } from '@/hooks/useDeepLink';
import { getAuthErrorMessage } from '@/utils/authErrors';

type SignUpFormData = { email: string; password: string };

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signUpSchema = z.object({
    email: z.string().email(t('auth.signUp.validation.emailRequired')),
    password: z.string().min(8, t('auth.signUp.validation.passwordMin')),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password);

      // Check for pending invite code from deep link
      const pendingCode = await getPendingInviteCode();
      if (pendingCode) {
        await clearPendingInviteCode();
        router.replace({
          pathname: '/(onboarding)/accept-invite',
          params: { code: pendingCode },
        });
      } else {
        router.replace('/(onboarding)/verify-email');
      }
    } catch (error: any) {
      Alert.alert(t('auth.signUp.failed'), getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.signUp.title')}</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('common.email')}
                  placeholder={t('common.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <View style={styles.spacer} />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('common.password')}
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  secureTextEntry
                  autoComplete="password-new"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />
          </View>

          <View style={styles.submit}>
            <Button
              title={t('auth.signUp.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
          </View>

          <Text style={styles.terms}>
            {t('auth.signUp.terms')}
            <Text style={styles.termsLink} onPress={() => router.push('/(app)/privacy-policy')}>
              {t('auth.signUp.privacyPolicy')}
            </Text>.
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.signUp.hasAccount')}</Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('auth.signUp.signInLink')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 32,
  },
  form: {},
  spacer: {
    height: 16,
  },
  submit: {
    marginTop: 32,
  },
  terms: {
    color: '#78716c',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  termsLink: {
    color: '#c97454',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#57534e',
  },
  footerLink: {
    color: '#c97454',
    fontWeight: '500',
  },
});
