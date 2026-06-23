import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface RelationshipStatsProps {
  daysAsCouple: number;
  totalCompletions: number;
  longestStreak: number;
  warmText?: string;
  animationDelay?: number;
}

function StatColumn({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statColumn}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function RelationshipStats({
  daysAsCouple,
  totalCompletions,
  longestStreak,
  warmText,
  animationDelay = 200,
}: RelationshipStatsProps) {
  return (
    <Animated.View entering={FadeInUp.duration(500).delay(animationDelay)} style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.statsRow}>
        <StatColumn value={daysAsCouple} label="days together" />
        <View style={styles.divider} />
        <StatColumn value={totalCompletions} label="prompts shared" />
        <View style={styles.divider} />
        <StatColumn value={longestStreak} label="best streak" />
      </View>
      {warmText ? <Text style={styles.warmText}>{warmText}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginHorizontal: 20,
  },
  accentBar: {
    height: 3,
    backgroundColor: '#D4522A',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Nunito-Black',
    fontWeight: '600',
    color: '#1E1E2E',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2DED8',
  },
  warmText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    fontStyle: 'italic',
  },
});
