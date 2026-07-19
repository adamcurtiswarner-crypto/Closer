import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { usePartnerName } from '@/hooks/usePartnerName';
import { usePartnerLoveLanguage } from '@/hooks/usePartnerLoveLanguage';
import { useSubscription } from '@/hooks/useSubscription';
import { isTended, useHearth, type HearthCompletion } from '@/hooks/useHearth';
import { deriveAlignment, movementPicks, type CategoryAlignment } from '@/utils/alignment';
import { isSameCalendarMonth, premiumGates } from '@/utils/premiumGates';
import { getCategoryByType } from '@/config/promptCategories';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { FEATURES } from '@/config/features';
import { getInitials } from '@/utils/initials';
import { Icon } from '@/components/Icon';
import { HearthSparkline } from '@/components/HearthSparkline';
import { Paywall } from '@/components/Paywall';
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

  // Repair/divergence/flagged entries both partners marked "we talked",
  // this calendar month — the free proof-of-effort line.
  const tendedCount = useMemo(
    () =>
      completions.filter(
        (c: HearthCompletion) =>
          (c.signal === 'repair' || c.signal === 'divergence' || c.couchFlagged) &&
          isTended(c) &&
          isSameCalendarMonth(c.completedAt)
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
    const stateText = t(`us.state.${alignment.state}`);
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
          testID={`us-alignment-${alignment.category}`}
        >
          <View style={styles.alignmentInfo}>
            <Text style={styles.alignmentCategory}>{categoryLabel}</Text>
            {locked ? (
              // Blurred state — visually present, unreadable, hidden from
              // screen readers so the blur cannot be bypassed.
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={[styles.alignmentState, styles.blurredState]}>
                  {stateText}
                </Text>
              </View>
            ) : (
              <Text style={styles.alignmentState}>{stateText}</Text>
            )}
          </View>
          {!locked && <Icon name="caret-right" size="sm" color={colors.text.muted} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header — the couple, not the user */}
        <Animated.View entering={FadeIn.duration(400)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            testID="us-back"
          >
            <Icon name="caret-left" size="md" color={colors.text.primary} />
          </TouchableOpacity>

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

        {/* Alignment map */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('us.alignmentTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('us.alignmentSubtitle')}</Text>
          {alignments.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>{t('us.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('us.emptyBody')}</Text>
            </View>
          ) : (
            <View style={styles.card}>{alignments.map(renderAlignmentRow)}</View>
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

        {/* Movement — premium only */}
        {!locked && movements.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('us.movementTitle')}</Text>
            {movements.map((m) => (
              <View key={m.category} style={styles.movementBlock}>
                <Text style={styles.alignmentCategory}>
                  {getCategoryByType(m.category)?.label ?? m.category}
                </Text>
                <Text style={styles.movementLine}>
                  {t(`us.movement.${m.movement}`)}
                </Text>
                <HearthSparkline series={m.gapSeries} />
              </View>
            ))}
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
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  movementBlock: {
    marginTop: spacing.smd,
    gap: spacing.xs,
  },
  movementLine: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
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
});
