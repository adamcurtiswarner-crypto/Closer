import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { getMilestoneStatus, type MilestoneCheckData } from '@/config/milestones';
import { AnimatedProgressBar } from './AnimatedProgressBar';

interface MilestoneBadgesProps {
  data: MilestoneCheckData;
  animationDelay?: number;
}

export function MilestoneBadges({ data, animationDelay = 600 }: MilestoneBadgesProps) {
  const { achieved, next } = getMilestoneStatus(data);

  if (achieved.length === 0 && !next) return null;

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(animationDelay)} style={styles.container}>
      <Text style={styles.sectionTitle}>Your story so far</Text>

      {achieved.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {achieved.map((milestone) => (
            <View key={milestone.id} style={styles.badge}>
              <Text style={styles.badgeIcon}>{milestone.icon}</Text>
              <Text style={styles.badgeTitle}>{milestone.title}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {next && (
        <View style={styles.nextCard}>
          <View style={styles.nextHeader}>
            <Text style={styles.nextIcon}>{next.icon}</Text>
            <View style={styles.nextInfo}>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextDescription}>
                {next.current} of {next.threshold} {next.field === 'totalCompletions' ? 'prompts' : next.field === 'longestStreak' ? 'days' : next.field === 'daysAsCouple' ? 'days' : 'saved'}
              </Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={next.current / next.threshold}
            color="#c97454"
            trackColor="#f5f5f4"
            height={6}
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 12,
  },
  badgeRow: {
    gap: 8,
    paddingBottom: 4,
  },
  badge: {
    backgroundColor: '#fef5f0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#c97454',
  },
  nextCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  nextIcon: {
    fontSize: 24,
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
