import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@components';
import type { IconName } from '@/components/Icon';

import { colors, spacing, typography } from '@/config/theme';
export type RelationshipStage = 'dating' | 'engaged' | 'married' | 'long_distance';

const STAGES: { value: RelationshipStage; label: string; icon: IconName }[] = [
  { value: 'dating', label: 'Dating', icon: 'heart' },
  { value: 'engaged', label: 'Engaged', icon: 'star' },
  { value: 'married', label: 'Married', icon: 'handshake' },
  { value: 'long_distance', label: 'Long Distance', icon: 'map-pin' },
];

interface RelationshipStagePromptProps {
  onSelectStage: (stage: RelationshipStage) => void;
  onDismiss: () => void;
}

export function RelationshipStagePrompt({ onSelectStage, onDismiss }: RelationshipStagePromptProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stagePromptCard}>
      <Text style={styles.stagePromptTitle}>Help us personalize</Text>
      <Text style={styles.stagePromptSubtitle}>What stage is your relationship?</Text>
      <View style={styles.stageButtons}>
        {STAGES.map(s => (
          <TouchableOpacity key={s.value} style={styles.stageChip} onPress={() => onSelectStage(s.value)}>
            <Icon name={s.icon} size="sm" color={colors.accent.primary} />
            <Text style={styles.stageChipText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.stageSkip}>Not now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stagePromptCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: spacing.cardPad,
    marginBottom: spacing.md,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  stagePromptTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stagePromptSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  stageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.smd,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.warmTint,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surface.warmTint,
  },
  stageChipText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  stageSkip: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
