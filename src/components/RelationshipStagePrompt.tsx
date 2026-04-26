import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@components';
import type { IconName } from '@/components/Icon';

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
            <Icon name={s.icon} size="sm" color="#c97454" />
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  stagePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    marginBottom: 4,
  },
  stagePromptSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginBottom: 16,
  },
  stageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef5f0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fce8dc',
  },
  stageChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
  stageSkip: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
  },
});
