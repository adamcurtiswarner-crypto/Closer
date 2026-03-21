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
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, SocialAuthButtons } from '@components';
import { useAuth } from '@hooks/useAuth';
import { getPendingInviteCode, clearPendingInviteCode } from '@/hooks/useDeepLink';
import { getAuthErrorMessage } from '@/utils/authErrors';

type SignInFormData = { email: string; password: string };

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signInSchema = z.object({
    email: z.string().email(t('auth.signIn.validation.emailRequired')),
    password: z.string().min(1, t('auth.signIn.validation.passwordRequired')),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);

      // Check for pending invite code from deep link
      const pendingCode = await getPendingInviteCode();
      if (pendingCode) {
        await clearPendingInviteCode();
        router.replace({
          pathname: '/(onboarding)/accept-invite',
          params: { code: pendingCode },
        });
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert(t('auth.signIn.failed'), getAuthErrorMessage(error));
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
            {t('auth.signIn.title')}
          </Animated.Text>

          <SocialAuthButtons animationDelay={100} dividerText="OR LOG IN WITH EMAIL" />

          <View style={styles.form}>
            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
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
                    style={{ borderRadius: 38 }}
                  />
                )}
              />
            </Animated.View>

            <View style={styles.spacer} />

            <Animated.View entering={FadeInUp.duration(400).delay(200)}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('common.password')}
                    placeholder={t('auth.signIn.passwordPlaceholder')}
                    secureTextEntry
                    autoComplete="password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.password?.message}
                    style={{ borderRadius: 38 }}
                  />
                )}
              />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.submit}>
            <Button
              title={t('auth.signIn.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgot}>
                <Text style={styles.forgotText}>{t('auth.signIn.forgotPassword')}</Text>
              </TouchableOpacity>
            </Link>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.signIn.noAccount')}</Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>{t('auth.signIn.signUpLink')}</Text>
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
    backgroundColor: '#fef7f4',
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
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    marginBottom: 32,
  },
  form: {},
  spacer: {
    height: 16,
  },
  forgot: {
    marginTop: 12,
  },
  forgotText: {
    color: '#c97454',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  submit: {
    marginTop: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    color: '#57534e',
  },
  footerLink: {
    color: '#c97454',
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
});
