import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@config/theme';
import { ToneShapes } from '@components';

interface MomentumBar {
  readonly label: string;
  readonly percent: number;
  readonly color: string;
}

const MOMENTUM_BARS: readonly MomentumBar[] = [
  { label: 'Laughter', percent: 78, color: colors.accent.primary },
  { label: 'Curiosity', percent: 91, color: '#1E1E2E' },
  { label: 'Play', percent: 52, color: colors.brand.purple },
] as const;

export function CoachInsights() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Engine 4 · Coach</Text>
        <Text style={styles.headline}>{"I've been\nwatching."}</Text>
        <Text style={styles.body}>Patterns take time. Here's what I see.</Text>
      </View>

      {/* Main insight card */}
      <View style={styles.insightCard}>
        <ToneShapes variant="coral" />
        <Text style={styles.insightEyebrow}>Tonight</Text>
        <Text style={styles.insightHeadline}>{'Skip the deep talk.\nOrder dessert.'}</Text>
        <Text style={styles.insightBody}>
          You've both been running on empty for 5 days. Tonight isn't the night.
        </Text>
      </View>

      {/* Stat card */}
      <View style={styles.statCard}>
        <ToneShapes variant="black" />
        <Text style={styles.statEyebrow}>Laughter lifts connection</Text>
        <Text style={styles.statNumber}>+22%</Text>
        <Text style={styles.statSubtext}>the morning after you laugh together</Text>
      </View>

      {/* Momentum bars */}
      <View style={styles.momentumSection}>
        <Text style={styles.momentumEyebrow}>This week's momentum</Text>
        {MOMENTUM_BARS.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${bar.percent}%`, backgroundColor: bar.color },
                ]}
              />
            </View>
            <Text style={[styles.barPercent, { color: bar.color }]}>
              {bar.percent}%
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  content: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.section,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Main insight card
  insightCard: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPad,
    marginHorizontal: spacing.screen,
    marginTop: spacing.section,
    overflow: 'hidden',
  },
  insightEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: spacing.sm,
  },
  insightHeadline: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  insightBody: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
  },

  // Stat card
  statCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: radius.card,
    padding: spacing.section,
    marginHorizontal: spacing.screen,
    marginTop: spacing.section,
    overflow: 'hidden',
  },
  statEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 38,
    color: colors.accent.primary,
    marginBottom: spacing.xs,
  },
  statSubtext: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },

  // Momentum bars
  momentumSection: {
    paddingHorizontal: spacing.screen,
    marginTop: spacing.lg,
  },
  momentumEyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barLabel: {
    width: 66,
    fontSize: 9,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface.background,
    borderRadius: 3,
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  barPercent: {
    width: 32,
    textAlign: 'right',
    fontSize: 9,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
  },
});
