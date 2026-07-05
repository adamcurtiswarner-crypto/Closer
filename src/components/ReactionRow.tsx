import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { REACTIONS, type ReactionType, type ReactionIconName } from '@/hooks/useReaction';
import { Icon } from './Icon';
import { colors } from '@/config/theme';

// VoiceOver names for each reaction (and its lowercase noun for the partner line)
const REACTION_A11Y: Record<ReactionType, { label: string; noun: string }> = {
  heart: { label: 'Heart', noun: 'heart' },
  fire: { label: 'Flame', noun: 'flame' },
  laughing: { label: 'Smile', noun: 'smile' },
  teary: { label: 'Tear', noun: 'tear' },
};

interface ReactionRowProps {
  myReaction: ReactionType | null;
  partnerReaction: ReactionType | null;
  onReact: (reaction: ReactionType | null) => void;
  disabled?: boolean;
  /** Used for the partner-reaction accessibility label */
  partnerName?: string;
}

function ReactionButton({
  icon,
  type,
  isSelected,
  onPress,
}: {
  icon: ReactionIconName;
  type: ReactionType;
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
      accessibilityLabel={REACTION_A11Y[type].label}
      accessibilityState={{ selected: isSelected }}
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
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.row}>
        {REACTIONS.map((r) => (
          <ReactionButton
            key={r.type}
            icon={r.icon}
            type={r.type}
            isSelected={myReaction === r.type}
            onPress={() => {
              if (disabled) return;
              onReact(myReaction === r.type ? null : r.type);
            }}
          />
        ))}
      </View>
      {partnerReaction && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.partnerReaction}
          accessible
          accessibilityLabel={`${partnerName ?? 'Partner'} reacted with a ${
            REACTION_A11Y[partnerReaction]?.noun ?? 'heart'
          }`}
        >
          <Icon
            name={REACTIONS.find((r) => r.type === partnerReaction)?.icon ?? 'heart'}
            size="sm"
            color={colors.accent.primary}
            weight="fill"
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
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
  partnerReaction: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingRight: 4,
  },
});
