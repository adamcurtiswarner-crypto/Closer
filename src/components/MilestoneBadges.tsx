import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { getBadgeStatus, type BadgeCheckData, type BadgeDefinition, type BadgeTier } from '@/config/milestones';
import { Icon } from './Icon';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { colors } from '@/config/theme';

interface MilestoneBadgesProps {
  data: BadgeCheckData;
  animationDelay?: number;
}

const TIER_COLORS: Record<BadgeTier, { fill: string; tint: string; border: string }> = colors.badgeTier;

function BadgeSquircle({ badge, isEarned, isAlmostThere }: {
  badge: BadgeDefinition & { progress: number };
  isEarned: boolean;
  isAlmostThere: boolean;
}) {
  const tier = TIER_COLORS[badge.tier];

  if (isEarned) {
    return (
      <View style={styles.badgeWrapper}>
        <View style={[styles.squircle, {
          backgroundColor: tier.fill,
          borderWidth: 1.5,
          borderColor: tier.border,
          shadowColor: tier.tint,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }]}>
          <Icon name={badge.icon} size={28} color={tier.tint} weight={badge.iconWeight} />
        </View>
        <Text style={styles.badgeLabel} numberOfLines={2}>{badge.title}</Text>
      </View>
    );
  }

  if (isAlmostThere) {
    return (
      <View style={styles.badgeWrapper}>
        <View style={[styles.squircle, {
          backgroundColor: tier.fill + '4D', // 30% opacity
          borderWidth: 1.5,
          borderColor: tier.border + '80', // 50% opacity
          borderStyle: 'dashed' as any,
        }]}>
          <Icon name={badge.icon} size={28} color={tier.tint + '66'} weight={badge.iconWeight} />
        </View>
        <Text style={[styles.badgeLabel, styles.badgeLabelMuted]} numberOfLines={2}>{badge.title}</Text>
      </View>
    );
  }

  // Locked
  return (
    <View style={styles.badgeWrapper}>
      <View style={[styles.squircle, styles.squircleLocked]}>
        <Icon name="lock" size={18} color="#d6d3d1" weight="light" />
      </View>
    </View>
  );
}

const FIELD_LABELS: Record<string, string> = {
  totalCompletions: 'prompts',
  longestStreak: 'days',
  daysAsCouple: 'days',
  dateNightsCompleted: 'dates',
  wishlistItemsFulfilled: 'wishes',
  checkInsCompleted: 'check-ins',
  memoriesSaved: 'saved',
};

export function MilestoneBadges({ data, animationDelay = 600 }: MilestoneBadgesProps) {
  const { earned, locked, next } = getBadgeStatus(data);
  const total = earned.length + locked.length;

  if (total === 0) return null;

  // Show earned badges + almost-there (>= 50% progress) locked badges
  const almostThere = locked.filter((b) => b.progress >= 0.5);
  const displayBadges = [...earned, ...almostThere];

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(animationDelay)} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your story so far</Text>
        <Text style={styles.countLabel}>{earned.length} of {total}</Text>
      </View>

      {/* Badge grid */}
      {displayBadges.length > 0 && (
        <View style={styles.badgeGrid}>
          {displayBadges.map((badge, i) => (
            <Animated.View key={badge.id} entering={FadeIn.duration(300).delay(animationDelay + 40 * i)}>
              <BadgeSquircle
                badge={badge}
                isEarned={badge.progress >= 1}
                isAlmostThere={badge.progress >= 0.5 && badge.progress < 1}
              />
            </Animated.View>
          ))}
        </View>
      )}

      {/* Next up card */}
      {next && (
        <View style={styles.nextCard}>
          <View style={styles.nextRow}>
            <View style={[styles.squircleSmall, {
              backgroundColor: TIER_COLORS[next.tier].fill,
              borderWidth: 1,
              borderColor: TIER_COLORS[next.tier].border,
            }]}>
              <Icon name={next.icon} size={20} color={TIER_COLORS[next.tier].tint} weight={next.iconWeight} />
            </View>
            <View style={styles.nextInfo}>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextDescription}>
                {next.current} of {next.threshold} {FIELD_LABELS[next.field] || ''}
              </Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={next.current / next.threshold}
            color={TIER_COLORS[next.tier].tint}
            trackColor="#f5f5f4"
            height={4}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
  },
  countLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeWrapper: {
    alignItems: 'center',
    width: 56,
  },
  squircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squircleLocked: {
    backgroundColor: '#f5f5f4',
    opacity: 0.6,
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#57534e',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 64,
  },
  badgeLabelMuted: {
    color: '#a8a29e',
  },
  squircleSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  nextInfo: {
    flex: 1,
  },
  nextTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
  },
  nextDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 2,
  },
});
