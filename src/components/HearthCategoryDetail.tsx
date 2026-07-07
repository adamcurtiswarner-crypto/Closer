import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Icon } from './Icon';
import { HEARTH_STATE_VISUALS, type HearthVisualState } from './HearthEmberTile';
import { HearthSparkline } from './HearthSparkline';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import {
  isTended,
  needsCouch,
  scoresFor,
  type HearthCompletion,
  type TrendPoint,
} from '@/hooks/useHearth';
import type { PromptCategory } from '@/config/promptCategories';

function visualStateFor(completion: HearthCompletion): HearthVisualState {
  if (isTended(completion)) return 'tended';
  return completion.signal ?? 'steady';
}

interface HearthCategoryDetailProps {
  category: PromptCategory;
  entries: HearthCompletion[];
  series: TrendPoint[];
  myUid: string;
  partnerName: string;
  onBack: () => void;
  onOpenTalkSheet: (completion: HearthCompletion) => void;
}

/**
 * In-screen category mode (explore's pattern): score-trend sparkline,
 * then the entry timeline. Cards expand to show both partners' notes
 * and scores; un-tended repair/divergence entries carry the couch pill.
 */
export function HearthCategoryDetail({
  category,
  entries,
  series,
  myUid,
  partnerName,
  onBack,
  onOpenTalkSheet,
}: HearthCategoryDetailProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const answered = entries.length;
  const tendedCount = entries.filter(isTended).length;

  const stateLabel = (completion: HearthCompletion): string => {
    const state = visualStateFor(completion);
    if (state === 'tended') {
      return t('hearth.state.tended', {
        date: completion.discussedAt ? format(completion.discussedAt, 'MMM d') : '',
      });
    }
    return t(`hearth.state.${state}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          testID="hearth-category-back"
        >
          <Icon name="caret-left" size="sm" color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{category.label}</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.4}>
          {t('hearth.categorySub', { answered, tended: tendedCount })}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {series.length >= 2 && (
          <Animated.View
            entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)}
          >
            <HearthSparkline series={series} />
          </Animated.View>
        )}

        {entries.map((completion, index) => {
          const visual = HEARTH_STATE_VISUALS[visualStateFor(completion)];
          const expanded = expandedId === completion.id;
          const showCouchPill = needsCouch(completion);
          const couchVisual =
            completion.signal === 'divergence'
              ? { bg: colors.brand.purple }
              : { bg: colors.accent.primary };

          return (
            <Animated.View
              key={completion.id}
              entering={FadeInUp.duration(400)
                .delay(Math.min(index, 6) * 80)
                .reduceMotion(ReduceMotion.System)}
            >
              <TouchableOpacity
                style={styles.entryCard}
                onPress={() => setExpandedId(expanded ? null : completion.id)}
                accessibilityRole="button"
                activeOpacity={0.85}
                testID={`hearth-entry-${completion.id}`}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate} maxFontSizeMultiplier={1.4}>
                    {completion.completedAt ? format(completion.completedAt, 'MMM d') : ''}
                  </Text>
                  <View style={[styles.entryChip, { backgroundColor: visual.bg }]}>
                    <Text
                      style={[styles.entryChipLabel, { color: visual.fg }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      {stateLabel(completion)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.entryPrompt}>
                  {'“'}
                  {completion.promptText}
                  {'”'}
                </Text>

                {expanded && (
                  <Animated.View
                    entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
                    style={styles.notes}
                    testID={`hearth-entry-notes-${completion.id}`}
                  >
                    {completion.responses.map((response) => {
                      const isMine = response.userId === myUid;
                      return (
                        <View key={`${completion.id}-${response.userId}`} style={styles.noteRow}>
                          <Text style={styles.noteAuthor} maxFontSizeMultiplier={1.4}>
                            {isMine ? t('common.you') : partnerName}
                            {typeof response.responseScore === 'number'
                              ? ` · ${response.responseScore}`
                              : ''}
                          </Text>
                          {response.responseText.length > 0 && (
                            <Text style={styles.noteText}>{response.responseText}</Text>
                          )}
                        </View>
                      );
                    })}
                    {showCouchPill && (
                      <TouchableOpacity
                        style={[styles.couchPill, { backgroundColor: couchVisual.bg }]}
                        onPress={() => onOpenTalkSheet(completion)}
                        accessibilityRole="button"
                        testID={`hearth-entry-couch-${completion.id}`}
                      >
                        <Text style={styles.couchPillText} maxFontSizeMultiplier={1.4}>
                          {t(
                            completion.signal === 'divergence'
                              ? 'hearth.state.divergence'
                              : 'hearth.state.repair'
                          )}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {entries.length === 0 && (
          <Animated.View
            entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)}
            style={styles.emptyState}
          >
            <Text style={styles.emptyText}>{t('hearth.empty')}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  sub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
    gap: spacing.smd,
  },

  // Entry timeline
  entryCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    gap: spacing.sm,
    ...shadow.cardSubtle,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entryDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  entryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  entryChipLabel: {
    ...typography.caption,
  },
  entryPrompt: {
    ...typography.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  notes: {
    marginTop: spacing.xs,
    paddingTop: spacing.smd,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.smd,
  },
  noteRow: {
    gap: spacing.xs,
  },
  noteAuthor: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  noteText: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  couchPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  couchPillText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  emptyState: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
