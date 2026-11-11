import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Icon } from './Icon';
import { usePersonalize } from '@/hooks/usePersonalize';
import type { ExploreAssignment } from '@/hooks/useExplorePrompts';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

interface ExploreRevisitProps {
  assignments: ExploreAssignment[];
  onPress: (assignment: ExploreAssignment) => void;
}

/**
 * Revisit section: questions the couple has already answered together.
 * Shows the prompt text and a tap target to see both responses.
 */
export function ExploreRevisit({ assignments, onPress }: ExploreRevisitProps) {
  const personalize = usePersonalize();

  if (assignments.length === 0) return null;

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(200)}>
      <View style={styles.header}>
        <Icon name="clock-counter-clockwise" size="sm" color={colors.text.secondary} weight="bold" />
        <Text style={styles.headerText}>Revisit</Text>
        <Text style={styles.countBadge}>{assignments.length}</Text>
      </View>

      {assignments.slice(0, 10).map((a, index) => (
        <Animated.View
          key={a.id}
          entering={FadeInUp.duration(300).delay(100 + index * 40)}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(a)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.promptText} numberOfLines={2}>
              {personalize(a.promptText)}
            </Text>
            <View style={styles.meta}>
              <Icon name="checks" size={14} color={colors.semantic.success} />
              <Text style={styles.metaText}>Both answered</Text>
              <Icon name="caret-right" size={14} color={colors.text.muted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {assignments.length > 10 && (
        <Text style={styles.moreText}>
          {assignments.length - 10} more answered questions
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.smd,
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    ...typography.heading,
    color: colors.text.primary,
    fontSize: 15,
    flex: 1,
  },
  countBadge: {
    ...typography.caption,
    color: colors.text.secondary,
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    padding: spacing.smd,
    marginBottom: spacing.sm,
    ...shadow.cardSubtle,
  },
  promptText: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.semantic.success,
    flex: 1,
  },
  moreText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
