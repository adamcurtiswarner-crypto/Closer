import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Prompt type visual config: icon, label, accent color, background tint
const PROMPT_TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  accent: string;
  bgTint: string;
  bgTintDark: string;
}> = {
  love_map_update: {
    icon: '\u{1F5FA}\u{FE0F}',  // world map
    label: 'Love Map',
    accent: '#c97454',
    bgTint: '#fef7f4',
    bgTintDark: '#fceee7',
  },
  conflict_navigation: {
    icon: '\u{1F6E4}\u{FE0F}',  // railway track (navigation)
    label: 'Navigate Together',
    accent: '#8b7355',
    bgTint: '#faf8f5',
    bgTintDark: '#f3efe8',
  },
  bid_for_connection: {
    icon: '\u{1F91D}',  // handshake
    label: 'Connection',
    accent: '#c97454',
    bgTint: '#fef7f4',
    bgTintDark: '#fceee7',
  },
  appreciation_expression: {
    icon: '\u{2728}',  // sparkles
    label: 'Appreciation',
    accent: '#b8860b',
    bgTint: '#fdfaf3',
    bgTintDark: '#faf5e6',
  },
  dream_exploration: {
    icon: '\u{1F30C}',  // milky way
    label: 'Dreams',
    accent: '#7b6fa0',
    bgTint: '#f8f6fb',
    bgTintDark: '#f0edf6',
  },
  repair_attempt: {
    icon: '\u{1F495}',  // two hearts
    label: 'Repair',
    accent: '#c97474',
    bgTint: '#fef5f5',
    bgTintDark: '#fceaea',
  },
};

const DEFAULT_CONFIG = {
  icon: '\u{1F4AC}',  // speech bubble
  label: 'Prompt',
  accent: '#c97454',
  bgTint: '#fef7f4',
  bgTintDark: '#fceee7',
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
          <Text style={styles.typeIcon}>{config.icon}</Text>
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
            <Text style={styles.buttonArrow}>{'\u2192'}</Text>
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
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  promptText: {
    color: '#1c1917',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  hint: {
    color: '#78716c',
    fontSize: 14,
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
    fontSize: 17,
    letterSpacing: 0.2,
  },
  buttonArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
