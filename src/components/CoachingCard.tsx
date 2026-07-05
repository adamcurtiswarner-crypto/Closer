import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { IconName } from '@/components/Icon';

import { colors, spacing, typography } from '@/config/theme';
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

      <View style={styles.header}>
        <Icon name="lightbulb" size="sm" color={colors.accent.primary} weight="light" />
        <Text style={styles.headerText}>Weekly insight</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="x" size="xs" color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(200)}>
        <Text style={styles.insightText}>{insightText}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(400)}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAction} activeOpacity={0.8}>
          <Icon name={config.icon} size="sm" color={colors.text.inverse} weight="bold" />
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>{config.label}</Text>
            <Text style={styles.actionDetail} numberOfLines={2}>{actionText || 'Take a moment to connect today'}</Text>
          </View>
          <Icon name="arrow-right" size="sm" color={colors.text.inverse} />
        </TouchableOpacity>
      </Animated.View>

      {onViewCoaching && (
        <TouchableOpacity onPress={onViewCoaching} style={styles.viewCoachingLink}>
          <Text style={styles.viewCoachingText}>View all insights</Text>
          <Icon name="arrow-right" size="xs" color={colors.text.secondary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.cardPad,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    backgroundColor: colors.accent.primary,
    borderRadius: 14,
    padding: spacing.md,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  actionDetail: {
    ...typography.bodySm,
    color: colors.text.inverse,
  },
  viewCoachingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.smd,
    paddingVertical: spacing.xs,
  },
  viewCoachingText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
