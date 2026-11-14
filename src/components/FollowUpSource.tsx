import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon } from './Icon';
import { ResponseCard } from './ResponseCard';
import { Skeleton } from './Skeleton';
import { usePersonalize } from '@/hooks/usePersonalize';
import { useFollowUpSource } from '@/hooks/usePrompt';
import { describeSourceDate, scoreGap } from '@/utils/followUpSource';
import { colors, radius, spacing, typography } from '@/config/theme';

interface FollowUpSourceProps {
  parentAssignmentId: string | null;
  partnerName: string;
  /** Starts open on the divergence branch, where the gap IS the question. */
  defaultOpen?: boolean;
}

/**
 * "What this came from" — the question and both answers that produced this
 * follow-up.
 *
 * A follow-up card asserts something about a conversation you already had
 * ("You two saw this one differently") and used to name none of it.
 * Divergence and repair are delivered the day AFTER the question that
 * triggered them, so by the time the card is read the context is gone.
 *
 * Collapsed by default so the follow-up question itself stays the hero, and
 * because re-reading your own answers before writing a new one can anchor
 * you to them. Opening is a deliberate act.
 *
 * Degrades quietly: if the join fails or the parent is missing, it renders
 * nothing at all and the plain context line above it still carries the
 * card. It never blocks answering.
 */
export function FollowUpSource({
  parentAssignmentId,
  partnerName,
  defaultOpen = false,
}: FollowUpSourceProps) {
  const { t } = useTranslation();
  const personalize = usePersonalize();
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = useFollowUpSource(parentAssignmentId);

  if (!parentAssignmentId) return null;

  if (isLoading) {
    return (
      <View style={styles.wrap} testID="follow-up-source-loading">
        <Skeleton width={160} height={12} />
      </View>
    );
  }

  // No parent, no answers, or a denied read: say nothing rather than
  // offering to open an empty drawer.
  if (!data || (!data.myResponse && !data.partnerResponse)) return null;

  const when = describeSourceDate(data.assignedDate);
  const gap = scoreGap(data.myResponse?.responseScore, data.partnerResponse?.responseScore);
  const summary = when
    ? t('followUpSource.fromDated', { when })
    : t('followUpSource.from');

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? t('followUpSource.hide') : t('followUpSource.show')}
        style={styles.toggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="follow-up-source-toggle"
      >
        <Text style={styles.toggleText} maxFontSizeMultiplier={1.4}>
          {summary}
        </Text>
        {/* The Icon map has no caret-down, so the shared right caret is
            rotated rather than widening that map for one use. */}
        <View style={open ? styles.caretOpen : styles.caretClosed}>
          <Icon name="caret-right" size={14} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      {open && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.panel}
          testID="follow-up-source-panel"
        >
          <Text style={styles.question} maxFontSizeMultiplier={1.6}>
            {personalize(data.promptText)}
          </Text>

          {typeof gap === 'number' && gap > 0 && (
            <Text style={styles.gapLine} maxFontSizeMultiplier={1.4}>
              {t('followUpSource.gap', { gap })}
            </Text>
          )}

          {data.myResponse && (
            <View style={styles.answer}>
              <ResponseCard
                label={t('us.you')}
                responseText={data.myResponse.responseText}
                imageUrl={data.myResponse.imageUrl}
                isYours
                score={data.myResponse.responseScore}
              />
            </View>
          )}

          {data.partnerResponse && (
            <View style={styles.answer}>
              <ResponseCard
                label={partnerName}
                responseText={data.partnerResponse.responseText}
                imageUrl={data.partnerResponse.imageUrl}
                score={data.partnerResponse.responseScore}
              />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.smd,
    paddingHorizontal: spacing.sm,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  toggleText: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  caretClosed: {
    transform: [{ rotate: '0deg' }],
  },
  caretOpen: {
    transform: [{ rotate: '90deg' }],
  },
  panel: {
    backgroundColor: colors.surface.background,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    gap: spacing.smd,
  },
  question: {
    ...typography.bodyLg,
    color: colors.text.primary,
  },
  gapLine: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  answer: {
    marginTop: 0,
  },
});
