import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { Icon } from './Icon';
import { ToneShapes } from './ToneShapes';
import type { IconName } from './Icon';

// Prompt type eyebrow config: icon + label. The card itself is the ink hero
// surface for every category — category identity lives in the eyebrow only.
const PROMPT_TYPE_CONFIG: Record<string, { icon: IconName; label: string }> = {
  love_map_update: { icon: 'map-pin', label: 'Love Map' },
  conflict_navigation: { icon: 'path', label: 'Navigate Together' },
  bid_for_connection: { icon: 'handshake', label: 'Connection' },
  appreciation_expression: { icon: 'sparkle', label: 'Appreciation' },
  dream_exploration: { icon: 'compass', label: 'Dreams' },
  repair_attempt: { icon: 'heart', label: 'Repair' },
};

const DEFAULT_CONFIG: { icon: IconName; label: string } = {
  icon: 'chat-text',
  label: 'Prompt',
};

interface PromptCardProps {
  promptText: string;
  promptHint?: string | null;
  promptType: string;
  onRespond?: () => void;
  showRespondButton?: boolean;
}

/**
 * Text-format prompt (daily open prompts and follow-ups). Same full-bleed ink
 * hero surface as ScalePromptCard: tone-on-tone shapes, eyebrow cap,
 * Nunito-Black question, coral pill CTA.
 */
export function PromptCard({
  promptText,
  promptHint,
  promptType,
  onRespond,
  showRespondButton = true,
}: PromptCardProps) {
  const config = PROMPT_TYPE_CONFIG[promptType] || DEFAULT_CONFIG;

  return (
    <View style={styles.card}>
      <ToneShapes variant="black" />

      {/* Category eyebrow */}
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.eyebrowRow}>
        <Icon name={config.icon} size="sm" color={colors.onDark.muted} weight="regular" />
        <Text style={styles.eyebrow}>{config.label}</Text>
      </Animated.View>

      {/* Prompt text */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <Text style={styles.promptText}>{promptText}</Text>
      </Animated.View>

      {/* Hint */}
      {promptHint && (
        <Animated.View entering={FadeIn.duration(400).delay(400)}>
          <Text style={styles.hint}>{promptHint}</Text>
        </Animated.View>
      )}

      {/* Respond button */}
      {showRespondButton && onRespond && (
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <TouchableOpacity
            onPress={onRespond}
            style={styles.button}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText} maxFontSizeMultiplier={1.4}>Respond</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.smd,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.onDark.muted,
  },
  promptText: {
    ...typography.headingLg,
    color: colors.text.inverse,
  },
  hint: {
    ...typography.bodySm,
    color: colors.onDark.muted,
    marginTop: spacing.md,
    fontStyle: 'italic',
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
});
