import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@config/theme';
import { ToneShapes } from '@components';

const WORDS = [
  'Heavy',
  'Bright',
  'Tired',
  'Cozy',
  'Full',
  'Soft',
  'Wired',
  'Still',
] as const;

interface TodaySparkProps {
  readonly onSend?: (word: string) => void;
  readonly isSending?: boolean;
}

export function TodaySpark({ onSend, isSending }: TodaySparkProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  const handleChipPress = (word: string) => {
    setCustomText('');
    setSelectedWord(selectedWord === word ? null : word);
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    if (text.length > 0) {
      setSelectedWord(null);
    }
  };

  const activeWord = customText.length > 0 ? customText : selectedWord;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Hero Card */}
      <View style={styles.hero}>
        <ToneShapes variant="coral" />
        <Text style={styles.eyebrow}>Engine 2 · Action</Text>
        <Text style={styles.headline}>{"Today's\nSpark."}</Text>
        <Text style={styles.body}>
          {"Send one word for how today feels.\nYour partner guesses why."}
        </Text>
      </View>

      {/* Word Grid Section */}
      <View style={styles.gridSection}>
        <Text style={styles.gridLabel}>Pick your word</Text>

        <View style={styles.grid}>
          {WORDS.map((word) => {
            const isSelected = selectedWord === word && customText.length === 0;
            return (
              <TouchableOpacity
                key={word}
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                onPress={() => handleChipPress(word)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Or type your own word..."
          placeholderTextColor={colors.text.muted}
          value={customText}
          onChangeText={handleCustomChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Send Button */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.sendButton, (!activeWord || isSending) && styles.sendButtonDisabled]}
          activeOpacity={0.8}
          disabled={!activeWord || isSending}
          onPress={() => activeWord && onSend?.(activeWord)}
        >
          <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send to Partner'}</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          They'll guess why — you reveal after
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  content: {
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    backgroundColor: colors.accent.primary,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  eyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 28,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.72)',
  },

  // Grid section
  gridSection: {
    backgroundColor: colors.surface.card,
    padding: spacing.screen,
  },
  gridLabel: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    width: '31%',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface.background,
  },
  chipText: {
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    fontSize: 10,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  chipTextUnselected: {
    color: colors.text.secondary,
  },

  // Custom input
  input: {
    backgroundColor: colors.surface.background,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.input,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    fontSize: 10,
    color: colors.text.primary,
  },

  // Button section
  buttonSection: {
    paddingHorizontal: spacing.screen,
  },
  sendButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  helperText: {
    ...typography.eyebrow,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
