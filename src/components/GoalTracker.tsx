import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { useTranslation } from 'react-i18next';
import {
  useGoals,
  useToggleGoalCompletion,
  useActivateWeeklyChallenge,
  useArchiveGoal,
  useWeeklyChallenge,
  type Goal,
} from '@/hooks/useGoals';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { SwipeableRow } from './SwipeableRow';
import { Icon } from './Icon';
import { GoalTrackerSkeleton } from './Skeleton';

import { colors, spacing, typography } from '@/config/theme';
interface GoalTrackerProps {
  onAddGoal: () => void;
}

export function GoalTracker({ onAddGoal }: GoalTrackerProps) {
  const { t } = useTranslation();
  const { data: goals, isLoading } = useGoals();
  const toggleCompletion = useToggleGoalCompletion();
  const activateChallenge = useActivateWeeklyChallenge();
  const archiveGoal = useArchiveGoal();
  const { challenge, activeChallenge, isActivated } = useWeeklyChallenge();

  const customGoals = goals?.filter((g) => g.goalType === 'custom') ?? [];

  const handleToggle = (goal: Goal) => {
    hapticImpact();
    toggleCompletion.mutate({
      goalId: goal.id,
      currentCount: goal.completedCount,
      targetCount: goal.targetCount,
    });
  };

  const handleStartChallenge = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    activateChallenge.mutate();
  };

  const handleArchive = (goalId: string) => {
    hapticImpact();
    archiveGoal.mutate(goalId);
  };

  if (isLoading) {
    return <GoalTrackerSkeleton />;
  }

  return (
    <View style={styles.card}>
      {/* Accent bar */}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Icon name="target" size="sm" color={colors.accent.primary} weight="regular" />
        <Text style={styles.headerTitle}>Goals & Challenges</Text>
      </Animated.View>

      {/* Weekly Challenge CTA or Active Challenge */}
      {!isActivated ? (
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity
            style={styles.challengeCta}
            onPress={handleStartChallenge}
            disabled={activateChallenge.isPending}
            activeOpacity={0.8}
          >
            <View style={styles.challengeCtaLeft}>
              <View style={styles.challengeIconWrap}>
                <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              </View>
              <View style={styles.challengeCtaText}>
                <Text style={styles.challengeCtaLabel}>{t('goals.thisWeeksChallenge')}</Text>
                <Text style={styles.challengeCtaTitle}>{challenge.title}</Text>
              </View>
            </View>
            <View style={[styles.startButton, activateChallenge.isPending && styles.buttonDisabled]}>
              <Text style={styles.startButtonText}>
                {activateChallenge.isPending ? '...' : t('goals.start')}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : activeChallenge ? (
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <SwipeableRow
            rightActions={[{
              label: 'Archive',
              color: colors.text.muted,
              onPress: () => handleArchive(activeChallenge.id),
            }]}
          >
            <GoalRow
              goal={activeChallenge}
              onToggle={handleToggle}
              onArchive={handleArchive}
              isChallenge
            />
          </SwipeableRow>
        </Animated.View>
      ) : null}

      {/* Custom Goals */}
      {customGoals.map((goal, index) => (
        <Animated.View
          key={goal.id}
          entering={FadeInUp.duration(400).delay(200 + index * 80)}
        >
          <SwipeableRow
            rightActions={[{
              label: 'Archive',
              color: colors.text.muted,
              onPress: () => handleArchive(goal.id),
            }]}
          >
            <GoalRow
              goal={goal}
              onToggle={handleToggle}
              onArchive={handleArchive}
            />
          </SwipeableRow>
        </Animated.View>
      ))}

      {/* Add Goal Button */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity style={styles.addButton} onPress={onAddGoal} activeOpacity={0.8}>
          <View style={styles.addIconWrap}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.addText}>{t('goals.addGoal')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Decorative footer */}
      <View style={styles.footerDots}>
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

function GoalRow({
  goal,
  onToggle,
  onArchive,
  isChallenge = false,
}: {
  goal: Goal;
  onToggle: (goal: Goal) => void;
  onArchive: (goalId: string) => void;
  isChallenge?: boolean;
}) {
  return (
    <View style={styles.goalRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggle(goal)}
        activeOpacity={0.6}
      >
        <AnimatedCheckbox checked={goal.isCompleted} size={24} />
      </TouchableOpacity>
      <View style={styles.goalInfo}>
        <View style={styles.goalTitleRow}>
          {isChallenge && (
            <View style={styles.weeklyBadge}>
              <Text style={styles.weeklyBadgeText}>WEEKLY</Text>
            </View>
          )}
          <Text
            style={[styles.goalTitle, goal.isCompleted && styles.goalTitleDone]}
            numberOfLines={1}
          >
            {goal.title}
          </Text>
        </View>
        <ProgressBarRow
          current={goal.completedCount}
          target={goal.targetCount}
          isComplete={goal.isCompleted}
        />
      </View>
      <TouchableOpacity
        style={styles.archiveButton}
        onPress={() => onArchive(goal.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Icon name="x" size="xs" color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );
}

function ProgressBarRow({
  current,
  target,
  isComplete,
}: {
  current: number;
  target: number;
  isComplete: boolean;
}) {
  const progress = Math.min(current / target, 1);
  return (
    <View style={styles.progressRow}>
      <AnimatedProgressBar
        progress={progress}
        color={isComplete ? colors.semantic.success : colors.accent.primary}
        height={6}
        style={{ flex: 1 }}
      />
      <Text style={[styles.progressLabel, isComplete && styles.progressLabelComplete]}>
        {current}/{target}
      </Text>
    </View>
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
  headerIcon: {
    ...typography.body,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  // ─── Weekly Challenge CTA ───
  challengeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.warmTint,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surface.warmTint,
  },
  challengeCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    flex: 1,
  },
  challengeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  challengeIcon: {
    ...typography.heading,
  },
  challengeCtaText: {
    flex: 1,
  },
  challengeCtaLabel: {
    ...typography.eyebrow,
    color: colors.accent.primary,
    marginBottom: 3,
  },
  challengeCtaTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  startButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  startButtonText: {
    color: colors.text.inverse,
    ...typography.bodySm,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // ─── Goal Rows ───
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weeklyBadge: {
    backgroundColor: colors.surface.warmTint,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  weeklyBadgeText: {
    ...typography.caption,
    color: colors.accent.primary,
  },
  goalTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  goalTitleDone: {
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  archiveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveIcon: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: -1,
  },
  // ─── Progress Bar ───
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    minWidth: 28,
    textAlign: 'right',
  },
  progressLabelComplete: {
    color: colors.semantic.success,
  },
  // ─── Add Button ───
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    ...typography.body,
    color: colors.accent.primary,
    marginTop: -1,
  },
  addText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  // ─── Footer ───
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.smd,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
});
