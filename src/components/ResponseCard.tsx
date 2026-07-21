import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '@/config/theme';
interface ResponseCardProps {
  label: string;
  responseText: string;
  imageUrl?: string | null;
  isYours?: boolean;
}

export function ResponseCard({
  label,
  responseText,
  imageUrl,
  isYours = false,
}: ResponseCardProps) {
  return (
    <View style={[styles.card, isYours ? styles.yoursCard : styles.partnersCard]}>
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, isYours ? styles.yoursDot : styles.partnersDot]} />
        <Text style={[styles.label, isYours ? styles.yoursLabel : styles.partnersLabel]}>
          {label}
        </Text>
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
