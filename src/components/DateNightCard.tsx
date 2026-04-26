import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { router } from 'expo-router';
import { useDateNights } from '@/hooks/useDateNights';
import { format, isPast, isToday } from 'date-fns';
import { Icon } from './Icon';

import type { DateNight } from '@/types';

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
        <View style={styles.accentBar} />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="calendar" size="sm" color="#c97454" weight="regular" />
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
      <View style={styles.accentBar} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="calendar" size="sm" color="#c97454" weight="regular" />
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
          <Icon name="calendar" size="lg" color="#c97454" weight="light" />
          <Text style={styles.emptyTitle}>Plan something together</Text>
          <Text style={styles.emptySubtitle}>
            Browse ideas or plan your own night out (or in).
          </Text>
        </Animated.View>
      )}

      {/* No scheduled but have saved ideas */}
      {!isEmpty && !nextUp && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyState}>
          <Icon name="calendar" size="lg" color="#c97454" weight="light" />
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
            <Icon name="arrow-right" size="xs" color="#c97454" />
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
              <Icon name="calendar" size="sm" color="#c97454" weight="fill" />
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
            <Icon name="arrow-right" size="xs" color="#a8a29e" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Browse ideas / See all link */}
      <Animated.View entering={FadeIn.duration(300).delay(300)}>
        <TouchableOpacity style={styles.seeAllButton} onPress={handleBrowse} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>
            {isEmpty ? 'Browse ideas' : 'See all'}
          </Text>
          <Icon name="arrow-right" size="xs" color="#c97454" />
        </TouchableOpacity>
      </Animated.View>

      {/* Play a game secondary link */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity style={styles.gameLink} onPress={handlePlayGames} activeOpacity={0.7}>
          <Icon name="game-controller" size="xs" color="#490f5f" weight="regular" />
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#fef5f0',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c97454',
  },
  // --- Loading ---
  loadingBody: {
    paddingVertical: 16,
    gap: 8,
    alignItems: 'center',
  },
  loadingLine: {
    height: 12,
    width: '60%',
    borderRadius: 6,
    backgroundColor: '#f5f5f4',
  },
  loadingLineShort: {
    width: '40%',
  },
  // --- Empty State ---
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#292524',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 18,
  },
  // --- Past-due nudge ---
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  nudgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c97454',
  },
  nudgeContent: {
    flex: 1,
  },
  nudgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292524',
  },
  nudgeSubtitle: {
    fontSize: 12,
    color: '#a8a29e',
    marginTop: 1,
  },
  // --- Upcoming ---
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  upcomingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fef5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292524',
  },
  upcomingDate: {
    fontSize: 12,
    color: '#c97454',
    fontWeight: '500',
    marginTop: 1,
  },
  // --- See All ---
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c97454',
  },
  // --- Game link ---
  gameLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  gameLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#490f5f',
  },
  // --- Footer ---
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
  },
});
