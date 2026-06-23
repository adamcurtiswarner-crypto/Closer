import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@config/theme';
import { ToneShapes } from '@components';

const GUESS_OPTIONS = [
  'Work has been a lot lately',
  'Feeling emotional',
  "Didn't sleep well",
  'Something else',
] as const;

type GuessOption = (typeof GUESS_OPTIONS)[number];

interface PartnerGuessProps {
  readonly word?: string;
  readonly onGuess?: (guess: string) => void;
  readonly isGuessing?: boolean;
}

export function PartnerGuess({ word = 'Heavy', onGuess, isGuessing }: PartnerGuessProps) {
  const [selected, setSelected] = useState<GuessOption | null>(null);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Partner received your word</Text>
        <Text style={styles.headline}>{'What do you\nthink they meant?'}</Text>
        <Text style={styles.body}>One guess — they'll reveal after.</Text>
      </View>

      {/* Word reveal card */}
      <View style={styles.wordCard}>
        <ToneShapes variant="black" />
        <Text style={styles.wordCardEyebrow}>They sent this morning</Text>
        <Text style={styles.wordDisplay}>{word}</Text>
        <Text style={styles.wordTimestamp}>8:14 am · pick a reason below</Text>
      </View>

      {/* Guess options */}
      <View style={styles.optionsContainer}>
        <Text style={styles.optionsLabel}>Why do you think?</Text>
        {GUESS_OPTIONS.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionRow,
                isSelected ? styles.optionRowSelected : styles.optionRowDefault,
              ]}
              onPress={() => setSelected(option)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <View
                style={[
                  styles.radio,
                  isSelected ? styles.radioSelected : styles.radioDefault,
                ]}
              >
                {isSelected && <View style={styles.radioDot} />}
              </View>
              <Text
                style={[
                  styles.optionText,
                  isSelected ? styles.optionTextSelected : styles.optionTextDefault,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Submit button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, (!selected || isGuessing) && styles.submitButtonDisabled]}
          onPress={() => selected && onGuess?.(selected)}
          disabled={!selected || isGuessing}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>{isGuessing ? 'Submitting...' : 'Submit guess'}</Text>
        </TouchableOpacity>
      </View>

      {/* Helper text */}
      <Text style={styles.helperText}>They reveal after you guess</Text>
    </ScrollView>
  );
}

const RADIO_SIZE = 15;
const RADIO_DOT_SIZE = 7;
const RADIO_BORDER_WIDTH = 2;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.section,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  headline: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Word card
  wordCard: {
    backgroundColor: colors.text.primary,
    borderRadius: radius.xl,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.section,
    paddingVertical: spacing.lg,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  wordCardEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: spacing.sm,
  },
  wordDisplay: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 52,
    color: colors.text.inverse,
    letterSpacing: -2,
    marginBottom: spacing.xs,
  },
  wordTimestamp: {
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },

  // Options
  optionsContainer: {
    paddingHorizontal: spacing.screen,
  },
  optionsLabel: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.choice,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    marginBottom: spacing.itemGap,
  },
  optionRowDefault: {
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  optionRowSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primaryLight,
  },

  // Radio
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: RADIO_BORDER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioDefault: {
    borderColor: colors.text.muted,
  },
  radioSelected: {
    borderColor: colors.accent.primary,
  },
  radioDot: {
    width: RADIO_DOT_SIZE,
    height: RADIO_DOT_SIZE,
    borderRadius: RADIO_DOT_SIZE / 2,
    backgroundColor: colors.accent.primary,
  },

  // Option text
  optionText: {
    ...typography.body,
    flex: 1,
  },
  optionTextDefault: {
    color: colors.text.primary,
  },
  optionTextSelected: {
    color: colors.accent.primary,
  },

  // Submit
  submitContainer: {
    paddingHorizontal: spacing.screen,
    marginTop: spacing.section,
  },
  submitButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.btn,
    color: colors.text.inverse,
  },

  // Helper
  helperText: {
    ...typography.eyebrow,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
