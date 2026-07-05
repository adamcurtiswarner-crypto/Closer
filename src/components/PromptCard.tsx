import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { Icon } from './Icon';
import { AccentBar } from './AccentBar';
import type { IconName } from './Icon';

// Prompt type visual config: icon, label, accent color, background tint.
// Palette-conformant: coral primary with purple and green as the only accents.
const PROMPT_TYPE_CONFIG: Record<string, {
  icon: IconName;
  label: string;
  accent: string;
  bgTint: string;
  bgTintDark: string;
}> = {
  love_map_update: {
    icon: 'map-pin',
    label: 'Love Map',
    accent: colors.accent.primary,
    bgTint: colors.accent.primaryLight,
    bgTintDark: colors.accent.primaryLight,
  },
  conflict_navigation: {
    icon: 'path',
    label: 'Navigate Together',
    accent: colors.brand.purple,
    bgTint: colors.brand.purpleLight,
    bgTintDark: colors.brand.purpleLight,
  },
  bid_for_connection: {
    icon: 'handshake',
    label: 'Connection',
    accent: colors.accent.primary,
    bgTint: colors.accent.primaryLight,
    bgTintDark: colors.accent.primaryLight,
  },
  appreciation_expression: {
    icon: 'sparkle',
    label: 'Appreciation',
    accent: colors.brand.green,
    bgTint: colors.brand.greenLight,
    bgTintDark: colors.brand.greenLight,
  },
  dream_exploration: {
    icon: 'compass',
    label: 'Dreams',
    accent: colors.brand.purple,
    bgTint: colors.brand.purpleLight,
    bgTintDark: colors.brand.purpleLight,
  },
  repair_attempt: {
    icon: 'heart',
    label: 'Repair',
    accent: colors.accent.primary,
    bgTint: colors.accent.primaryLight,
    bgTintDark: colors.accent.primaryLight,
  },
};

const DEFAULT_CONFIG: {
  icon: IconName;
  label: string;
  accent: string;
  bgTint: string;
  bgTintDark: string;
} = {
  icon: 'chat-text',
  label: 'Prompt',
  accent: colors.accent.primary,
  bgTint: colors.accent.primaryLight,
  bgTintDark: colors.accent.primaryLight,
};

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
  const config = PROMPT_TYPE_CONFIG[promptType] || DEFAULT_CONFIG;

  return (
    <View style={[styles.card, { backgroundColor: config.bgTint }]}>
      {/* Decorative top accent bar */}
      <AccentBar color={config.accent} />

      {/* Type badge */}
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: config.bgTintDark }]}>
          <Icon name={config.icon as IconName} size="sm" color={config.accent} weight="regular" />
          <Text style={[styles.typeLabel, { color: config.accent }]}>{config.label}</Text>
        </View>
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
            style={[styles.button, { backgroundColor: config.accent }]}
            activeOpacity={0.8}
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
    borderRadius: radius.hero,
    padding: spacing.lg,
    paddingTop: spacing.screen,
    ...shadow.card,
    overflow: 'hidden',
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: spacing.screen,
    marginTop: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    gap: spacing.sm,
  },
  typeLabel: {
    ...typography.eyebrow,
  },
  promptText: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  hint: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
