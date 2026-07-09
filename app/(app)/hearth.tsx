import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalize } from '@/hooks/usePersonalize';
import {
  categoryEntries,
  couchQueue,
  monthlyStats,
  perCategoryState,
  scoresFor,
  trendSeries,
  useHearth,
  useMarkDiscussed,
  type HearthCompletion,
} from '@/hooks/useHearth';
import { V1_PROMPT_CATEGORIES, getCategoryByType } from '@/config/promptCategories';
import { Icon } from '@/components/Icon';
import { HearthEmberTile } from '@/components/HearthEmberTile';
import { HearthQueueCard } from '@/components/HearthQueueCard';
import { HearthTalkSheet } from '@/components/HearthTalkSheet';
import { HearthCategoryDetail } from '@/components/HearthCategoryDetail';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

export default function HearthScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: rawCompletions = [], isLoading } = useHearth();
  const markDiscussed = useMarkDiscussed();
  const personalize = usePersonalize();

  // Personalize {partner}/{me} tokens once at the data boundary — every card,
  // detail entry, and the talk sheet below renders the personalized copy.
  // Display-only: mutations (markDiscussed) go by id, never by text.
  const completions = useMemo(
    () => rawCompletions.map((c) => ({ ...c, promptText: personalize(c.promptText) })),
    [rawCompletions, personalize]
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [talkCompletionId, setTalkCompletionId] = useState<string | null>(null);

  useEffect(() => {
    logEvent('hearth_viewed');
  }, []);

  const myUid = user?.id ?? '';
  const partnerName = user?.partnerName || t('hearth.partnerFallback');

  const queue = useMemo(() => couchQueue(completions), [completions]);
  const states = useMemo(() => perCategoryState(completions), [completions]);
  const stats = useMemo(() => monthlyStats(completions), [completions]);

  // The talk sheet reads the live entry from the snapshot-driven cache so
  // the partner's mark (and the server's discussed_at) settle it in place.
  const talkCompletion = talkCompletionId
    ? completions.find((c) => c.id === talkCompletionId) ?? null
    : null;

  const openTalkSheet = (completion: HearthCompletion) => {
    setTalkCompletionId(completion.id);
    logEvent('talk_sheet_opened', {
      completion_id: completion.id,
      signal: completion.signal,
    });
  };

  const openCategory = (categoryType: string) => {
    setSelectedCategory(categoryType);
    logEvent('category_opened', { category: categoryType });
  };

  const subLine =
    queue.length === 0
      ? t('hearth.subSteady')
      : queue.length === 1
        ? t('hearth.subWaitingOne')
        : t('hearth.subWaiting', { count: queue.length });

  const talkSheet = (
    <HearthTalkSheet
      visible={talkCompletion != null}
      completion={talkCompletion}
      myUid={myUid}
      partnerName={partnerName}
      marking={markDiscussed.isPending}
      onMarkDiscussed={(completionId) => markDiscussed.mutate({ completionId })}
      onClose={() => setTalkCompletionId(null)}
    />
  );

  // ─── Category detail mode (explore's in-screen pattern) ───
  const detailCategory = selectedCategory ? getCategoryByType(selectedCategory) : undefined;
  if (detailCategory) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <HearthCategoryDetail
          category={detailCategory}
          entries={categoryEntries(completions, detailCategory.type)}
          series={trendSeries(completions, detailCategory.type)}
          myUid={myUid}
          partnerName={partnerName}
          onBack={() => setSelectedCategory(null)}
          onOpenTalkSheet={openTalkSheet}
        />
        {talkSheet}
      </SafeAreaView>
    );
  }

  // ─── Hearth home ───
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>
            {t('hearth.eyebrow')}
          </Text>
          <Text style={styles.title}>{t('hearth.title')}</Text>
          <Text style={styles.subLine} maxFontSizeMultiplier={1.4}>
            {subLine}
          </Text>
        </View>

        {completions.length === 0 && !isLoading ? (
          <Animated.View
            entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)}
            style={styles.emptyCard}
          >
            <Icon name="campfire" size="lg" color={colors.accent.primary} />
            <Text style={styles.emptyText}>{t('hearth.empty')}</Text>
          </Animated.View>
        ) : (
          <>
            {/* Ember grid — 12 categories, 3 across */}
            <View style={styles.grid}>
              {V1_PROMPT_CATEGORIES.map((category, index) => {
                const state = states[category.type] ?? 'steady';
                return (
                  <Animated.View
                    key={category.type}
                    entering={FadeInUp.duration(400)
                      .delay(index * 40)
                      .reduceMotion(ReduceMotion.System)}
                    style={styles.tileWrap}
                  >
                    <HearthEmberTile
                      label={category.label}
                      icon={category.icon}
                      state={state}
                      stateLabel={t(`hearth.state.${state}`)}
                      onPress={() => openCategory(category.type)}
                      testID={`hearth-tile-${category.type}`}
                    />
                  </Animated.View>
                );
              })}
            </View>

            {/* Couch queue */}
            {queue.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('hearth.queueTitle')}</Text>
                {queue.map((completion, index) => {
                  const category = getCategoryByType(completion.category);
                  const { mine, theirs } = scoresFor(completion, myUid);
                  const meta =
                    mine != null && theirs != null
                      ? t('hearth.queueMeta', { mine, partner: partnerName, theirs })
                      : '';
                  const signal =
                    completion.signal === 'divergence' ? 'divergence' : 'repair';
                  return (
                    <Animated.View
                      key={completion.id}
                      entering={FadeInUp.duration(400)
                        .delay(120 + index * 80)
                        .reduceMotion(ReduceMotion.System)}
                    >
                      <HearthQueueCard
                        completion={completion}
                        categoryLabel={category?.label ?? completion.category}
                        meta={meta}
                        stateLabel={t(`hearth.state.${signal}`)}
                        onPress={() => openTalkSheet(completion)}
                        testID={`hearth-queue-${completion.id}`}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {/* This month — quiet stats, plain numbers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('hearth.statsTitle')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNumber} maxFontSizeMultiplier={1.4}>
                    {stats.answered}
                  </Text>
                  <Text style={styles.statLabel} maxFontSizeMultiplier={1.4}>
                    {t('hearth.statsAnswered')}
                  </Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statNumber} maxFontSizeMultiplier={1.4}>
                    {stats.tended}
                  </Text>
                  <Text style={styles.statLabel} maxFontSizeMultiplier={1.4}>
                    {t('hearth.statsTended')}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {talkSheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  subLine: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Ember grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
  },
  tileWrap: {
    width: '31%',
    flexGrow: 1,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.screen,
    marginTop: spacing.lg,
    gap: spacing.smd,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },

  // Quiet stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBlock: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.cardSubtle,
  },
  statNumber: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Empty state
  emptyCard: {
    marginHorizontal: spacing.screen,
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.hero,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.smd,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
