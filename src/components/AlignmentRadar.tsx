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
const LABEL_OFFSET = 18;

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
  const maxR = (size / 2) - 40; // leave room for labels
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

  // Short labels for tight spaces
  const shortLabel = (cat: string): string => {
    const full = getCategoryByType(cat)?.label ?? cat;
    // Truncate to first word if > 10 chars for radar fit
    if (full.length <= 10) return full;
    const words = full.split(' ');
    return words.length > 1 ? words[0] : full.substring(0, 9);
  };

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      <View style={styles.card}>
        <View
          style={styles.chartWrap}
          onLayout={(e) => setSize(e.nativeEvent.layout.width)}
        >
          {size > 0 && (
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

              {/* Category labels */}
              {data.map((d, i) => {
                const labelR = maxR + LABEL_OFFSET;
                const { x, y } = polarToCartesian(cx, cy, labelR, i * angleStep);
                // Determine text anchor based on position
                const angle = i * angleStep;
                const isLeft = Math.sin(angle) < -0.1;
                const isRight = Math.sin(angle) > 0.1;
                const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';

                return (
                  <SvgText
                    key={`label-${i}`}
                    x={x}
                    y={y + 4}
                    textAnchor={anchor}
                    fontSize={10}
                    fontFamily="Nunito-SemiBold"
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
