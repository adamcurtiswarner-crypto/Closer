import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon } from './Icon';
import { ResponseCard } from './ResponseCard';
import { ScoreGapScale } from './ScoreGapScale';
import { Skeleton } from './Skeleton';
import { usePersonalize } from '@/hooks/usePersonalize';
import { useFollowUpSource } from '@/hooks/usePrompt';
import {
  describeSourceDate,
  longSourceLabel,
  scoreGap,
  shortSourceLabel,
} from '@/utils/followUpSource';
import { colors, radius, spacing, typography } from '@/config/theme';

interface FollowUpSourceProps {
  parentAssignmentId: string | null;
  partnerName: string;
}

/**
 * "What this came from" — the question and both answers that produced this
 * follow-up, with the score gap shown rather than described.
 *
 * A follow-up card asserts something about a conversation you already had
 * ("You two saw this one differently") and used to name none of it.
 * Divergence and repair are delivered the day AFTER the question that
 * triggered them, so by the time the card is read the context is gone.
 *
 * Collapsed to a single strip by default, including on divergence. The
 * first version opened automatically there, which pushed the ink prompt
 * card — today's actual question, and the thing the screen is for — fully
 * below the fold. The strip keeps the gap visible at a glance, so opening
 * is a choice rather than a cost.
 *
 * Degrades quietly: if the join fails or the parent is missing it renders
 * nothing and the plain context line above still carries the card. It never
 * blocks answering.
 */
export function FollowUpSource({ parentAssignmentId, partnerName }: FollowUpSourceProps) {
  const { t } = useTranslation();
  const personalize = usePersonalize();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useFollowUpSource(parentAssignmentId);

  if (!parentAssignmentId) return null;

  if (isLoading) {
    return (
      <View style={styles.wrap} testID="follow-up-source-loading">
        <View style={styles.strip}>
          <Skeleton width={120} height={12} />
        </View>
      </View>
    );
  }

  if (!data || (!data.myResponse && !data.partnerResponse)) return null;

  const myScore = data.myResponse?.responseScore ?? null;
  const partnerScore = data.partnerResponse?.responseScore ?? null;
  const gap = scoreGap(myScore, partnerScore);
  const hasScale = typeof myScore === 'number' && typeof partnerScore === 'number';

  const short = shortSourceLabel(data.assignedDate);
  const long = longSourceLabel(data.assignedDate);
  const when = describeSourceDate(data.assignedDate);

  // A gap of zero is not a gap — the two of you said the same thing, which
  // is what a deepener is built on. Leading with a coral "0 points apart"
  // would dress agreement up as distance, so the day label carries it and
  // the scale shows the two dots sitting together.
  const hasGap = gap !== null && gap > 0;

  // With a real gap the strip leads with it, because that is the whole
  // reason the block exists. Otherwise it names the day.
  const stripLabel =
    hasGap && short
      ? t('followUpSource.stripGap', { when: short, gap })
      : hasGap
        ? t('followUpSource.stripGapNoDate', { gap })
        : when
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
        style={styles.strip}
        testID="follow-up-source-toggle"
      >
        <Text style={styles.stripLabel} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {stripLabel}
        </Text>

        {hasScale && (
          <ScoreGapScale
            myScore={myScore}
            partnerScore={partnerScore}
            partnerName={partnerName}
            variant="strip"
          />
        )}

        {/* The Icon map has no caret-down, so the shared right caret is
            rotated rather than widening that map for one use. */}
        <View style={open ? styles.caretOpen : styles.caretClosed}>
          <Icon name="caret-right" size={13} color={colors.text.muted} />
        </View>
      </TouchableOpacity>

      {open && (
        <Animated.View
          entering={FadeIn.duration(260)}
          style={styles.panel}
          testID="follow-up-source-panel"
        >
          {hasGap && (
            <View style={styles.gapHead}>
              <Text style={styles.gapNumeral} maxFontSizeMultiplier={1.3}>
                {gap}
              </Text>
              <Text style={styles.gapWord} maxFontSizeMultiplier={1.3}>
                {long
                  ? t('followUpSource.apartOn', { when: long })
                  : t('followUpSource.apart')}
              </Text>
            </View>
          )}

          <Text style={styles.question} maxFontSizeMultiplier={1.5}>
            {personalize(data.promptText)}
          </Text>

          {hasScale && (
            <ScoreGapScale
              myScore={myScore}
              partnerScore={partnerScore}
              partnerName={partnerName}
            />
          )}

          {data.myResponse && (
            <ResponseCard
              label={t('us.you')}
              responseText={data.myResponse.responseText}
              imageUrl={data.myResponse.imageUrl}
              isYours
              score={data.myResponse.responseScore}
            />
          )}

          {data.partnerResponse && (
            <View style={data.myResponse ? styles.secondAnswer : undefined}>
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
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
  },
  stripLabel: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  caretClosed: {
    transform: [{ rotate: '0deg' }],
  },
  caretOpen: {
    transform: [{ rotate: '90deg' }],
  },
  panel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    padding: spacing.cardPad,
  },
  gapHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  gapNumeral: {
    ...typography.display,
    color: colors.accent.primary,
  },
  gapWord: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  question: {
    // h3, not heading: the originating question is context for today's
    // prompt, and must not compete with the ink hero above it.
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.smd,
  },
  secondAnswer: {
    marginTop: spacing.sm,
  },
});
