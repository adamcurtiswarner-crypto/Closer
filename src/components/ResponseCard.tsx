import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ResponseCardProps {
  label: string;
  responseText: string;
  isYours?: boolean;
}

export function ResponseCard({
  label,
  responseText,
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
  },
  yoursCard: {
    backgroundColor: '#fafaf9',
  },
  partnersCard: {
    backgroundColor: '#fdf8f6',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  yoursDot: {
    backgroundColor: '#a8a29e',
  },
  partnersDot: {
    backgroundColor: '#c97454',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  yoursLabel: {
    color: '#78716c',
  },
  partnersLabel: {
    color: '#b85d3f',
  },
  responseText: {
    color: '#292524',
    fontSize: 16,
    lineHeight: 24,
  },
});
