import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@components';
import { useAuth } from '@hooks/useAuth';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { colors, spacing, typography } from '@config/theme';

/**
 * The name step — the single common point right after account creation,
 * before the invite/join branch. Both signup paths land here:
 *   creator:  signup → [name] → value-prop → invite-partner
 *   accepter: welcome "I have an invite" → signup → [name] → accept-invite
 * Social-auth users who arrived with a provider name see it pre-filled
 * and just confirm. The index route guard also sends any un-onboarded,
 * un-named user here — but never someone whose name is already set.
 */
export default function NameScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { code, next } = useLocalSearchParams<{ code?: string; next?: string }>();
  // Pre-fill for social-auth users whose provider shared a name — they
  // confirm or edit rather than typing it again.
  const [name, setName] = useState(user?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = name.trim();

  const routeOnward = () => {
    if (code) {
      // Deep-linked invite — carry the code straight into the join screen
      router.replace({ pathname: '/(onboarding)/accept-invite', params: { code } });
    } else if (next === 'join') {
      // "I have an invite code" path from the welcome screen
      router.replace('/(onboarding)/accept-invite');
    } else if (user?.coupleId) {
      // Already paired (route-guard re-entry mid-onboarding) — let the
      // index guard pick the right next step now that the name is set.
      router.replace('/');
    } else {
      router.replace('/(onboarding)/value-prop');
    }
  };

  const handleContinue = async () => {
    if (!trimmed || !user || isSaving) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        display_name: trimmed,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('onboarding_name_set', { prefilled: !!user.displayName });
      routeOnward();
    } catch (error) {
      logger.error('Error saving display name during onboarding:', error);
      Alert.alert(t('onboarding.name.saveFailedTitle'), t('onboarding.name.saveFailedBody'));
    } finally {
      setIsSaving(false);
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
            {t('onboarding.name.title')}
          </Animated.Text>

          <Animated.View entering={FadeInUp.duration(500).delay(150)}>
            <Input
              placeholder={t('onboarding.name.placeholder')}
              hint={t('onboarding.name.hint')}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              autoComplete="name-given"
              textContentType="givenName"
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.submit}>
            <Button
              title={t('common.continue')}
              onPress={handleContinue}
              disabled={!trimmed}
              loading={isSaving}
            />
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
  submit: {
    marginTop: spacing.lg,
  },
});
