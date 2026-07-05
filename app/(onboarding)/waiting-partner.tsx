import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Icon } from '@/components';
import { useCouple } from '@/hooks/useCouple';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/config/theme';
export default function WaitingPartnerScreen() {
  const { data: couple, refetch } = useCouple();
  const { t } = useTranslation();

  // If partner joined, redirect
  React.useEffect(() => {
    if (couple?.status === 'active') {
      router.replace('/(onboarding)/tone-calibration');
    }
  }, [couple]);

  // Poll for updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 1200, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Animated.View style={pulseStyle}>
            <Icon name="hourglass" size="xl" color={colors.accent.primary} weight="light" />
          </Animated.View>
          <Text style={styles.title}>
            {t('onboarding.waitingPartner.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.waitingPartner.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Button
            title={t('onboarding.waitingPartner.resendInvite')}
            variant="secondary"
            onPress={() => router.push('/(onboarding)/invite-partner')}
          />
        </Animated.View>

        <View style={styles.spacerSmall} />

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            title={t('common.cancel')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  spacerSmall: {
    height: 12,
  },
});
