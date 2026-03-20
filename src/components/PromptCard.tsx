import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Icon } from './Icon';
import type { IconName } from './Icon';

// Prompt type visual config: icon, label, accent color, background tint
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
    accent: '#c97454',
    bgTint: '#fef5f0',
    bgTintDark: '#fce8dc',
  },
  conflict_navigation: {
    icon: 'path',
    label: 'Navigate Together',
    accent: '#490f5f',
    bgTint: '#faf8f5',
    bgTintDark: '#f3efe8',
  },
  bid_for_connection: {
    icon: 'handshake',
    label: 'Connection',
    accent: '#c97454',
    bgTint: '#fef5f0',
    bgTintDark: '#fce8dc',
  },
  appreciation_expression: {
    icon: 'sparkle',
    label: 'Appreciation',
    accent: '#b8860b',
    bgTint: '#fdfaf3',
    bgTintDark: '#faf5e6',
  },
  dream_exploration: {
    icon: 'compass',
    label: 'Dreams',
    accent: '#7b6fa0',
    bgTint: '#f8f6fb',
    bgTintDark: '#f0edf6',
  },
  repair_attempt: {
    icon: 'heart',
    label: 'Repair',
    accent: '#c97474',
    bgTint: '#fef5f5',
    bgTintDark: '#fceaea',
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
  accent: '#c97454',
  bgTint: '#fef5f0',
  bgTintDark: '#fce8dc',
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
      <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

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
            <Text style={styles.buttonText}>Respond</Text>
            <Icon name="arrow-right" size="sm" color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 28,
    paddingTop: 20,
    shadowColor: '#1c1917',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
  },
  promptText: {
    color: '#1c1917',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  hint: {
    color: '#78716c',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  button: {
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
