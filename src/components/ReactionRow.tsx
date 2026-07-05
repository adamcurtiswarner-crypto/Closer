import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { REACTIONS, type ReactionType, type ReactionIconName } from '@/hooks/useReaction';
import { Icon } from './Icon';
import { colors } from '@/config/theme';

interface ReactionRowProps {
  myReaction: ReactionType | null;
  partnerReaction: ReactionType | null;
  onReact: (reaction: ReactionType | null) => void;
  disabled?: boolean;
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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
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

export function ReactionRow({ myReaction, partnerReaction, onReact, disabled }: ReactionRowProps) {
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
        <Animated.View entering={FadeIn.duration(300)} style={styles.partnerReaction}>
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
    backgroundColor: '#E2DED8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBtnSelected: {
    backgroundColor: '#fef3ee',
    borderWidth: 1.5,
    borderColor: '#D4522A',
  },
  partnerReaction: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingRight: 4,
  },
});
