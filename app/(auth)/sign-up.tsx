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
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, SocialAuthButtons } from '@components';
import { useAuth } from '@hooks/useAuth';
import { getPendingInviteCode, clearPendingInviteCode } from '@/hooks/useDeepLink';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { colors, spacing, typography } from '@config/theme';

type SignUpFormData = { email: string; password: string };

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
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
      } else if (invite === 'true') {
        // User came from "I have an invite code" on welcome screen
        router.replace('/(onboarding)/accept-invite');
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
          <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
            {t('auth.signUp.title')}
          </Animated.Text>

          <SocialAuthButtons animationDelay={100} dividerText="or sign up with email" />

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

          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.submit}>
            <Button
              title={t('auth.signUp.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <Text style={styles.terms}>
              {t('auth.signUp.terms')}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms-of-service' as any)}>
                {t('auth.signUp.termsOfService')}
              </Text>
              {' and '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/privacy-policy' as any)}>
                {t('auth.signUp.privacyPolicy')}
              </Text>.
            </Text>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.signUp.hasAccount')}</Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity style={styles.footerLinkButton}>
                  <Text style={styles.footerLink}>{t('auth.signUp.signInLink')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: 'center',
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  form: {},
  spacer: {
    height: spacing.md,
  },
  submit: {
    marginTop: spacing.lg,
  },
  terms: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  termsLink: {
    color: colors.accent.primary,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footerLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  footerLink: {
    ...typography.body,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    color: colors.accent.primary,
  },
});
