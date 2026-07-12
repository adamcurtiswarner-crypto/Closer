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
  perCategoryTileState,
  scoresFor,
  tileTally,
  trendSeries,
  useHearth,
  useMarkDiscussed,
  type HearthCompletion,
} from '@/hooks/useHearth';
import { V1_PROMPT_CATEGORIES, getCategoryByType } from '@/config/promptCategories';
import { FEATURES } from '@/config/features';
import { useSubscription } from '@/hooks/useSubscription';
import { currentMonthOnly, premiumGates } from '@/utils/premiumGates';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { HearthEmberTile } from '@/components/HearthEmberTile';
import { HearthGateCard } from '@/components/HearthGateCard';
import { HearthQueueCard } from '@/components/HearthQueueCard';
import { HearthRevealSheet } from '@/components/HearthRevealSheet';
import { HearthTalkSheet } from '@/components/HearthTalkSheet';
import { HearthCategoryDetail } from '@/components/HearthCategoryDetail';
import { Paywall } from '@/components/Paywall';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

export default function HearthScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: rawCompletions = [], isLoading } = useHearth();
  const markDiscussed = useMarkDiscussed();
  const personalize = usePersonalize();
  const { isPremium, isLoading: premiumLoading } = useSubscription();

  // Premium gate (SEV-0 #8): free couples keep the current month — embers,
  // the couch queue, talk sheet, "we talked" marks. Only history (past
  // months) and trends live behind the quiet gate card below.
  const historyLocked = premiumGates({
    gatesEnabled: FEATURES.premiumGates,
    isPremium,
    isPremiumLoading: premiumLoading,
  }).hearthHistoryLocked;

  // Personalize {partner}/{me} tokens once at the data boundary — every card,
  // detail entry, and the talk sheet below renders the personalized copy.
  // Display-only: mutations (markDiscussed) go by id, never by text.
  const completions = useMemo(
    () => rawCompletions.map((c) => ({ ...c, promptText: personalize(c.promptText) })),
    [rawCompletions, personalize]
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [talkCompletionId, setTalkCompletionId] = useState<string | null>(null);
  const [revealCompletionId, setRevealCompletionId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    logEvent('hearth_viewed');
  }, []);

  const myUid = user?.id ?? '';
  const partnerName = user?.partnerName || t('hearth.partnerFallback');

  // What a free couple sees: this calendar month only. Premium (or gates
  // off) sees everything.
  const visibleCompletions = useMemo(
    () => (historyLocked ? currentMonthOnly(completions) : completions),
    [completions, historyLocked]
  );

  // The couch queue derives from the VISIBLE set: free couples get the
  // current month's queue (the talk ritual is never advertised in the
  // header and then locked), premium gets it all. The header count below
  // therefore always matches what the queue section actually shows.
  const queue = useMemo(() => couchQueue(visibleCompletions), [visibleCompletions]);
  // Tile states derive from whatever entry set the screen already shows —
  // free couples accumulate from the current month only (the existing gate).
  const states = useMemo(() => perCategoryTileState(visibleCompletions), [visibleCompletions]);
  const stats = useMemo(() => monthlyStats(completions), [completions]);
  const glowingCount = useMemo(
    () => Object.values(states).filter((s) => s === 'glowing').length,
    [states]
  );

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

  // Reopen a past day's reveal. Like the talk sheet, the sheet reads the
  // live entry from the snapshot-driven cache. The completion id IS the
  // assignment id (the completion doc is keyed by it).
  const revealCompletion = revealCompletionId
    ? completions.find((c) => c.id === revealCompletionId) ?? null
    : null;

  const openReveal = (completion: HearthCompletion) => {
    setRevealCompletionId(completion.id);
    logEvent('hearth_reveal_opened', { assignment_id: completion.id });
  };

  const openCategory = (categoryType: string) => {
    setSelectedCategory(categoryType);
    logEvent('category_opened', { category: categoryType });
  };

  // Header metrics strip: one quiet line from live data, zero segments
  // omitted. Nothing answered this month falls back to the queue-based copy.
  const waitingSubLine =
    queue.length === 0
      ? t('hearth.subSteady')
      : queue.length === 1
        ? t('hearth.subWaitingOne')
        : t('hearth.subWaiting', { count: queue.length });

  const subLine =
    stats.answered === 0
      ? waitingSubLine
      : [
          t('hearth.metrics.answered', { count: stats.answered }),
          glowingCount > 0 ? t('hearth.metrics.glowing', { count: glowingCount }) : null,
          queue.length > 0 ? t('hearth.metrics.waiting', { count: queue.length }) : null,
        ]
          .filter((segment): segment is string => segment != null)
          .join(' · ');

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

  const revealSheet = (
    <HearthRevealSheet
      visible={revealCompletion != null}
      completion={revealCompletion}
      myUid={myUid}
      partnerName={partnerName}
      onClose={() => setRevealCompletionId(null)}
    />
  );

  const paywall = (
    <Paywall
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      source="hearth_history"
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
          // Free couples: current-month entries only, no trend series —
          // the "we talked" flow on those entries stays fully open.
          entries={categoryEntries(visibleCompletions, detailCategory.type)}
          series={historyLocked ? [] : trendSeries(completions, detailCategory.type)}
          myUid={myUid}
          partnerName={partnerName}
          onBack={() => setSelectedCategory(null)}
          onOpenTalkSheet={openTalkSheet}
          onOpenReveal={openReveal}
        />
        {talkSheet}
        {revealSheet}
        {paywall}
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

        {isLoading ? (
          // Quiet loading — neutral shimmer tiles, never the 12 dead "Steady"
          // embers flashing before the data (or the empty state) settles in.
          <View style={styles.grid} testID="hearth-loading">
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={styles.tileWrap}>
                <Skeleton height={96} borderRadius={radius.card} />
              </View>
            ))}
          </View>
        ) : completions.length === 0 ? (
          // Zero completions: the first-ember promise is the hero — no grid
          // of unlit tiles contradicting it. The ember is drawn unlit (muted).
          <Animated.View
            entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)}
            style={styles.emptyCard}
            testID="hearth-empty"
          >
            <View style={styles.emptyEmber}>
              <Icon name="campfire" size="xl" color={colors.text.muted} weight="light" />
            </View>
            <Text style={styles.emptyTitle}>{t('hearth.empty')}</Text>
            <Text style={styles.emptySub}>{t('hearth.emptySub')}</Text>
          </Animated.View>
        ) : (
          <>
            {/* Ember grid — 12 categories, 3 across */}
            <View style={styles.grid}>
              {V1_PROMPT_CATEGORIES.map((category, index) => {
                const state = states[category.type] ?? 'unlit';
                const tallyInfo = tileTally(
                  categoryEntries(visibleCompletions, category.type)
                );
                const tally =
                  state === 'unlit'
                    ? t('hearth.tile.unlitHint')
                    : tallyInfo.trend
                      ? `${t('hearth.tile.answered', { count: tallyInfo.answered })} · ${t(
                          `hearth.tile.${tallyInfo.trend}`
                        )}`
                      : t('hearth.tile.answered', { count: tallyInfo.answered });
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
                      stateLabel={t(`hearth.tile.state.${state}`)}
                      tally={tally}
                      onPress={() => openCategory(category.type)}
                      testID={`hearth-tile-${category.type}`}
                    />
                  </Animated.View>
                );
              })}
            </View>

            {/* Couch queue — free for the current month (the visible set
                already reflects the gate), so the talk ritual never dead-ends
                into a lock. */}
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
                        onReadAnswers={() => openReveal(completion)}
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

            {/* Past months and trends live in Premium — one quiet card at
                the end of the free, current-month content. Never a wall. */}
            {historyLocked && (
              <View style={styles.section}>
                <HearthGateCard onSeePremium={() => setShowPaywall(true)} />
              </View>
            )}
          </>
        )}
      </ScrollView>
      {talkSheet}
      {revealSheet}
      {paywall}
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

  // Empty state — the first-ember promise as the hero of the screen
  emptyCard: {
    marginHorizontal: spacing.screen,
    marginTop: spacing.md,
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.hero,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.smd,
  },
  emptyEmber: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
