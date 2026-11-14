import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { usePartnerName } from '@/hooks/usePartnerName';
import { usePersonalize } from '@/hooks/usePersonalize';
import {
  couchQueue,
  monthlyStats,
  scoresFor,
  useHearth,
  useMarkDiscussed,
  weeklyRecap,
  type HearthCompletion,
} from '@/hooks/useHearth';
import { getCategoryByType } from '@/config/promptCategories';
import { FEATURES } from '@/config/features';
import { useSubscription } from '@/hooks/useSubscription';
import { currentMonthOnly, premiumGates } from '@/utils/premiumGates';
import { Icon } from './Icon';
import { HearthGateCard } from './HearthGateCard';
import { HearthQueueCard } from './HearthQueueCard';
import { HearthRevealSheet } from './HearthRevealSheet';
import { HearthTalkSheet } from './HearthTalkSheet';
import { Paywall } from './Paywall';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

/**
 * The tending half of the Us view: the week, the couch queue, and the
 * month's two numbers — plus the talk and reveal sheets those entries open.
 *
 * Why this exists (2026-11-14): the November restructure removed Hearth's
 * tab and called it merged, but left the whole screen standing. The same
 * twelve categories then existed in two places with two vocabularies — the
 * Us map saying Steady/Closing/Opening, the Hearth grid saying
 * Glowing/Compare notes/warming/settling — and three paths still led to a
 * screen with no tab, which a user could land on by pressing Back.
 *
 * The duplicate ember grid is gone (the Us map is the one picture of the
 * twelve dimensions). What Hearth genuinely owned — the ritual of talking
 * about an answer and marking it tended — lives here, inside the screen
 * that owns the categories.
 *
 * Self-contained by design: it reads `useHearth` itself rather than taking
 * completions as a prop. React Query serves the same cached snapshot the
 * map is already using, so there is no second fetch, and us.tsx does not
 * grow another six pieces of sheet state.
 */
export function UsTogether() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: rawCompletions = [], isLoading } = useHearth();
  const markDiscussed = useMarkDiscussed();
  const personalize = usePersonalize();
  const { name: partnerName } = usePartnerName();
  const { isPremium, isLoading: premiumLoading } = useSubscription();

  const [talkCompletionId, setTalkCompletionId] = useState<string | null>(null);
  const [revealCompletionId, setRevealCompletionId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const historyLocked = premiumGates({
    gatesEnabled: FEATURES.premiumGates,
    isPremium,
    isPremiumLoading: premiumLoading,
  }).hearthHistoryLocked;

  // Personalize {partner}/{me} once at the data boundary. Display only —
  // mutations go by id, never by text.
  const completions = useMemo(
    () => rawCompletions.map((c) => ({ ...c, promptText: personalize(c.promptText) })),
    [rawCompletions, personalize]
  );

  // Free couples keep the current month, including the whole talk ritual —
  // it is never advertised in the header and then locked.
  const visibleCompletions = useMemo(
    () => (historyLocked ? currentMonthOnly(completions) : completions),
    [completions, historyLocked]
  );

  const queue = useMemo(() => couchQueue(visibleCompletions), [visibleCompletions]);
  const stats = useMemo(() => monthlyStats(completions), [completions]);
  const week = useMemo(() => weeklyRecap(visibleCompletions), [visibleCompletions]);

  const myUid = user?.id ?? '';

  const talkCompletion = talkCompletionId
    ? completions.find((c) => c.id === talkCompletionId) ?? null
    : null;
  const revealCompletion = revealCompletionId
    ? completions.find((c) => c.id === revealCompletionId) ?? null
    : null;

  const openTalkSheet = (completion: HearthCompletion) => {
    setTalkCompletionId(completion.id);
    logEvent('talk_sheet_opened', {
      completion_id: completion.id,
      signal: completion.signal,
    });
  };

  const openReveal = (completion: HearthCompletion) => {
    setRevealCompletionId(completion.id);
    logEvent('hearth_reveal_opened', { assignment_id: completion.id });
  };

  // Nothing to tend and nothing to count: say nothing rather than render
  // three empty headings. The map above already carries the screen.
  //
  // The gate is the exception. A free couple whose history is all in past
  // months has nothing in any of these sections BUT does have history being
  // held back, and that is precisely when the quiet gate card belongs on
  // screen. Hiding it there would gate the content silently.
  const hasGatedHistory = historyLocked && completions.length > 0;
  if (isLoading || premiumLoading) return null;
  if (
    stats.answered === 0 &&
    queue.length === 0 &&
    week.answered === 0 &&
    !hasGatedHistory
  ) {
    return null;
  }

  return (
    <View testID="us-together">
      {week.answered > 0 && (
        <View style={styles.section} testID="us-week">
          <Text style={styles.sectionTitle}>{t('hearth.week.title')}</Text>
          <View style={styles.weekCard}>
            <Text style={styles.weekLine} maxFontSizeMultiplier={1.4}>
              {[
                t('hearth.week.answered', { count: week.answered }),
                week.tended > 0 ? t('hearth.week.tended', { count: week.tended }) : null,
              ]
                .filter((segment): segment is string => segment != null)
                .join(' · ')}
            </Text>
            {week.brightest && (
              <TouchableOpacity
                style={styles.weekBrightest}
                onPress={() => openReveal(week.brightest!)}
                accessibilityRole="button"
                testID="us-week-brightest"
              >
                <View style={styles.weekBrightestText}>
                  <Text style={styles.weekBrightestLabel} maxFontSizeMultiplier={1.4}>
                    {t('hearth.week.brightest')}
                  </Text>
                  <Text
                    style={styles.weekBrightestPrompt}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.4}
                  >
                    {week.brightest.promptText}
                  </Text>
                </View>
                <Icon name="caret-right" size="sm" color={colors.accent.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {queue.length > 0 && (
        <View style={styles.section} testID="us-queue">
          <Text style={styles.sectionTitle}>{t('hearth.queueTitle')}</Text>
          {queue.map((completion, index) => {
            const category = getCategoryByType(completion.category);
            const { mine, theirs } = scoresFor(completion, myUid);
            const meta =
              mine != null && theirs != null
                ? t('hearth.queueMeta', { mine, partner: partnerName, theirs })
                : '';
            const signal = completion.signal === 'divergence' ? 'divergence' : 'repair';
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
                  testID={`us-queue-${completion.id}`}
                />
              </Animated.View>
            );
          })}
        </View>
      )}

      {stats.answered > 0 && (
        <View style={styles.section} testID="us-stats">
          <Text style={styles.sectionTitle}>{t('hearth.statsTitle')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber} maxFontSizeMultiplier={1.4}>
                {stats.answered}
              </Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.4}>
                {t('hearth.statsAnswered', { count: stats.answered })}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber} maxFontSizeMultiplier={1.4}>
                {stats.tended}
              </Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.4}>
                {t('hearth.statsTended', { count: stats.tended })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {historyLocked && (
        <View style={styles.section}>
          <HearthGateCard onSeePremium={() => setShowPaywall(true)} />
        </View>
      )}

      <HearthTalkSheet
        visible={talkCompletion != null}
        completion={talkCompletion}
        myUid={myUid}
        partnerName={partnerName}
        marking={markDiscussed.isPending}
        onMarkDiscussed={(completionId) => markDiscussed.mutate({ completionId })}
        onClose={() => setTalkCompletionId(null)}
      />
      <HearthRevealSheet
        visible={revealCompletion != null}
        completion={revealCompletion}
        myUid={myUid}
        partnerName={partnerName}
        onClose={() => setRevealCompletionId(null)}
      />
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="hearth_history"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.smd,
  },
  weekCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    ...shadow.cardSubtle,
  },
  weekLine: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  weekBrightest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    marginTop: spacing.smd,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    minHeight: 44,
  },
  weekBrightestText: {
    flex: 1,
  },
  weekBrightestLabel: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  weekBrightestPrompt: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBlock: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    ...shadow.cardSubtle,
  },
  statNumber: {
    ...typography.display,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
