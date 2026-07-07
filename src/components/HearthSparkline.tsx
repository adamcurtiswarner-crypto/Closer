import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { format } from 'date-fns';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import type { TrendPoint } from '@/hooks/useHearth';

const CHART_HEIGHT = 56;
const CHART_PAD = 6;
const SCORE_MIN = 1;
const SCORE_MAX = 10;

function formatValue(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

interface HearthSparklineProps {
  /** Chronological per-completion score averages (last up to 10). */
  series: TrendPoint[];
}

/**
 * Quiet score-trend card: single coral polyline, endpoint dot with the
 * endpoint value in ink, first/last date captions. No legend, no gridlines.
 */
export function HearthSparkline({ series }: HearthSparklineProps) {
  const [chartWidth, setChartWidth] = useState(0);

  if (series.length < 2) return null;

  const xFor = (index: number) =>
    CHART_PAD + (index * (chartWidth - CHART_PAD * 2)) / (series.length - 1);
  const yFor = (value: number) =>
    CHART_PAD +
    ((SCORE_MAX - value) / (SCORE_MAX - SCORE_MIN)) * (CHART_HEIGHT - CHART_PAD * 2);

  const points = series.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(' ');
  const last = series[series.length - 1];
  const first = series[0];

  return (
    <View style={styles.card} testID="hearth-sparkline">
      <View style={styles.chartRow}>
        <View
          style={styles.chartArea}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Polyline
                points={points}
                fill="none"
                stroke={colors.accent.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle
                cx={xFor(series.length - 1)}
                cy={yFor(last.value)}
                r={3.5}
                fill={colors.accent.primary}
              />
            </Svg>
          )}
        </View>
        <Text style={styles.endValue} maxFontSizeMultiplier={1.4}>
          {formatValue(last.value)}
        </Text>
      </View>
      <View style={styles.captionRow}>
        <Text style={styles.caption} maxFontSizeMultiplier={1.4}>
          {format(first.date, 'MMM d')}
        </Text>
        <Text style={styles.caption} maxFontSizeMultiplier={1.4}>
          {format(last.date, 'MMM d')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    gap: spacing.sm,
    ...shadow.cardSubtle,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
  },
  endValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caption: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
