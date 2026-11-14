import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon } from './Icon';
import { ScoreGapScale } from './ScoreGapScale';
import { getCategoryByType } from '@/config/promptCategories';
import type { UsCategoryRow, UsStillForming } from '@/utils/usView';
import { colors, radius, spacing, typography } from '@/config/theme';

const MOVEMENT_COLOR: Record<string, string> = {
  closing: colors.semantic.success,
  opening: colors.accent.primary,
};

function categoryLabel(category: string): string {
  return getCategoryByType(category)?.label ?? category;
}

interface UsLeadCardProps {
  row: UsCategoryRow;
  partnerName: string;
  eyebrow: string;
  headline: string;
  cta: string;
  onPress: () => void;
}

/**
 * The ink lead card — the one thing on this screen worth a conversation.
 *
 * Ink, because the daily prompt card is ink and this is the same kind of
 * object: something being put to the two of you. The gap is drawn on the
 * shared rail rather than stated as a number, for the same reason the
 * follow-up source block draws it — the distance IS the content.
 */
export function UsLeadCard({
  row,
  partnerName,
  eyebrow,
  headline,
  cta,
  onPress,
}: UsLeadCardProps) {
  return (
    <TouchableOpacity
      style={styles.lead}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      testID={`us-lead-${row.category}`}
    >
      <Text style={styles.leadEyebrow} maxFontSizeMultiplier={1.3}>
        {eyebrow}
      </Text>
      <Text style={styles.leadHeadline} maxFontSizeMultiplier={1.5}>
        {headline}
      </Text>
      <View style={styles.leadScale}>
        <ScoreGapScale
          myScore={row.myAvg}
          partnerScore={row.partnerAvg}
          partnerName={partnerName}
          onInk
        />
      </View>
      <Text style={styles.leadCta} maxFontSizeMultiplier={1.3}>
        {cta}
      </Text>
    </TouchableOpacity>
  );
}

interface UsMapProps {
  rows: UsCategoryRow[];
  stillForming: UsStillForming[];
  partnerName: string;
  movementLabel: (movement: UsCategoryRow['movement']) => string;
  stillFormingLabel: (item: UsStillForming) => string;
  onCategoryPress: (category: string) => void;
}

/**
 * Every category on one shared 1-10 rail, widest gap first.
 *
 * This replaces a 12-tile grid of averages, status pills and one-decimal
 * scores. One rail per row means distance is comparable down the column at
 * a glance, which a grid of separate little bars never allowed — and the
 * rows carry no grade, because the product is a mirror, not a report card.
 *
 * Categories without enough answers are not rendered as rows at all. They
 * sit below, saying how many answers they still need, which is both honest
 * and the only genuinely actionable thing on the screen.
 */
export function UsMap({
  rows,
  stillForming,
  partnerName,
  movementLabel,
  stillFormingLabel,
  onCategoryPress,
}: UsMapProps) {
  return (
    <View testID="us-map">
      {rows.map((row) => {
        const move = row.movement;
        const moveColor =
          move && MOVEMENT_COLOR[move] ? MOVEMENT_COLOR[move] : colors.text.muted;

        return (
          <TouchableOpacity
            key={row.category}
            style={styles.row}
            onPress={() => onCategoryPress(row.category)}
            activeOpacity={0.7}
            accessibilityRole="button"
            testID={`us-row-${row.category}`}
          >
            <Text style={styles.rowName} numberOfLines={2} maxFontSizeMultiplier={1.4}>
              {categoryLabel(row.category)}
            </Text>
            <ScoreGapScale
              myScore={row.myAvg}
              partnerScore={row.partnerAvg}
              partnerName={partnerName}
              variant="strip"
            />
            <Text
              style={[styles.rowMovement, { color: moveColor }]}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              {movementLabel(move)}
            </Text>
          </TouchableOpacity>
        );
      })}

      {stillForming.map((item) => (
        <View key={item.category} style={styles.quietRow} testID={`us-forming-${item.category}`}>
          <Text style={styles.quietName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {categoryLabel(item.category)}
          </Text>
          <Text style={styles.quietCount} maxFontSizeMultiplier={1.2}>
            {stillFormingLabel(item)}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface UsMovementCardProps {
  row: UsCategoryRow;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  onPress: () => void;
}

/** The second lead: the clearest movement, which a static picture cannot show. */
export function UsMovementCard({
  row,
  eyebrow,
  headline,
  body,
  cta,
  onPress,
}: UsMovementCardProps) {
  return (
    <TouchableOpacity
      style={styles.movementCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      testID={`us-movement-${row.category}`}
    >
      <Text style={styles.movementEyebrow} maxFontSizeMultiplier={1.3}>
        {eyebrow}
      </Text>
      <Text style={styles.movementHeadline} maxFontSizeMultiplier={1.4}>
        {headline}
      </Text>
      <Text style={styles.movementBody} maxFontSizeMultiplier={1.4}>
        {body}
      </Text>
      <View style={styles.movementCtaRow}>
        <Text style={styles.movementCta} maxFontSizeMultiplier={1.3}>
          {cta}
        </Text>
        <Icon name="caret-right" size={13} color={colors.accent.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  lead: {
    backgroundColor: colors.surface.ink,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
  },
  leadEyebrow: {
    ...typography.eyebrow,
    color: colors.onDark.muted,
  },
  leadHeadline: {
    ...typography.heading,
    color: '#FFFFFF',
    marginTop: spacing.sm,
  },
  leadScale: {
    marginTop: spacing.md,
  },
  leadCta: {
    ...typography.eyebrow,
    color: colors.accent.primary,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    marginBottom: spacing.xs,
  },
  rowName: {
    ...typography.bodySm,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    color: colors.text.primary,
    width: 112,
  },
  rowMovement: {
    ...typography.eyebrow,
    width: 58,
    textAlign: 'right',
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
    marginBottom: spacing.xs,
  },
  quietName: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  quietCount: {
    ...typography.eyebrow,
    color: colors.text.muted,
  },
  movementCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    padding: spacing.cardPad,
  },
  movementEyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  movementHeadline: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  movementBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  movementCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.smd,
  },
  movementCta: {
    ...typography.eyebrow,
    color: colors.accent.primary,
  },
});
