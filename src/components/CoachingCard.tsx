import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { IconName } from '@/components/Icon';

interface CoachingCardProps {
  insightText: string;
  actionType: string;
  actionText: string;
  onAction: () => void;
  onDismiss: () => void;
  onViewCoaching?: () => void;
}

const ACTION_CONFIG: Record<string, { icon: IconName; label: string }> = {
  goal: { icon: 'target', label: 'Set a goal' },
  date_night: { icon: 'heart', label: 'Plan a date' },
  conversation: { icon: 'chat-circle', label: 'Start a conversation' },
  revisit: { icon: 'clock-counter-clockwise', label: 'Look back' },
  check_in: { icon: 'heart', label: 'Check in' },
};

export function CoachingCard({ insightText, actionType, actionText, onAction, onDismiss, onViewCoaching }: CoachingCardProps) {
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
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            <Text style={styles.actionDetail} numberOfLines={2}>{actionText || 'Take a moment to connect today'}</Text>
          </View>
          <Icon name="arrow-right" size="sm" color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      {onViewCoaching && (
        <TouchableOpacity onPress={onViewCoaching} style={styles.viewCoachingLink}>
          <Text style={styles.viewCoachingText}>View all insights</Text>
          <Icon name="arrow-right" size="xs" color="#78716c" />
        </TouchableOpacity>
      )}
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
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    letterSpacing: -0.3,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef7f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    lineHeight: 19,
  },
  viewCoachingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 4,
  },
  viewCoachingText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
});
