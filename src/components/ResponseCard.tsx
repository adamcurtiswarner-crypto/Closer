import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '@/config/theme';
interface ResponseCardProps {
  label: string;
  responseText: string;
  imageUrl?: string | null;
  isYours?: boolean;
  /**
   * The 1-10 score given with this answer, shown quietly beside the name.
   * Only passed where the score is the point — the follow-up source block,
   * where the gap between the two is what produced the question. The reveal
   * has its own score choreography and does not pass it.
   */
  score?: number | null;
}

export function ResponseCard({
  label,
  responseText,
  imageUrl,
  isYours = false,
  score = null,
}: ResponseCardProps) {
  return (
    <View style={[styles.card, isYours ? styles.yoursCard : styles.partnersCard]}>
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, isYours ? styles.yoursDot : styles.partnersDot]} />
        <Text style={[styles.label, isYours ? styles.yoursLabel : styles.partnersLabel]}>
          {label}
        </Text>
        {typeof score === 'number' && (
          <Text
            style={[styles.score, isYours ? styles.yoursLabel : styles.partnersLabel]}
            accessibilityLabel={`scored ${score} out of 10`}
          >
            {score}
          </Text>
        )}
      </View>
      <Text style={styles.responseText}>{responseText}</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.responseImage} resizeMode="cover" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: spacing.md,
  },
  yoursCard: {
    backgroundColor: colors.surface.background,
  },
  partnersCard: {
    backgroundColor: colors.surface.warmTint,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  yoursDot: {
    backgroundColor: colors.text.muted,
  },
  partnersDot: {
    backgroundColor: colors.accent.primary,
  },
  label: {
    ...typography.caption,
  },
  score: {
    ...typography.caption,
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
  yoursLabel: {
    color: colors.text.secondary,
  },
  partnersLabel: {
    color: colors.accent.primary,
  },
  responseText: {
    color: colors.text.primary,
    ...typography.bodyLg,
  },
  responseImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: spacing.smd,
  },
});
