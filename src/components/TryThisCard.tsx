import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Icon } from './Icon';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalize } from '@/hooks/usePersonalize';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';
import { todayLocalISO } from '@/utils/localDate';
import { pickDailyAction, type DailyAction } from '@/utils/dailyActions';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

const TYPE_LABELS: Record<string, string> = {
  say: 'SAY IT',
  do: 'DO IT',
  notice: 'NOTICE IT',
};

interface TryThisCardProps {
  partnerLoveLanguage: string | null;
}

export function TryThisCard({ partnerLoveLanguage }: TryThisCardProps) {
  const { user } = useAuth();
  const personalize = usePersonalize();
  const [feedback, setFeedback] = useState<'landed' | 'missed' | null>(null);

  const action = pickDailyAction(partnerLoveLanguage);
  const personalizedText = personalize(action.text);
  const typeLabel = TYPE_LABELS[action.type] || action.type;

  const handleFeedback = async (result: 'landed' | 'missed') => {
    setFeedback(result);
    logEvent('daily_action_feedback', {
      action_id: action.id,
      action_type: action.type,
      language: action.language,
      result,
    });

    if (user?.coupleId) {
      try {
        // Device-local day, not UTC: `toISOString()` rolls over at 8 PM
        // Eastern, so an evening tap used to write tomorrow's document and
        // the next morning's tap collided with it.
        const today = todayLocalISO();
        await setDoc(
          doc(db, 'couples', user.coupleId, 'action_feedback', `${today}_${user.id}`),
          {
            action_id: action.id,
            action_type: action.type,
            language: action.language,
            result,
            user_id: user.id,
            created_at: serverTimestamp(),
          }
        );
      } catch (error) {
        // The rule is create-only (`allow update: if false`), so changing
        // the answer for the same day is denied by design. Previously this
        // was an empty catch, so a denial was indistinguishable from a
        // write — the exact write-only-sink shape that hid three outages.
        // The tap stays acknowledged in the UI; the failure is reported.
        logger.reportQueryDenied('TryThisCard.feedback', error);
      }
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="sparkle" size="sm" color={colors.accent.primary} weight="bold" />
          <Text style={styles.headerTitle}>Try this today</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Action text */}
      <Text style={styles.actionText}>{personalizedText}</Text>

      {/* Feedback buttons */}
      {feedback === null ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackRow}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => handleFeedback('landed')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="It landed"
          >
            <Icon name="heart" size="sm" color={colors.semantic.success} weight="bold" />
            <Text style={styles.feedbackLabel}>Landed</Text>
          </TouchableOpacity>

          <View style={styles.feedbackDivider} />

          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => handleFeedback('missed')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Not this time"
          >
            <Icon name="hourglass" size="sm" color={colors.text.muted} weight="light" />
            <Text style={styles.feedbackLabelMuted}>Not this time</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackDone}>
          <Text style={styles.feedbackDoneText}>
            {/* No learning loop exists: pickDailyAction is a deterministic
                day-of-year pick and nothing reads action_feedback yet.
                "More like this coming" was a promise the code does not
                keep, so the copy says only what is true. */}
            {feedback === 'landed' ? 'Noted.' : 'Got it.'}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    ...shadow.cardSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.primary,
    fontSize: 15,
  },
  typeBadge: {
    backgroundColor: colors.accent.primary + '14',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...typography.caption,
    color: colors.accent.primary,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  actionText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    paddingTop: spacing.smd,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  feedbackDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: colors.border.default,
  },
  feedbackLabel: {
    ...typography.bodySm,
    color: colors.semantic.success,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
  },
  feedbackLabelMuted: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
  feedbackDone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    paddingTop: spacing.smd,
    alignItems: 'center',
  },
  feedbackDoneText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
