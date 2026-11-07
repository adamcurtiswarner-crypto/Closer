import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getCategoryByType } from '@/config/promptCategories';
import type { RadarCategoryPoint } from '@/utils/alignment';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

const SCORE_MIN = 1;
const SCORE_MAX = 10;
const GUIDE_RINGS = [3, 5, 7, 9];
const LABEL_PADDING = 48;

interface AlignmentRadarProps {
  data: RadarCategoryPoint[];
  myName: string;
  partnerName: string;
  onCategoryPress?: (category: string) => void;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

function scoreToRadius(score: number, maxRadius: number): number {
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  return ((clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * maxRadius;
}

/** Short label that fits the radar perimeter. */
function shortLabel(cat: string): string {
  const labels: Record<string, string> = {
    communication: 'Comm',
    intimacy: 'Intimacy',
    affection: 'Affection',
    money: 'Money',
    family: 'Family',
    friends: 'Friends',
    fun_play: 'Fun',
    future_dreams: 'Dreams',
    everyday_life: 'Daily life',
    conflict_repair: 'Conflict',
    appreciation_trust: 'Trust',
    growth_independence: 'Growth',
  };
  return labels[cat] || getCategoryByType(cat)?.label || cat;
}

/**
 * Radar / spider chart showing per-category averages for each partner.
 * Two overlapping semi-transparent polygons (coral = me, purple = partner)
 * with concentric guide rings and category labels around the perimeter.
 */
export function AlignmentRadar({
  data,
  myName,
  partnerName,
  onCategoryPress,
}: AlignmentRadarProps) {
  const [size, setSize] = useState(0);
  const n = data.length;

  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) - LABEL_PADDING;
  const angleStep = (2 * Math.PI) / n;

  const buildPolygon = (accessor: (d: RadarCategoryPoint) => number): string =>
    data
      .map((d, i) => {
        const r = scoreToRadius(accessor(d), maxR);
        const { x, y } = polarToCartesian(cx, cy, r, i * angleStep);
        return `${x},${y}`;
      })
      .join(' ');

  const myPoints = buildPolygon((d) => d.myAvg);
  const partnerPoints = buildPolygon((d) => d.partnerAvg);

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      <View style={styles.card}>
        <View
          style={styles.chartWrap}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && w !== size) setSize(w);
          }}
        >
          {size > 0 && maxR > 20 && (
            <Svg width={size} height={size}>
              {/* Guide rings */}
              {GUIDE_RINGS.map((ringScore) => {
                const r = scoreToRadius(ringScore, maxR);
                return (
                  <Circle
                    key={ringScore}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={colors.border.default}
                    strokeWidth={0.5}
                    strokeDasharray="3,3"
                  />
                );
              })}

              {/* Spoke lines */}
              {data.map((_, i) => {
                const { x, y } = polarToCartesian(cx, cy, maxR, i * angleStep);
                return (
                  <Line
                    key={`spoke-${i}`}
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke={colors.border.default}
                    strokeWidth={0.5}
                  />
                );
              })}

              {/* Partner polygon (behind) */}
              <Polygon
                points={partnerPoints}
                fill={colors.brand.purple}
                fillOpacity={0.15}
                stroke={colors.brand.purple}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* My polygon (in front) */}
              <Polygon
                points={myPoints}
                fill={colors.accent.primary}
                fillOpacity={0.15}
                stroke={colors.accent.primary}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* Score dots at each vertex */}
              {data.map((d, i) => {
                const myR = scoreToRadius(d.myAvg, maxR);
                const partnerR = scoreToRadius(d.partnerAvg, maxR);
                const myPos = polarToCartesian(cx, cy, myR, i * angleStep);
                const partnerPos = polarToCartesian(cx, cy, partnerR, i * angleStep);
                return (
                  <React.Fragment key={`dots-${i}`}>
                    <Circle
                      cx={partnerPos.x}
                      cy={partnerPos.y}
                      r={3}
                      fill={colors.brand.purple}
                    />
                    <Circle
                      cx={myPos.x}
                      cy={myPos.y}
                      r={3}
                      fill={colors.accent.primary}
                    />
                  </React.Fragment>
                );
              })}

              {/* Category labels — rendered as short names around perimeter */}
              {data.map((d, i) => {
                const labelR = maxR + 16;
                const angle = i * angleStep;
                const { x, y } = polarToCartesian(cx, cy, labelR, angle);
                const isLeft = Math.sin(angle) < -0.1;
                const isRight = Math.sin(angle) > 0.1;
                const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
                // Nudge top/bottom labels vertically
                const isTop = Math.cos(angle) > 0.5;
                const isBottom = Math.cos(angle) < -0.5;
                const yOffset = isTop ? -4 : isBottom ? 12 : 4;

                return (
                  <SvgText
                    key={`label-${i}`}
                    x={x}
                    y={y + yOffset}
                    textAnchor={anchor}
                    fontSize={11}
                    fontWeight="600"
                    fill={colors.text.secondary}
                  >
                    {shortLabel(d.category)}
                  </SvgText>
                );
              })}
            </Svg>
          )}
        </View>

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

        {/* Tappable category chips for detail navigation */}
        {onCategoryPress && (
          <View style={styles.chipRow}>
            {data.map((d) => {
              const gap = Math.abs(d.myAvg - d.partnerAvg);
              const isApart = gap >= 2;
              return (
                <TouchableOpacity
                  key={d.category}
                  style={[styles.chip, isApart && styles.chipApart]}
                  onPress={() => onCategoryPress(d.category)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.chipText, isApart && styles.chipTextApart]}
                    numberOfLines={1}
                  >
                    {getCategoryByType(d.category)?.label ?? d.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    ...shadow.cardSubtle,
  },
  chartWrap: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 280,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.smd,
    minHeight: 28,
    justifyContent: 'center',
  },
  chipApart: {
    backgroundColor: colors.accent.primaryLight,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  chipTextApart: {
    color: colors.accent.primary,
  },
});
