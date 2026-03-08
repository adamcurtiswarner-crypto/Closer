import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { REACTIONS, type ReactionType } from '@/hooks/useReaction';

interface ReactionRowProps {
  myReaction: ReactionType | null;
  partnerReaction: ReactionType | null;
  onReact: (reaction: ReactionType | null) => void;
  disabled?: boolean;
}

function ReactionButton({
  emoji,
  type,
  isSelected,
  onPress,
}: {
  emoji: string;
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
        <Text style={styles.reactionEmoji}>{emoji}</Text>
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
            emoji={r.emoji}
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
          <Text style={styles.partnerLabel}>
            {REACTIONS.find((r) => r.type === partnerReaction)?.emoji}
          </Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBtnSelected: {
    backgroundColor: '#fef3ee',
    borderWidth: 1.5,
    borderColor: '#c97454',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  partnerReaction: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingRight: 4,
  },
  partnerLabel: {
    fontSize: 14,
  },
});
