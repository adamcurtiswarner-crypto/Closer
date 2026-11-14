import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { scorePosition } from '@/utils/followUpSource';
import { colors, typography } from '@/config/theme';

interface ScoreGapScaleProps {
  myScore: number;
  partnerScore: number;
  partnerName: string;
  /**
   * 'strip' is the one-line collapsed form: rail and dots only, no numerals
   * or end labels, sized to sit beside a caption.
   * 'full' is the expanded form: numerals above each dot and the 1/10 ends.
   */
  variant?: 'strip' | 'full';
  /**
   * Rendered on the ink hero surface: the rail and "your" dot flip to white
   * so the pair stays legible, and the dot borders match ink instead of the
   * page background.
   */
  onInk?: boolean;
}

/**
 * Two scores on one 1-10 rail, with the distance between them filled in.
 *
 * The whole premise of a divergence follow-up is that the gap between two
 * answers is the conversation. Stating "you were 4 apart" in grey caption
 * text says it; this shows it, which is the difference between a fact and a
 * picture. The filled span is the product thesis rendered literally.
 *
 * Yours is ink, your partner's is coral — the same two-voice coding the
 * reveal already uses, so the colours mean the same thing everywhere.
 */
export function ScoreGapScale({
  myScore,
  partnerScore,
  partnerName,
  variant = 'full',
  onInk = false,
}: ScoreGapScaleProps) {
  const mine = scorePosition(myScore);
  const theirs = scorePosition(partnerScore);
  const left = Math.min(mine, theirs);
  const right = Math.max(mine, theirs);
  const full = variant === 'full';

  // React Native's style types want the `${number}%` literal, not a bare
  // string, for left/width.
  const pct = (n: number): `${number}%` => `${n * 100}%`;

  return (
    <View
      style={full ? styles.wrapFull : styles.wrapStrip}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`You scored ${myScore}, ${partnerName} scored ${partnerScore}, ${Math.abs(
        myScore - partnerScore
      )} apart on a one to ten scale`}
      testID="score-gap-scale"
    >
      <View
        style={[
          styles.rail,
          full ? styles.railFull : styles.railStrip,
          onInk && styles.railOnInk,
        ]}
      />
      <View
        style={[
          styles.span,
          full ? styles.spanFull : styles.spanStrip,
          { left: pct(left), width: pct(right - left) },
        ]}
      />

      {full && (
        <>
          <Text
            style={[
              styles.numeral,
              onInk ? styles.numeralMineOnInk : styles.numeralMine,
              { left: pct(mine) },
            ]}
          >
            {display(myScore)}
          </Text>
          <Text style={[styles.numeral, styles.numeralTheirs, { left: pct(theirs) }]}>
            {display(partnerScore)}
          </Text>
        </>
      )}

      {/* Partner first, so an exact tie leaves YOUR dot on top rather than
          hiding it under theirs. */}
      <View
        style={[
          styles.dot,
          styles.dotTheirs,
          full ? styles.dotFull : styles.dotStrip,
          onInk && styles.dotBorderOnInk,
          { left: pct(theirs) },
        ]}
      />
      <View
        style={[
          styles.dot,
          onInk ? styles.dotMineOnInk : styles.dotMine,
          full ? styles.dotFull : styles.dotStrip,
          onInk && styles.dotBorderOnInk,
          { left: pct(mine) },
        ]}
      />
    </View>
  );
}

/**
 * Daily answers are whole numbers; the Us view passes trailing averages.
 * Print an integer plainly and an average to a single decimal — never the
 * raw float, which would claim precision the ritual does not have.
 */
function display(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

const DOT_FULL = 13;
const DOT_STRIP = 10;

const styles = StyleSheet.create({
  wrapStrip: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
    minWidth: 72,
  },
  wrapFull: {
    height: 38,
    marginTop: 2,
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
  railStrip: { top: 8 },
  railFull: { top: 22 },
  span: {
    position: 'absolute',
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.accent.primary + '38',
  },
  spanStrip: { top: 7 },
  spanFull: { top: 21 },
  dot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.surface.background,
  },
  dotStrip: {
    width: DOT_STRIP,
    height: DOT_STRIP,
    borderRadius: DOT_STRIP / 2,
    top: 8 - DOT_STRIP / 2 + 1,
    marginLeft: -DOT_STRIP / 2,
  },
  dotFull: {
    width: DOT_FULL,
    height: DOT_FULL,
    borderRadius: DOT_FULL / 2,
    top: 22 - DOT_FULL / 2 + 1,
    marginLeft: -DOT_FULL / 2,
  },
  dotMine: { backgroundColor: colors.text.primary },
  dotMineOnInk: { backgroundColor: '#FFFFFF' },
  dotBorderOnInk: { borderColor: colors.surface.ink },
  railOnInk: { backgroundColor: colors.onDark.outline },
  dotTheirs: { backgroundColor: colors.accent.primary },
  numeral: {
    position: 'absolute',
    top: 0,
    width: 40,
    marginLeft: -20,
    textAlign: 'center',
    ...typography.h3,
  },
  numeralMine: { color: colors.text.primary },
  numeralMineOnInk: { color: '#FFFFFF' },
  numeralTheirs: { color: colors.accent.primary },
});
