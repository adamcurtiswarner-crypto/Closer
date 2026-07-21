import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { REACTIONS, type ReactionType, type ReactionIconName } from '@/hooks/useReaction';
import { Icon } from './Icon';
import { colors, spacing, typography } from '@/config/theme';

// Visible caption + partner-line i18n keys per reaction. The captions make
// the row legible at a glance (Love / Spark / Smile / Moved) — founder call
// 2026-07-09; icons alone read as a guessing game.
const REACTION_COPY: Record<ReactionType, { captionKey: string; partnerKey: string }> = {
  heart: { captionKey: 'reactions.love', partnerKey: 'reactions.partnerHeart' },
  fire: { captionKey: 'reactions.spark', partnerKey: 'reactions.partnerFire' },
  laughing: { captionKey: 'reactions.smile', partnerKey: 'reactions.partnerLaughing' },
  teary: { captionKey: 'reactions.moved', partnerKey: 'reactions.partnerTeary' },
};

interface ReactionRowProps {
  myReaction: ReactionType | null;
  partnerReaction: ReactionType | null;
  onReact: (reaction: ReactionType | null) => void;
  disabled?: boolean;
  /** Used for the partner-reaction line ("Masha felt the spark") */
  partnerName?: string;
}

function ReactionButton({
  icon,
  type,
  caption,
  isSelected,
  onPress,
}: {
  icon: ReactionIconName;
  type: ReactionType;
  caption: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.3, { damping: 6, stiffness: 200 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 150 });
    });
    hapticImpact(ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={caption}
      accessibilityState={{ selected: isSelected }}
      style={styles.reactionCol}
    >
      <Animated.View
        style={[
          styles.reactionBtn,
          isSelected && styles.reactionBtnSelected,
          animatedStyle,
        ]}
      >
        <Icon
          name={icon}
          size="sm"
          color={isSelected ? colors.accent.primary : colors.text.secondary}
          weight={isSelected ? 'fill' : 'regular'}
        />
      </Animated.View>
      <Text
        style={[styles.caption, isSelected && styles.captionSelected]}
        maxFontSizeMultiplier={1.4}
      >
        {caption}
      </Text>
    </TouchableOpacity>
  );
}

export function ReactionRow({
  myReaction,
  partnerReaction,
  onReact,
  disabled,
  partnerName,
}: ReactionRowProps) {
  const { t } = useTranslation();
  const displayName = partnerName ?? t('explore.partnerFallback');

  // Optimistic selection: the ring lights the moment the button is tapped.
  // The myReaction prop follows a Firestore round-trip (and offline, never
  // arrives) — the local override renders immediately and clears once the
  // prop catches up. `undefined` means "no override".
  const [optimistic, setOptimistic] = useState<ReactionType | null | undefined>(
    undefined
  );
  useEffect(() => {
    if (optimistic !== undefined && myReaction === optimistic) {
      setOptimistic(undefined);
    }
  }, [myReaction, optimistic]);
  const effectiveReaction = optimistic !== undefined ? optimistic : myReaction;
  const partnerCopy = partnerReaction ? REACTION_COPY[partnerReaction] : null;
  const partnerLine = partnerCopy
    ? t(partnerCopy.partnerKey, { name: displayName })
    : null;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Quiet eyebrow: the reactions answer YOUR PARTNER'S words, not the
          line above the row — founder call 2026-07-11 (reveal clarity). */}
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.4}>
        {t('reactions.rowLabel', { name: displayName })}
      </Text>
      <View style={styles.row}>
        {REACTIONS.map((r) => (
          <ReactionButton
            key={r.type}
            icon={r.icon}
            type={r.type}
            caption={t(REACTION_COPY[r.type].captionKey)}
            isSelected={effectiveReaction === r.type}
            onPress={() => {
              if (disabled) return;
              const next = effectiveReaction === r.type ? null : r.type;
              setOptimistic(next);
              onReact(next);
            }}
          />
        ))}
      </View>
      {partnerReaction && partnerLine && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.partnerReaction}
          accessible
          accessibilityLabel={partnerLine}
        >
          <Icon
            name={REACTIONS.find((r) => r.type === partnerReaction)?.icon ?? 'heart'}
            size="sm"
            color={colors.accent.primary}
            weight="fill"
          />
          <Text style={styles.partnerLine} maxFontSizeMultiplier={1.4}>
            {partnerLine}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.smd,
  },
  rowLabel: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.smd,
  },
  reactionCol: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBtnSelected: {
    backgroundColor: colors.surface.warmTint,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  caption: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  captionSelected: {
    color: colors.accent.primary,
  },
  // Centered under the reaction row — it answers the row above it.
  partnerReaction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  partnerLine: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
