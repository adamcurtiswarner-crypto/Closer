import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  useGoals,
  useToggleGoalCompletion,
  useActivateWeeklyChallenge,
  useArchiveGoal,
  useWeeklyChallenge,
  type Goal,
} from '@/hooks/useGoals';

interface GoalTrackerProps {
  onAddGoal: () => void;
}

export function GoalTracker({ onAddGoal }: GoalTrackerProps) {
  const { data: goals, isLoading } = useGoals();
  const toggleCompletion = useToggleGoalCompletion();
  const activateChallenge = useActivateWeeklyChallenge();
  const archiveGoal = useArchiveGoal();
  const { challenge, activeChallenge, isActivated } = useWeeklyChallenge();

  const customGoals = goals?.filter((g) => g.goalType === 'custom') ?? [];

  const handleToggle = (goal: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleCompletion.mutate({
      goalId: goal.id,
      currentCount: goal.completedCount,
      targetCount: goal.targetCount,
    });
  };

  const handleStartChallenge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    activateChallenge.mutate();
  };

  const handleArchive = (goalId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    archiveGoal.mutate(goalId);
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#c97454" size="small" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={styles.accentBar} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerIcon}>{'\uD83C\uDFAF'}</Text>
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
                <Text style={styles.challengeCtaLabel}>This week's challenge</Text>
                <Text style={styles.challengeCtaTitle}>{challenge.title}</Text>
              </View>
            </View>
            <View style={[styles.startButton, activateChallenge.isPending && styles.buttonDisabled]}>
              <Text style={styles.startButtonText}>
                {activateChallenge.isPending ? '...' : 'Start'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : activeChallenge ? (
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <GoalRow
            goal={activeChallenge}
            onToggle={handleToggle}
            onArchive={handleArchive}
            isChallenge
          />
        </Animated.View>
      ) : null}

      {/* Custom Goals */}
      {customGoals.map((goal, index) => (
        <Animated.View
          key={goal.id}
          entering={FadeInUp.duration(400).delay(200 + index * 80)}
        >
          <GoalRow
            goal={goal}
            onToggle={handleToggle}
            onArchive={handleArchive}
          />
        </Animated.View>
      ))}

      {/* Add Goal Button */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity style={styles.addButton} onPress={onAddGoal} activeOpacity={0.8}>
          <View style={styles.addIconWrap}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.addText}>Add a goal</Text>
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
        {goal.isCompleted ? (
          <View style={styles.checkboxFilled}>
            <Text style={styles.checkmark}>{'\u2713'}</Text>
          </View>
        ) : (
          <View style={styles.checkboxEmpty}>
            <View style={styles.checkboxInner} />
          </View>
        )}
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
        <ProgressBar
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
        <Text style={styles.archiveIcon}>{'\u00D7'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProgressBar({
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
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            isComplete && styles.progressFillComplete,
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, isComplete && styles.progressLabelComplete]}>
        {current}/{target}
      </Text>
    </View>
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
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#8b7355',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
  },
  // ─── Weekly Challenge CTA ───
  challengeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef7f4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fceee7',
  },
  challengeCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  challengeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  challengeIcon: {
    fontSize: 20,
  },
  challengeCtaText: {
    flex: 1,
  },
  challengeCtaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c97454',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  challengeCtaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292524',
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: '#c97454',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // ─── Goal Rows ───
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d6d3d1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f4',
  },
  checkboxFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  goalInfo: {
    flex: 1,
    gap: 6,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weeklyBadge: {
    backgroundColor: '#fef3ee',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  weeklyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c97454',
    letterSpacing: 0.5,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292524',
    flex: 1,
  },
  goalTitleDone: {
    color: '#a8a29e',
    textDecorationLine: 'line-through',
  },
  archiveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveIcon: {
    fontSize: 16,
    color: '#a8a29e',
    fontWeight: '600',
    marginTop: -1,
  },
  // ─── Progress Bar ───
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f5f5f4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#c97454',
    borderRadius: 3,
  },
  progressFillComplete: {
    backgroundColor: '#22c55e',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a8a29e',
    minWidth: 28,
    textAlign: 'right',
  },
  progressLabelComplete: {
    color: '#22c55e',
  },
  // ─── Add Button ───
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c97454',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 15,
    color: '#c97454',
    fontWeight: '600',
    marginTop: -1,
  },
  addText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
  },
  // ─── Footer ───
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
  },
});
