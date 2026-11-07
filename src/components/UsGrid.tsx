import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { getCategoryByType } from '@/config/promptCategories';
import type { RadarCategoryPoint } from '@/utils/alignment';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface UsGridProps {
  data: RadarCategoryPoint[];
  myName: string;
  partnerName: string;
  onCategoryPress?: (category: string) => void;
}

const CATEGORY_ICONS: Record<string, IconName> = {
  communication: 'chat-circle',
  intimacy: 'flame',
  affection: 'heart',
  money: 'coins',
  family: 'house-simple',
  friends: 'users',
  fun_play: 'game-controller',
  future_dreams: 'path',
  everyday_life: 'coffee',
  conflict_repair: 'bandaids',
  appreciation_trust: 'handshake',
  growth_independence: 'plant',
};

/** Map a 1-10 average to a color representing the "health" of this dimension. */
function levelColor(avg: number): string {
  if (avg >= 8) return colors.semantic.success;
  if (avg >= 6) return colors.brand.green;
  if (avg >= 4) return '#D4A03A'; // warm amber
  return colors.accent.primary; // coral — needs attention
}

/** Short status word based on combined avg + gap */
function statusWord(myAvg: number, partnerAvg: number): string {
  const combined = (myAvg + partnerAvg) / 2;
  const gap = Math.abs(myAvg - partnerAvg);

  if (gap >= 2.5) return 'Split';
  if (combined >= 8.5) return 'Strong';
  if (combined >= 7) return 'Good';
  if (combined >= 5.5) return 'Growing';
  return 'Tender';
}

function ScoreBar({ score, color, maxWidth }: { score: number; color: string; maxWidth: number }) {
  const pct = Math.max(0.08, (score - 1) / 9); // 1-10 mapped to 8%-100%
  return (
    <View style={[barStyles.track, { width: maxWidth }]}>
      <View style={[barStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});

function UsGridTile({
  point,
  myName,
  partnerName,
  onPress,
  index,
}: {
  point: RadarCategoryPoint;
  myName: string;
  partnerName: string;
  onPress?: () => void;
  index: number;
}) {
  const cat = getCategoryByType(point.category);
  const icon = CATEGORY_ICONS[point.category] || 'sparkle';
  const combined = (point.myAvg + point.partnerAvg) / 2;
  const color = levelColor(combined);
  const status = statusWord(point.myAvg, point.partnerAvg);
  const gap = Math.abs(point.myAvg - point.partnerAvg);

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(80 + index * 40)}>
      <TouchableOpacity
        style={styles.tile}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {/* Icon + status badge */}
        <View style={styles.tileHeader}>
          <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
            <Icon name={icon} size="sm" color={color} weight="bold" />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.statusText, { color }]}>{status}</Text>
          </View>
        </View>

        {/* Category name */}
        <Text style={styles.tileName} numberOfLines={1}>
          {cat?.label ?? point.category}
        </Text>

        {/* Score bars — side by side */}
        <View style={styles.barsSection}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>{myName.substring(0, 1)}</Text>
            <View style={styles.barWrap}>
              <ScoreBar score={point.myAvg} color={colors.accent.primary} maxWidth={80} />
            </View>
            <Text style={styles.barScore}>{point.myAvg.toFixed(1)}</Text>
          </View>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>{partnerName.substring(0, 1)}</Text>
            <View style={styles.barWrap}>
              <ScoreBar score={point.partnerAvg} color={colors.brand.purple} maxWidth={80} />
            </View>
            <Text style={styles.barScore}>{point.partnerAvg.toFixed(1)}</Text>
          </View>
        </View>

        {/* Gap indicator for "split" categories */}
        {gap >= 2 && (
          <Text style={styles.gapHint}>
            {gap.toFixed(1)} apart
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function UsGrid({ data, myName, partnerName, onCategoryPress }: UsGridProps) {
  if (data.length === 0) return null;

  // Sort: highest-gap first (most interesting), then by combined score ascending
  const sorted = [...data].sort((a, b) => {
    const gapA = Math.abs(a.myAvg - a.partnerAvg);
    const gapB = Math.abs(b.myAvg - b.partnerAvg);
    if (gapB !== gapA) return gapB - gapA;
    return ((a.myAvg + a.partnerAvg) / 2) - ((b.myAvg + b.partnerAvg) / 2);
  });

  return (
    <View style={styles.grid}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
          <Text style={styles.legendText}>{myName}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.brand.purple }]} />
          <Text style={styles.legendText}>{partnerName}</Text>
        </View>
      </View>

      {/* 2-column grid */}
      <View style={styles.gridRow}>
        {sorted.map((point, i) => (
          <View key={point.category} style={styles.gridCell}>
            <UsGridTile
              point={point}
              myName={myName}
              partnerName={partnerName}
              onPress={onCategoryPress ? () => onCategoryPress(point.category) : undefined}
              index={i}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCell: {
    width: '48%',
    flexGrow: 1,
  },
  tile: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.smd,
    ...shadow.cardSubtle,
    minHeight: 140,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.caption,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tileName: {
    ...typography.bodySm,
    color: colors.text.primary,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  barsSection: {
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barLabel: {
    ...typography.caption,
    color: colors.text.muted,
    width: 12,
    fontSize: 10,
  },
  barWrap: {
    flex: 1,
  },
  barScore: {
    ...typography.caption,
    color: colors.text.secondary,
    width: 24,
    textAlign: 'right',
    fontSize: 10,
  },
  gapHint: {
    ...typography.caption,
    color: colors.accent.primary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
