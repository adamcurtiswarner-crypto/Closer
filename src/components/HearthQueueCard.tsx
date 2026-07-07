import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from './Icon';
import { HEARTH_STATE_VISUALS } from './HearthEmberTile';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import type { HearthCompletion } from '@/hooks/useHearth';

interface HearthQueueCardProps {
  completion: HearthCompletion;
  categoryLabel: string;
  /** e.g. "You 3 · Sam 8" — composed at the call site with i18n. */
  meta: string;
  /** State label — "Talk about it" / "Compare notes". */
  stateLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * One un-tended repair/divergence entry in the "Waiting for you two"
 * couch queue. Tapping opens the talk sheet.
 */
export function HearthQueueCard({
  completion,
  categoryLabel,
  meta,
  stateLabel,
  onPress,
  testID,
}: HearthQueueCardProps) {
  const signal = completion.signal === 'divergence' ? 'divergence' : 'repair';
  const visual = HEARTH_STATE_VISUALS[signal];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      activeOpacity={0.8}
      testID={testID}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: visual.fg }]} maxFontSizeMultiplier={1.4}>
          {categoryLabel}
        </Text>
        <View style={[styles.stateChip, { backgroundColor: visual.bg }]}>
          <Text style={[styles.stateChipLabel, { color: visual.fg }]} maxFontSizeMultiplier={1.4}>
            {stateLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.prompt}>
        {'“'}
        {completion.promptText}
        {'”'}
      </Text>
      <View style={styles.footerRow}>
        {meta.length > 0 && (
          <Text style={styles.meta} maxFontSizeMultiplier={1.4}>
            {meta}
          </Text>
        )}
        <Icon name="caret-right" size="sm" color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    gap: spacing.sm,
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    flexShrink: 1,
  },
  stateChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  stateChipLabel: {
    ...typography.caption,
  },
  prompt: {
    ...typography.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
