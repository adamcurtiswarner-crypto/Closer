import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ResponseCard } from './ResponseCard';

interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName?: string;
}

export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName = 'Partner',
}: CompletionMomentProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>You both answered</Text>

      <Text style={styles.promptText}>"{promptText}"</Text>

      <View style={styles.responses}>
        <ResponseCard
          label="You"
          responseText={yourResponse}
          isYours={true}
        />
        <View style={styles.spacer} />
        <ResponseCard
          label={partnerName}
          responseText={partnerResponse}
          isYours={false}
        />
      </View>

      <Text style={styles.footer}>Another moment saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  header: {
    color: '#78716c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptText: {
    color: '#57534e',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  responses: {},
  spacer: {
    height: 12,
  },
  footer: {
    color: '#a8a29e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
