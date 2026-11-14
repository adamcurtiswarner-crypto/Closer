import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { usePartnerName } from '@/hooks/usePartnerName';
import { usePersonalize } from '@/hooks/usePersonalize';
import {
  categoryEntries,
  trendSeries,
  useHearth,
  useMarkDiscussed,
  type HearthCompletion,
} from '@/hooks/useHearth';
import { getCategoryByType } from '@/config/promptCategories';
import { FEATURES } from '@/config/features';
import { useSubscription } from '@/hooks/useSubscription';
import { currentMonthOnly, premiumGates } from '@/utils/premiumGates';
import { HearthRevealSheet } from '@/components/HearthRevealSheet';
import { HearthTalkSheet } from '@/components/HearthTalkSheet';
import { HearthCategoryDetail } from '@/components/HearthCategoryDetail';
import { logEvent } from '@/services/analytics';
import { colors } from '@/config/theme';

/**
 * One dimension, in full: its trend and every answer behind it.
 *
 * This route used to be the Hearth home — a second grid of the same twelve
 * categories, with its own vocabulary (Glowing / Compare notes / warming)
 * competing with the Us map's (Steady / Closing / Opening), on a screen with
 * no tab that a user could land on by pressing Back.
 *
 * The November restructure called Hearth "merged into Us" and left that
 * screen standing. This finishes the job: the twelve categories live in ONE
 * place, the Us map; the tending ritual lives in the Us view's own
 * `UsTogether` section; and this route is now only what it is reached for —
 * the detail of a single dimension.
 *
 * The path is unchanged (`/(app)/hearth?category=…`) so existing deep links
 * and notifications keep resolving. Arriving without a category means there
 * is nothing here to show, so it redirects to Us rather than rendering an
 * empty screen.
 */
export default function HearthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: rawCompletions = [], isLoading } = useHearth();
  const markDiscussed = useMarkDiscussed();
  const personalize = usePersonalize();
  const { name: partnerName } = usePartnerName();
  const { isPremium, isLoading: premiumLoading } = useSubscription();

  const [talkCompletionId, setTalkCompletionId] = React.useState<string | null>(null);
  const [revealCompletionId, setRevealCompletionId] = React.useState<string | null>(null);

  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  const detailCategory =
    typeof categoryParam === 'string' && categoryParam
      ? getCategoryByType(categoryParam)
      : undefined;

  useEffect(() => {
    if (detailCategory) {
      logEvent('category_opened', { category: detailCategory.type });
    }
  }, [detailCategory]);

  // No category (or one we do not recognise): there is no screen here any
  // more. Send them to the view that owns the dimensions.
  useEffect(() => {
    if (!detailCategory) {
      router.replace(FEATURES.usView ? '/(app)/us' : '/(app)/today');
    }
  }, [detailCategory, router]);

  const historyLocked = premiumGates({
    gatesEnabled: FEATURES.premiumGates,
    isPremium,
    isPremiumLoading: premiumLoading,
  }).hearthHistoryLocked;

  const completions = useMemo(
    () => rawCompletions.map((c) => ({ ...c, promptText: personalize(c.promptText) })),
    [rawCompletions, personalize]
  );

  const visibleCompletions = useMemo(
    () => (historyLocked ? currentMonthOnly(completions) : completions),
    [completions, historyLocked]
  );

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

  if (!detailCategory || isLoading) {
    return <SafeAreaView style={styles.container} testID="hearth-detail-empty" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <HearthCategoryDetail
        category={detailCategory}
        // Free couples: current-month entries only, no trend series — the
        // "we talked" flow on those entries stays fully open.
        entries={categoryEntries(visibleCompletions, detailCategory.type)}
        series={historyLocked ? [] : trendSeries(completions, detailCategory.type)}
        myUid={myUid}
        partnerName={partnerName}
        // Explicit, not router.back(): this route is a hidden TAB, so
        // "back" from it returns to the first screen declared in the
        // navigator (home, which is flagged off) rather than wherever the
        // dimension was opened from. Navigating to Us is deterministic and
        // correct from every entry point — the map, and a notification.
        onBack={() => router.replace(FEATURES.usView ? '/(app)/us' : '/(app)/today')}
        onOpenTalkSheet={openTalkSheet}
        onOpenReveal={openReveal}
      />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
});
