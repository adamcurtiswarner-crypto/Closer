import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Icon } from './Icon';
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
  onSubmit: () => void;
  isPending: boolean;
}

/**
 * Scale-format prompt: 1–10 dots with anchored end labels plus an optional
 * short note. Mirrors the PromptCard visual language so it feels like the
 * same product.
 */
export function ScalePromptCard({
  promptText,
  scaleConfig,
  value,
  onChangeValue,
  note,
  onChangeNote,
  onSubmit,
  isPending,
}: ScalePromptCardProps) {
  const config = scaleConfig ?? DEFAULT_SCALE_CONFIG;
  const canSubmit = value !== null && !isPending;

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />

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
        />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(500)}>
        <TextInput
          style={styles.noteInput}
          placeholder="A sentence about why, if you want."
          placeholderTextColor="#B8B8C4"
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={onChangeNote}
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
          <Text style={styles.buttonText}>{isPending ? 'Sending...' : 'Share'}</Text>
          {!isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FDF1ED',
    borderRadius: 20,
    padding: 28,
    paddingTop: 24,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4522A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  promptText: {
    color: '#1E1E2E',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Nunito-Black',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  sliderSection: {
    marginTop: 16,
  },
  noteInput: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1E1E2E',
    borderWidth: 1.5,
    borderColor: '#E2DED8',
    minHeight: 72,
    maxHeight: 160,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    backgroundColor: '#D4522A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
