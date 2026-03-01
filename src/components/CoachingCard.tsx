import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from '@/components';
import type { IconName } from '@/components/Icon';

interface CoachingCardProps {
  insightText: string;
  actionType: string;
  actionText: string;
  onAction: () => void;
  onDismiss: () => void;
}

const ACTION_CONFIG: Record<string, { icon: IconName; label: string }> = {
  goal: { icon: 'target', label: 'Set a goal' },
  date_night: { icon: 'heart', label: 'Plan a date' },
  conversation: { icon: 'chat-circle', label: 'Start a conversation' },
  revisit: { icon: 'clock-counter-clockwise', label: 'Look back' },
  check_in: { icon: 'heart', label: 'Check in' },
};

export function CoachingCard({ insightText, actionType, actionText, onAction, onDismiss }: CoachingCardProps) {
  const config = ACTION_CONFIG[actionType] || ACTION_CONFIG.conversation;

  const handleAction = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    onAction();
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      <View style={styles.accentBar} />

      <View style={styles.header}>
        <Icon name="lightbulb" size="sm" color="#c97454" weight="light" />
        <Text style={styles.headerText}>Weekly insight</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Icon name="x" size="xs" color="#a8a29e" />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(200)}>
        <Text style={styles.insightText}>{insightText}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(400)}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAction} activeOpacity={0.8}>
          <Icon name={config.icon} size="sm" color="#ffffff" weight="bold" />
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>{config.label}</Text>
            <Text style={styles.actionDetail} numberOfLines={2}>{actionText}</Text>
          </View>
          <Icon name="arrow-right" size="sm" color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    fontSize: 15,
    color: '#57534e',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#c97454',
    borderRadius: 14,
    padding: 16,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  actionDetail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 19,
  },
});
