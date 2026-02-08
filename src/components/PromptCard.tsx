import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PromptCardProps {
  promptText: string;
  promptHint?: string | null;
  promptType: string;
  onRespond?: () => void;
  showRespondButton?: boolean;
}

export function PromptCard({
  promptText,
  promptHint,
  promptType,
  onRespond,
  showRespondButton = true,
}: PromptCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.promptText}>{promptText}</Text>

      {promptHint && (
        <Text style={styles.hint}>{promptHint}</Text>
      )}

      {showRespondButton && onRespond && (
        <TouchableOpacity
          onPress={onRespond}
          style={styles.button}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Respond</Text>
        </TouchableOpacity>
      )}
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
  promptText: {
    color: '#1c1917',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 28,
  },
  hint: {
    color: '#78716c',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
});
