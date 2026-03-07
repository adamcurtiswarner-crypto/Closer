import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { ConversationStarter } from '@/config/conversationStarters';

const CARD_COLORS = [
  '#f0e6d3', // warm sand
  '#e8d5e0', // dusty rose
  '#d4e4d9', // sage
  '#dde0f0', // lavender
  '#f5e0cc', // peach
];

interface ConversationStarterCardProps {
  starter: ConversationStarter;
  onStart: () => void;
}

export function ConversationStarterCard({ starter, onStart }: ConversationStarterCardProps) {
  const colorIndex = starter.id.charCodeAt(starter.id.length - 1) % CARD_COLORS.length;
  const bgColor = CARD_COLORS[colorIndex];

  const handleStart = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    onStart();
  };

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(200)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bgColor }]}
        onPress={handleStart}
        activeOpacity={0.85}
      >
        <View style={styles.overline}>
          <Text style={styles.overlineText}>ACTIVITY · {starter.durationMinutes}-{starter.durationMinutes + 5} MIN</Text>
        </View>

        <Text style={styles.label}>Daily Thought</Text>

        <View style={styles.bottom}>
          <Text style={styles.description} numberOfLines={2}>{starter.description}</Text>
          <View style={styles.playButton}>
            <Icon name="play" size="sm" color="#ffffff" weight="fill" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  overline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlineText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(28, 25, 23, 0.5)',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 22,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginTop: 8,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef5323',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
