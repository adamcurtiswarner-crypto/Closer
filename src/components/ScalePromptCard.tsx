import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { ToneShapes } from './ToneShapes';
import { ScaleSlider } from './ScaleSlider';
import { DEFAULT_SCALE_CONFIG } from '@/utils/scale';
import type { ScaleConfig } from '@/types';

interface ScalePromptCardProps {
  promptText: string;
  scaleConfig: ScaleConfig | null;
  value: number | null;
  onChangeValue: (value: number) => void;
  note: string;
  onChangeNote: (text: string) => void;
  /** Fired when the note field gains focus — lets the screen scroll it above the keyboard */
  onNoteFocus?: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

/**
 * Scale-format prompt: the centerpiece of the daily loop. Full-bleed ink hero
 * card with tone-on-tone shapes, eyebrow cap, Nunito-Black question, 1–10
 * dots with anchored end labels, an optional short note, and a pill CTA.
 */
export function ScalePromptCard({
  promptText,
  scaleConfig,
  value,
  onChangeValue,
  note,
  onChangeNote,
  onNoteFocus,
  onSubmit,
  isPending,
}: ScalePromptCardProps) {
  const config = scaleConfig ?? DEFAULT_SCALE_CONFIG;
  const canSubmit = value !== null && !isPending;

  return (
    <View style={styles.card}>
      <ToneShapes variant="black" />

      <Animated.View entering={FadeIn.duration(400).delay(100)}>
        <Text style={styles.eyebrow}>Today's question</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <Text style={styles.promptText}>{promptText}</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.sliderSection}>
        <ScaleSlider
          value={value}
          onChange={onChangeValue}
          min={config.min}
          max={config.max}
          minLabel={config.minLabel}
          maxLabel={config.maxLabel}
          disabled={isPending}
          tone="dark"
        />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(500)}>
        <TextInput
          style={styles.noteInput}
          placeholder="A sentence about why, if you want."
          placeholderTextColor={colors.onDark.faint}
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={onChangeNote}
          onFocus={onNoteFocus}
          editable={!isPending}
          testID="scale-note-input"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(600)}>
        <TouchableOpacity
          onPress={onSubmit}
          style={[styles.button, !canSubmit && styles.disabled]}
          disabled={!canSubmit}
          activeOpacity={0.8}
          accessibilityRole="button"
          testID="scale-submit"
        >
          <Text style={styles.buttonText} maxFontSizeMultiplier={1.4}>{isPending ? 'Sending...' : 'Share'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.ink,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    paddingTop: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.onDark.muted,
    marginBottom: spacing.smd,
  },
  promptText: {
    ...typography.headingLg,
    color: colors.text.inverse,
  },
  sliderSection: {
    marginTop: spacing.md,
  },
  noteInput: {
    marginTop: spacing.md,
    backgroundColor: colors.onDark.field,
    borderRadius: radius.input,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.inverse,
    minHeight: 72,
    maxHeight: 160,
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
  },
  buttonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  disabled: {
    opacity: 0.4,
  },
});
