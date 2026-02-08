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
      <Text style={[styles.label, isYours ? styles.yoursLabel : styles.partnersLabel]}>
        {label}
      </Text>
      <Text style={styles.responseText}>{responseText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
  },
  yoursCard: {
    backgroundColor: '#fafaf9',
  },
  partnersCard: {
    backgroundColor: '#fdf8f6',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
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
