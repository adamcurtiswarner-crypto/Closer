import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { router } from 'expo-router';
import { useDateNights } from '@/hooks/useDateNights';
import { format, isPast, isToday } from 'date-fns';
import { Icon } from './Icon';

import type { DateNight } from '@/types';

import { colors, spacing, typography } from '@/config/theme';
export function DateNightCard() {
  const { data: dateNights, isLoading } = useDateNights();

  const scheduled = dateNights?.filter((d) => d.status === 'scheduled') ?? [];
  const pastDue = scheduled.filter(
    (d) => d.scheduledDate && isPast(d.scheduledDate) && !isToday(d.scheduledDate)
  );
  const upcoming = scheduled.filter(
    (d) => !d.scheduledDate || !isPast(d.scheduledDate) || isToday(d.scheduledDate)
  );

  const nextUp: DateNight | null = upcoming[0] ?? pastDue[0] ?? null;
  const hasPastDue = pastDue.length > 0;
  const isEmpty = !isLoading && (dateNights?.length ?? 0) === 0;

  const handleBrowse = () => {
    hapticImpact();
    router.push('/(app)/date-nights');
  };

  const handlePlayGames = () => {
    hapticImpact();
    router.push('/(app)/games');
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="calendar" size="sm" color={colors.accent.primary} weight="regular" />
            <Text style={styles.headerTitle}>Date Nights</Text>
          </View>
        </View>
        <View style={styles.loadingBody}>
          <View style={styles.loadingLine} />
          <View style={[styles.loadingLine, styles.loadingLineShort]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="calendar" size="sm" color={colors.accent.primary} weight="regular" />
          <Text style={styles.headerTitle}>Date Nights</Text>
        </View>
        {scheduled.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{scheduled.length} planned</Text>
          </View>
        )}
      </Animated.View>

      {/* Empty state */}
      {isEmpty && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyState}>
          <Icon name="calendar" size="lg" color={colors.accent.primary} weight="light" />
          <Text style={styles.emptyTitle}>Plan something together</Text>
          <Text style={styles.emptySubtitle}>
            Browse ideas or plan your own night out (or in).
          </Text>
        </Animated.View>
      )}

      {/* No scheduled but have saved ideas */}
      {!isEmpty && !nextUp && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyState}>
          <Icon name="calendar" size="lg" color={colors.accent.primary} weight="light" />
          <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
          <Text style={styles.emptySubtitle}>
            You have saved ideas. Pick one and set a date.
          </Text>
        </Animated.View>
      )}

      {/* Past-due nudge */}
      {hasPastDue && pastDue[0] && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity
            style={styles.nudgeRow}
            onPress={handleBrowse}
            activeOpacity={0.7}
          >
            <View style={styles.nudgeDot} />
            <View style={styles.nudgeContent}>
              <Text style={styles.nudgeTitle} numberOfLines={1}>
                How was {pastDue[0].title}?
              </Text>
              <Text style={styles.nudgeSubtitle}>
                Tap to mark it done or reschedule
              </Text>
            </View>
            <Icon name="arrow-right" size="xs" color={colors.accent.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Upcoming date night */}
      {!hasPastDue && nextUp && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity
            style={styles.upcomingRow}
            onPress={handleBrowse}
            activeOpacity={0.7}
          >
            <View style={styles.upcomingIconWrap}>
              <Icon name="calendar" size="sm" color={colors.accent.primary} weight="fill" />
            </View>
            <View style={styles.upcomingContent}>
              <Text style={styles.upcomingTitle} numberOfLines={1}>
                {nextUp.title}
              </Text>
              {nextUp.scheduledDate && (
                <Text style={styles.upcomingDate}>
                  {isToday(nextUp.scheduledDate)
                    ? 'Tonight'
                    : format(nextUp.scheduledDate, 'EEEE, MMM d')}
                </Text>
              )}
            </View>
            <Icon name="arrow-right" size="xs" color={colors.text.muted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Browse ideas / See all link */}
      <Animated.View entering={FadeIn.duration(300).delay(300)}>
        <TouchableOpacity style={styles.seeAllButton} onPress={handleBrowse} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>
            {isEmpty ? 'Browse ideas' : 'See all'}
          </Text>
          <Icon name="arrow-right" size="xs" color={colors.accent.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Play a game secondary link */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity style={styles.gameLink} onPress={handlePlayGames} activeOpacity={0.7}>
          <Icon name="game-controller" size="xs" color={colors.brand.purple} weight="regular" />
          <Text style={styles.gameLinkText}>Play a game</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Decorative footer */}
      <View style={styles.footerDots}>
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.cardPad,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  countBadge: {
    backgroundColor: colors.surface.warmTint,
    paddingVertical: 3,
    paddingHorizontal: spacing.smd,
    borderRadius: 20,
  },
  countText: {
    ...typography.caption,
    color: colors.accent.primary,
  },
  // --- Loading ---
  loadingBody: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  loadingLine: {
    height: 12,
    width: '60%',
    borderRadius: 6,
    backgroundColor: colors.border.default,
  },
  loadingLineShort: {
    width: '40%',
  },
  // --- Empty State ---
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // --- Past-due nudge ---
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  nudgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  nudgeContent: {
    flex: 1,
  },
  nudgeTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  nudgeSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  // --- Upcoming ---
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  upcomingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface.warmTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  upcomingDate: {
    ...typography.caption,
    color: colors.accent.primary,
    marginTop: 1,
  },
  // --- See All ---
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  seeAllText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  // --- Game link ---
  gameLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  gameLinkText: {
    ...typography.bodySm,
    color: colors.brand.purple,
  },
  // --- Footer ---
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
});
