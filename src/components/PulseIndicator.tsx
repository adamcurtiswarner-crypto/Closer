import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Icon } from './Icon';

interface PulseIndicatorProps {
  score: number;
  tier: string;
  trend: number; // positive = improving
  history: { weekId: string; score: number }[];
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  thriving: { label: 'Thriving', color: '#22c55e' },
  steady: { label: 'Steady', color: '#ef5323' },
  cooling: { label: 'Cooling', color: '#f59e0b' },
  needs_attention: { label: 'Needs attention', color: '#ef4444' },
};

export function PulseIndicator({ score, tier, trend, history }: PulseIndicatorProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.steady;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />

      <View style={styles.header}>
        <Icon name="heartbeat" size="sm" color={config.color} weight="bold" />
        <Text style={styles.headerText}>Relationship Pulse</Text>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.scoreRow}>
        <Text style={[styles.score, { color: config.color }]}>{score}</Text>
        <View style={styles.scoreInfo}>
          <Text style={[styles.tierLabel, { color: config.color }]}>{config.label}</Text>
          {trend !== 0 && (
            <View style={styles.trendRow}>
              <Icon
                name={trend > 0 ? 'arrow-up' : 'arrow-down'}
                size="xs"
                color={trend > 0 ? '#22c55e' : '#ef4444'}
              />
              <Text style={[styles.trendText, { color: trend > 0 ? '#22c55e' : '#ef4444' }]}>
                {Math.abs(trend)} pts
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Mini 4-week trend bar */}
      {history.length > 1 && (
        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.trendBars}>
          {history
            .slice()
            .reverse()
            .map((h, i) => {
              const heightPct = Math.max(20, (h.score / 100) * 100);
              const barTier =
                h.score >= 80
                  ? 'thriving'
                  : h.score >= 60
                    ? 'steady'
                    : h.score >= 40
                      ? 'cooling'
                      : 'needs_attention';
              const barColor = TIER_CONFIG[barTier]?.color || '#ef5323';
              return (
                <View key={h.weekId} style={styles.barCol}>
                  <View style={[styles.bar, { height: heightPct * 0.4, backgroundColor: barColor }]} />
                  <Text style={styles.barLabel}>W{i + 1}</Text>
                </View>
              );
            })}
        </Animated.View>
      )}
    </Animated.View>
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
    marginBottom: 16,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    letterSpacing: -0.3,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  score: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  scoreInfo: {
    gap: 4,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 50,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  barCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  bar: {
    width: 16,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#a8a29e',
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});
