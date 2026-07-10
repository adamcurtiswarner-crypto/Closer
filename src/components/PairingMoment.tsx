import React, { useEffect, useRef } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { colors, radius, spacing, typography } from '@config/theme';
import { Icon } from './Icon';

// The pairing moment — the one beat where two accounts become a couple.
// Shown full-screen on BOTH sides of the link: the accepter right after the
// invite goes through, and the inviter the moment their partner joins.
// One Success haptic, a warm flame entrance, then it steps aside on its own.
const AUTO_ADVANCE_MS = 2500;
const GLOW_SIZE = 140;
const FLAME_SIZE = 56;
const FLAME_DELAY_MS = 150;
const TEXT_DELAY_MS = 550;
const LINE_DELAY_MS = 850;

const GLOW_SPRING = { damping: 14, stiffness: 120 };
const FLAME_SPRING = { damping: 12, stiffness: 160 };

interface PairingMomentProps {
  /** Partner's display name — first name shown; falls back to "your partner". */
  partnerName?: string | null;
  /** Current user's display name — first name shown; falls back to "You". */
  myName?: string | null;
  /** Called exactly once — after ~2.5s, or sooner on tap. */
  onDone: () => void;
  autoAdvanceMs?: number;
}

function firstNameOf(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

export function PairingMoment({
  partnerName,
  myName,
  onDone,
  autoAdvanceMs = AUTO_ADVANCE_MS,
}: PairingMomentProps) {
  const { t } = useTranslation();
  const hasFinished = useRef(false);

  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  const flameScale = useSharedValue(0.4);
  const flameOpacity = useSharedValue(0);

  const finish = () => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    onDone();
  };

  useEffect(() => {
    // ONE quiet Success beat — the only haptic in the pairing flow.
    hapticNotification(NotificationFeedbackType.Success);

    // Warm scale + glow entrance; reanimated honors Reduce Motion system-wide.
    glowScale.value = withSpring(1, { ...GLOW_SPRING, reduceMotion: ReduceMotion.System });
    glowOpacity.value = withTiming(1, { duration: 400, reduceMotion: ReduceMotion.System });
    flameScale.value = withDelay(
      FLAME_DELAY_MS,
      withSpring(1, { ...FLAME_SPRING, reduceMotion: ReduceMotion.System }),
      ReduceMotion.System,
    );
    flameOpacity.value = withDelay(
      FLAME_DELAY_MS,
      withTiming(1, { duration: 300, reduceMotion: ReduceMotion.System }),
      ReduceMotion.System,
    );

    const timer = setTimeout(finish, autoAdvanceMs);
    return () => clearTimeout(timer);
    // Mount-only: the moment plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const flameStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
    transform: [{ scale: flameScale.value }],
  }));

  const nameA = firstNameOf(myName) ?? t('onboarding.pairingMoment.you');
  const nameB = firstNameOf(partnerName) ?? t('onboarding.pairingMoment.yourPartner');

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        style={styles.pressable}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.pairingMoment.continueA11y')}
        testID="pairing-moment"
      >
        <Animated.View style={[styles.glow, glowStyle]}>
          <Animated.View style={flameStyle}>
            <Icon
              name="flame"
              size={FLAME_SIZE}
              color={colors.accent.primary}
              weight="fill"
            />
          </Animated.View>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.duration(450).delay(TEXT_DELAY_MS).reduceMotion(ReduceMotion.System)}
          style={styles.names}
        >
          {t('onboarding.pairingMoment.names', { nameA, nameB })}
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.duration(450).delay(LINE_DELAY_MS).reduceMotion(ReduceMotion.System)}
          style={styles.line}
        >
          {t('onboarding.pairingMoment.fireLit')}
        </Animated.Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.surface.warmTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  names: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  line: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
