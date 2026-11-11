import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { usePartnerName } from '@/hooks/usePartnerName';
import { usePartnerLoveLanguage } from '@/hooks/usePartnerLoveLanguage';
import { useSubscription } from '@/hooks/useSubscription';
import {
  couchQueue,
  isTended,
  monthlyStats,
  useHearth,
  useMarkDiscussed,
  type HearthCompletion,
} from '@/hooks/useHearth';
import { deriveAlignment, deriveRadarData, movementPicks, type CategoryAlignment } from '@/utils/alignment';
import { deriveReactionSignals } from '@/utils/reactionSignals';
import { getLoveLanguageTips } from '@/utils/loveLanguageTips';
import type { ReactionType } from '@/hooks/useReaction';

const REACTION_LABELS: Record<ReactionType, string> = {
  heart: 'Love',
  fire: 'Spark',
  laughing: 'Smile',
  teary: 'Moved',
};
import { isSameCalendarMonth, premiumGates } from '@/utils/premiumGates';
import { getCategoryByType, V1_PROMPT_CATEGORIES } from '@/config/promptCategories';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { FEATURES } from '@/config/features';
import { getInitials } from '@/utils/initials';
import { Icon } from '@/components/Icon';
import { UsGrid } from '@/components/UsGrid';
import { Paywall } from '@/components/Paywall';
import { Skeleton } from '@/components/Skeleton';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

/**
 * The "Us" view (docs/plans/2026-07-20-us-profile-view-design.md): a mirror
 * of the couple built from their own scored answers — where they're close,
 * where they differ, which way it's moving. Never a score or a grade.
 * Alignment + movement are premium; the header, tended line, and
 * side-by-side rows stay free. Locked sections keep real category names
 * with blurred states — the same honesty rule as the locked follow-up.
 */
export default function UsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const { name: partnerName } = usePartnerName();
  const { data: partnerLoveLanguage } = usePartnerLoveLanguage();
  const { data: completions = [] } = useHearth();
  const { isPremium, isLoading: premiumLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const locked = premiumGates({
    gatesEnabled: FEATURES.premiumGates,
    isPremium,
    isPremiumLoading: premiumLoading,
  }).usViewLocked;

  useEffect(() => {
    if (locked) logEvent('gate_hit', { surface: 'us_view' });
  }, [locked]);

  const alignments = useMemo(() => deriveAlignment(completions), [completions]);
  const movements = useMemo(() => movementPicks(alignments), [alignments]);
  const reactionSignals = useMemo(() => deriveReactionSignals(completions), [completions]);
  const radarData = useMemo(
    () =>
      user?.id
        ? deriveRadarData(
            completions,
            user.id,
            V1_PROMPT_CATEGORIES.map((c) => c.type)
          )
        : [],
    [completions, user?.id]
  );

  // Couch queue: conversations that need attention (repair/divergence/flagged, not yet tended)
  const queue = useMemo(() => couchQueue(completions), [completions]);

  // Monthly engagement stats
  const monthly = useMemo(() => monthlyStats(completions), [completions]);

  // Repair/divergence/flagged entries both partners marked "we talked"
  // this calendar month. Counted by the DISCUSSED month (discussedAt), the
  // same semantics as Hearth's monthly stats — the two screens must agree.
  const tendedCount = useMemo(
    () =>
      completions.filter(
        (c: HearthCompletion) =>
          (c.signal === 'repair' || c.signal === 'divergence' || c.couchFlagged) &&
          isTended(c) &&
          isSameCalendarMonth(c.discussedAt)
      ).length,
    [completions]
  );

  if (!FEATURES.usView) return <Redirect href="/(app)/today" />;
  if (!user) return null;

  const daysTogether = couple?.anniversaryDate
    ? Math.max(0, differenceInCalendarDays(new Date(), couple.anniversaryDate))
    : null;

  const myLoveLanguage = user.loveLanguage
    ? getLoveLanguageDisplay(user.loveLanguage)?.label
    : null;
  const partnerLoveLanguageLabel = partnerLoveLanguage
    ? getLoveLanguageDisplay(partnerLoveLanguage)?.label
    : null;

  const openCategory = (category: string) => {
    logEvent('us_view_category_opened', { category });
    router.push({ pathname: '/(app)/hearth', params: { category } });
  };

  const renderAlignmentRow = (alignment: CategoryAlignment, index: number) => {
    const categoryLabel = getCategoryByType(alignment.category)?.label ?? alignment.category;
    // Category-specific prompt: us.prompts.<state>.<category>, fallback to state label
    const promptKey = alignment.state === 'early'
      ? 'us.prompts.early'
      : `us.prompts.${alignment.state}.${alignment.category}`;
    const prompt = t(promptKey);
    // If the key didn't resolve (returns the key itself), fall back to state text
    const displayText = prompt !== promptKey ? prompt : t(`us.state.${alignment.state}`);
    const ctaText = t(`us.cta.${alignment.state}`);
    return (
      <Animated.View
        key={alignment.category}
        entering={FadeInUp.duration(400).delay(200 + index * 60)}
      >
        <TouchableOpacity
          style={styles.alignmentRow}
          onPress={() => !locked && openCategory(alignment.category)}
          disabled={locked}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={locked ? categoryLabel : undefined}
          testID={`us-alignment-${alignment.category}`}
        >
          <View style={styles.alignmentInfo}>
            <Text style={styles.alignmentCategory}>{categoryLabel}</Text>
            {locked ? (
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={[styles.alignmentState, styles.blurredState]}>
                  {displayText}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.alignmentState}>{displayText}</Text>
                <Text style={styles.alignmentCta}>{ctaText}</Text>
              </>
            )}
          </View>
          {!locked && <Icon name="caret-right" size="sm" color={colors.text.muted} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header — the couple, not the user */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>
            {t('us.eyebrow')}
          </Text>
          <Text style={styles.title}>{t('us.title')}</Text>

          <View style={styles.coupleRow}>
            <View style={styles.avatarPair}>
              {user.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarYou]}>
                  <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
                </View>
              )}
              {user.partnerPhotoUrl ? (
                <Image
                  source={{ uri: user.partnerPhotoUrl }}
                  style={[styles.avatar, styles.avatarOverlap]}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPartner, styles.avatarOverlap]}>
                  <Text style={styles.avatarText}>{getInitials(partnerName)}</Text>
                </View>
              )}
            </View>
            <View style={styles.coupleInfo}>
              <Text style={styles.coupleNames}>
                {t('us.you')} & {partnerName}
              </Text>
              {daysTogether != null && (
                <Text style={styles.coupleMeta}>
                  {t('us.daysTogether', { count: daysTogether })}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Monthly pulse — quick stats */}
        {monthly.answered > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.pulseRow}>
            <View style={styles.pulseItem}>
              <Text style={styles.pulseNumber}>{monthly.answered}</Text>
              <Text style={styles.pulseLabel}>answered</Text>
            </View>
            {tendedCount > 0 && (
              <View style={styles.pulseItem}>
                <Text style={styles.pulseNumber}>{tendedCount}</Text>
                <Text style={styles.pulseLabel}>tended</Text>
              </View>
            )}
            {queue.length > 0 && (
              <TouchableOpacity
                style={styles.pulseItem}
                onPress={() => router.push('/(app)/hearth')}
                activeOpacity={0.7}
              >
                <Text style={[styles.pulseNumber, { color: colors.accent.primary }]}>{queue.length}</Text>
                <Text style={[styles.pulseLabel, { color: colors.accent.primary }]}>waiting</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Category grid — the game board */}
        <Animated.View entering={FadeInUp.duration(400).delay(120)} style={styles.section}>
          <Text style={styles.sectionTitle}>Your 12 dimensions</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any tile to see the full story
          </Text>
          {premiumLoading ? (
            <View style={styles.card} testID="us-alignment-loading">
              {Array.from({ length: 3 }, (_, i) => (
                <View key={i} style={styles.alignmentRow}>
                  <View style={styles.alignmentInfo}>
                    <Skeleton width={80} height={12} style={{ marginBottom: spacing.xs }} />
                    <Skeleton width={180} height={16} />
                  </View>
                </View>
              ))}
            </View>
          ) : radarData.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>{t('us.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('us.emptyBody')}</Text>
            </View>
          ) : locked ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>Your dimensions are building</Text>
              <Text style={styles.emptyBody}>Unlock the full picture with Premium.</Text>
            </View>
          ) : (
            <UsGrid
              data={radarData}
              myName={t('us.you')}
              partnerName={partnerName}
              onCategoryPress={openCategory}
            />
          )}
        </Animated.View>

        {/* Locked: quiet gate line + CTA under the blurred map */}
        {locked && alignments.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.gateWrap}>
            <View style={styles.lockRow}>
              <Icon name="lock" size="sm" color={colors.text.secondary} weight="light" />
              <Text style={styles.lockedLine}>{t('gates.usViewLine')}</Text>
            </View>
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => {
                logEvent('us_view_upgrade_tapped');
                setShowPaywall(true);
              }}
              accessibilityRole="button"
              activeOpacity={0.8}
              testID="us-gate-cta"
            >
              <Text style={styles.premiumButtonText} maxFontSizeMultiplier={1.4}>
                {t('gates.seePremium')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}


        {/* What lands — reaction learning signals (v1.5 #2) */}
        {!premiumLoading && !locked && reactionSignals.outliers.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>What lands differently</Text>
            <Text style={styles.sectionSubtitle}>
              Categories where your reactions tell a different story
            </Text>
            <View style={styles.card}>
              {reactionSignals.outliers.map((outlier) => (
                <TouchableOpacity
                  key={outlier.category}
                  style={styles.alignmentRow}
                  onPress={() => openCategory(outlier.category)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={styles.alignmentInfo}>
                    <Text style={styles.alignmentCategory}>
                      {getCategoryByType(outlier.category)?.label ?? outlier.category}
                    </Text>
                    <Text style={styles.alignmentState}>
                      {REACTION_LABELS[outlier.dominant ?? 'heart']} lands here most
                      {reactionSignals.overallDominant
                        ? ` (${REACTION_LABELS[reactionSignals.overallDominant]} everywhere else)`
                        : ''}
                    </Text>
                  </View>
                  <Icon name="caret-right" size="sm" color={colors.text.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* What you tended — free, current month */}
        <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('us.tendedTitle')}</Text>
          <View style={styles.card}>
            <Text style={styles.tendedLine}>
              {tendedCount > 0
                ? t('us.tended', { count: tendedCount })
                : t('us.tendedNone')}
            </Text>
          </View>
        </Animated.View>

        {/* Side by side — free */}
        <Animated.View entering={FadeInUp.duration(400).delay(450)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('us.sideBySideTitle')}</Text>
          <View style={styles.card}>
            <Text style={styles.sideLabel}>{t('us.loveLanguageLabel')}</Text>
            <View style={styles.sideRow}>
              <View style={styles.sideCell}>
                <Text style={styles.sideName}>{t('us.you')}</Text>
                <Text style={styles.sideValue}>
                  {myLoveLanguage ?? t('us.notSet')}
                </Text>
              </View>
              <View style={styles.sideDivider} />
              <View style={styles.sideCell}>
                <Text style={styles.sideName}>{partnerName}</Text>
                <Text style={styles.sideValue}>
                  {partnerLoveLanguageLabel ?? t('us.notSet')}
                </Text>
              </View>
            </View>
            {user.loveLanguage && partnerLoveLanguage && (() => {
              const tips = getLoveLanguageTips(user.loveLanguage, partnerLoveLanguage);
              if (!tips) return null;
              return (
                <View style={styles.tipsSection}>
                  <Text style={styles.tipLabel}>How you two work</Text>
                  <Text style={styles.tipText}>{tips.theyNeed}</Text>

                  <Text style={styles.tipLabel}>Try this week</Text>
                  <Text style={styles.tipText}>{tips.tryThis}</Text>

                  <Text style={styles.tipLabel}>Watch for</Text>
                  <Text style={styles.tipText}>{tips.watchFor}</Text>
                </View>
              );
            })()}
          </View>
        </Animated.View>
      </ScrollView>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="us_view"
      />
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
    padding: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarPair: {
    flexDirection: 'row',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface.background,
  },
  avatarYou: {
    backgroundColor: colors.accent.primary,
  },
  avatarPartner: {
    backgroundColor: colors.brand.purple,
  },
  avatarOverlap: {
    marginLeft: -spacing.smd,
  },
  avatarText: {
    ...typography.h3,
    color: colors.text.inverse,
  },
  coupleInfo: {
    flex: 1,
  },
  coupleNames: {
    ...typography.h3,
    color: colors.text.primary,
  },
  coupleMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  pulseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  pulseItem: {
    alignItems: 'center',
  },
  pulseNumber: {
    ...typography.h3,
    color: colors.text.primary,
  },
  pulseLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.smd,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    ...shadow.cardSubtle,
    marginTop: spacing.sm,
  },
  alignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smd,
    gap: spacing.smd,
  },
  alignmentInfo: {
    flex: 1,
  },
  alignmentCategory: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  alignmentState: {
    ...typography.body,
    color: colors.text.primary,
  },
  alignmentCta: {
    ...typography.caption,
    color: colors.accent.primary,
    marginTop: 4,
  },
  blurredState: {
    // Blur: transparent glyphs, soft shadow where the text sits — the same
    // treatment as the locked follow-up question.
    color: 'transparent',
    textShadowColor: colors.text.muted,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  gateWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedLine: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  premiumButton: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  premiumButtonText: {
    ...typography.btn,
    color: colors.accent.primary,
  },
  tendedLine: {
    ...typography.body,
    color: colors.text.primary,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sideLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sideCell: {
    flex: 1,
  },
  sideDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.md,
  },
  sideName: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  sideValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  tipsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    gap: spacing.smd,
  },
  tipLabel: {
    ...typography.caption,
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
  },
  tipText: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
});
