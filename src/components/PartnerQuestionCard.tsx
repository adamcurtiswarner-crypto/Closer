import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface PartnerQuestionCardProps {
  /** Partner display name — caller falls back to "your partner". */
  partnerName: string;
  /** Text of the (most recent) question waiting on the user. */
  promptText: string;
  /** How many questions are waiting; above 1 the text becomes a count line. */
  questionCount: number;
  onPress: () => void;
}

/**
 * Quiet Today-screen discovery card: the partner answered an explore prompt
 * and is waiting on you. Deliberately subordinate to the daily prompt card —
 * subtle shadow, no accent bar, one line of type.
 */
export function PartnerQuestionCard({
  partnerName,
  promptText,
  questionCount,
  onPress,
}: PartnerQuestionCardProps) {
  const { t } = useTranslation();

  if (questionCount < 1) return null;

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(300)}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('today.fromName', { name: partnerName })}
      >
        <View style={styles.textWrap}>
          <Text style={styles.eyebrow}>{t('today.fromName', { name: partnerName })}</Text>
          <Text style={styles.promptText} numberOfLines={2}>
            {questionCount > 1
              ? t('today.questionsWaiting', { count: questionCount })
              : promptText}
          </Text>
        </View>
        <Icon name="arrow-right" size="sm" color={colors.text.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    minHeight: 44,
    ...shadow.cardSubtle,
  },
  textWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent.primary,
  },
  promptText: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
});
