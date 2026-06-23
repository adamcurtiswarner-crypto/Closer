import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@config/theme';
import { ToneShapes } from '@components';

const HELPED_OPTIONS = [
  'Humor',
  'Affection',
  'Shared meal',
  'Conversation',
  'Quiet time',
  'A text',
] as const;

interface EveningReflectionProps {
  readonly onDone?: (score: number, helped: ReadonlySet<string>) => void;
  readonly isSubmitting?: boolean;
}

export function EveningReflection({ onDone, isSubmitting }: EveningReflectionProps) {
  const [score, setScore] = useState<number>(0);
  const [helped, setHelped] = useState<Set<string>>(new Set());

  const toggleHelped = (item: string) => {
    setHelped((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const handleDone = () => {
    onDone?.(score, helped);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Engine 3 · Reflect</Text>
        <Text style={styles.headline}>{'How did today\nfeel?'}</Text>
      </View>

      {/* Score card */}
      <View style={styles.scoreCard}>
        <ToneShapes variant="black" />
        <Text style={styles.scoreEyebrow}>How connected did you feel today?</Text>
        <View style={styles.heartsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setScore(n)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${n} out of 5`}
            >
              <Text style={[styles.heart, n <= score ? styles.heartFilled : styles.heartEmpty]}>
                {n <= score ? '\u2665' : '\u2661'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.scoreLabel}>
          {score > 0 ? `${score} out of 5 · Today` : 'Tap to rate · Today'}
        </Text>
      </View>

      {/* What helped today */}
      <View style={styles.helpedSection}>
        <Text style={styles.helpedEyebrow}>What helped today?</Text>
        <View style={styles.chipsWrap}>
          {HELPED_OPTIONS.map((item) => {
            const isSelected = helped.has(item);
            return (
              <Pressable
                key={item}
                onPress={() => toggleHelped(item)}
                accessibilityRole="button"
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
              >
                <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Insight card */}
      <View style={styles.insightCard}>
        <ToneShapes variant="purple" />
        <Text style={styles.insightEyebrow}>Stoke noticed</Text>
        <Text style={styles.insightText}>
          Shared meals twice a week lift your connection score 34%.
        </Text>
      </View>

      {/* Done button */}
      <Pressable
        onPress={handleDone}
        style={[styles.doneButton, isSubmitting && styles.doneButtonDisabled]}
        disabled={isSubmitting}
        accessibilityRole="button"
      >
        <Text style={styles.doneButtonText}>{isSubmitting ? 'Sending...' : 'Done for tonight'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  content: {
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
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.heading,
    color: colors.text.primary,
  },

  // Score card
  scoreCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: radius.xl,
    padding: spacing.cardPad,
    marginHorizontal: spacing.screen,
    marginTop: spacing.section,
    overflow: 'hidden',
  },
  scoreEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heart: {
    fontSize: 26,
  },
  heartFilled: {
    color: colors.accent.primary,
  },
  heartEmpty: {
    color: 'rgba(255,255,255,0.2)',
  },
  scoreLabel: {
    fontSize: 9,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
  },

  // Helped section
  helpedSection: {
    paddingHorizontal: spacing.screen,
    marginTop: spacing.lg,
  },
  helpedEyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface.background,
  },
  chipText: {
    fontSize: 9,
    fontFamily: 'Nunito-ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  chipTextUnselected: {
    color: colors.text.secondary,
  },

  // Insight card
  insightCard: {
    backgroundColor: '#3D2870',
    borderRadius: radius.card,
    padding: spacing.section,
    marginHorizontal: spacing.screen,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  insightEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  insightText: {
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 11 * 1.55,
    color: colors.text.inverse,
  },

  // Done button
  doneButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    marginHorizontal: spacing.screen,
    marginTop: spacing.lg,
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
