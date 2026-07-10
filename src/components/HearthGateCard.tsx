import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@config/theme';

interface HearthGateCardProps {
  onSeePremium: () => void;
}

/**
 * Quiet in-tab gate for the Hearth (premiumGates on, couple free): the
 * current month's embers stay free above this card; history, trends, and
 * the couch queue live behind it. Never a wall — just a card in the flow.
 */
export function HearthGateCard({ onSeePremium }: HearthGateCardProps) {
  const { t } = useTranslation();

  useEffect(() => {
    logEvent('gate_hit', { surface: 'hearth_history' });
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)}
      style={styles.card}
      testID="hearth-gate"
    >
      <View style={styles.titleRow}>
        <Icon name="lock" size="sm" color={colors.text.secondary} weight="light" />
        <Text style={styles.title}>{t('gates.hearthTitle')}</Text>
      </View>
      <Text style={styles.body}>{t('gates.hearthBody')}</Text>
      <TouchableOpacity
        style={styles.premiumButton}
        onPress={onSeePremium}
        accessibilityRole="button"
        activeOpacity={0.8}
        testID="hearth-gate-cta"
      >
        <Text style={styles.premiumButtonText} maxFontSizeMultiplier={1.4}>
          {t('gates.seePremium')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.cardSubtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  body: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  premiumButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  premiumButtonText: {
    ...typography.btn,
    color: colors.accent.primary,
  },
});
