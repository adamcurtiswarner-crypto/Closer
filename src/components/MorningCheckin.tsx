import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '@config/theme';
import { ToneShapes } from '@components';

const CHOICES = [
  'I need encouragement',
  'I need space',
  'I need laughter',
  'I need stability',
] as const;

type Choice = (typeof CHOICES)[number];

interface MorningCheckinProps {
  readonly onDone?: (choice: Choice) => void;
  readonly isSubmitting?: boolean;
}

export function MorningCheckin({ onDone, isSubmitting }: MorningCheckinProps) {
  const [selected, setSelected] = useState<Choice | null>(null);

  const handleDone = () => {
    if (selected && onDone) {
      onDone(selected);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Engine 1 · Learn</Text>
          <Text style={styles.headline}>{'One question.\nFive seconds.'}</Text>
          <Text style={styles.body}>
            Your partner sees a forecast — not your answer.
          </Text>
        </View>

        {/* ─── Question Card ─── */}
        <View style={styles.questionCard}>
          <ToneShapes variant="black" />
          <Text style={styles.questionEyebrow}>
            Which sounds most like you today?
          </Text>
          <View style={styles.choicesContainer}>
            {CHOICES.map((choice) => {
              const isSelected = selected === choice;
              return (
                <TouchableOpacity
                  key={choice}
                  style={[
                    styles.choiceRow,
                    isSelected
                      ? styles.choiceRowSelected
                      : styles.choiceRowUnselected,
                  ]}
                  onPress={() => setSelected(choice)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.radio,
                      isSelected ? styles.radioSelected : styles.radioUnselected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text
                    style={[
                      styles.choiceText,
                      isSelected
                        ? styles.choiceTextSelected
                        : styles.choiceTextUnselected,
                    ]}
                  >
                    {choice}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Privacy Preview ─── */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>Your partner receives</Text>
          <Text style={styles.privacyText}>
            Today might be a good day to remind Alex they're not alone.
          </Text>
        </View>

        {/* ─── Done Button ─── */}
        <TouchableOpacity
          style={[styles.doneButton, (!selected || isSubmitting) && styles.doneButtonDisabled]}
          onPress={handleDone}
          disabled={!selected || isSubmitting}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.doneButtonText}>{isSubmitting ? 'Sending...' : 'Done'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ─── Header ───
  header: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // ─── Question Card ───
  questionCard: {
    backgroundColor: colors.text.primary,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    overflow: 'hidden',
    marginBottom: spacing.section,
  },
  questionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: spacing.md,
  },
  choicesContainer: {
    gap: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
    paddingVertical: 10,
    paddingHorizontal: 13,
    gap: spacing.sm,
  },
  choiceRowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  choiceRowUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  choiceText: {
    ...typography.body,
    flex: 1,
  },
  choiceTextSelected: {
    color: colors.text.inverse,
  },
  choiceTextUnselected: {
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // ─── Radio ───
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: colors.text.inverse,
  },
  radioUnselected: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.text.primary,
  },

  // ─── Privacy Preview ───
  privacyCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: spacing.lg,
  },
  privacyEyebrow: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  privacyText: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.text.secondary,
  },

  // ─── Done Button ───
  doneButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.4,
  },
  doneButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
