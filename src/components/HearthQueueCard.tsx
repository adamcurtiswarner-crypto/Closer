import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  /** Quiet secondary affordance — reopen the day's reveal (both answers). */
  onReadAnswers?: () => void;
  testID?: string;
}

/**
 * One un-tended repair/divergence entry in the "Waiting for you two"
 * couch queue. Tapping opens the talk sheet (the primary action); a quiet
 * "Read the answers" line underneath reopens that day's reveal.
 */
export function HearthQueueCard({
  completion,
  categoryLabel,
  meta,
  stateLabel,
  onPress,
  onReadAnswers,
  testID,
}: HearthQueueCardProps) {
  const { t } = useTranslation();
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
      {onReadAnswers && (
        <TouchableOpacity
          style={styles.readRow}
          onPress={onReadAnswers}
          accessibilityRole="button"
          accessibilityLabel={t('hearth.readAnswers')}
          activeOpacity={0.7}
          testID={testID ? `${testID}-read` : undefined}
        >
          <Text style={styles.readText} maxFontSizeMultiplier={1.4}>
            {t('hearth.readAnswers')}
          </Text>
        </TouchableOpacity>
      )}
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
  readRow: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
    marginBottom: -spacing.xs,
  },
  readText: {
    // Accent text is this app's quiet "tappable" register (couch flag row,
    // retry links) — no underline, no chrome.
    ...typography.caption,
    color: colors.accent.primary,
  },
});
