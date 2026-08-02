import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import EmojiPicker from 'rn-emoji-keyboard';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import {
  REACTIONS,
  isCuratedReaction,
  isValidCustomReaction,
  type ReactionType,
  type ReactionValue,
  type ReactionIconName,
} from '@/hooks/useReaction';
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
  myReaction: ReactionValue | null;
  partnerReaction: ReactionValue | null;
  onReact: (reaction: ReactionValue | null) => void;
  disabled?: boolean;
  /** Used for the partner-reaction line ("Masha felt the spark") */
  partnerName?: string;
  /**
   * Increment to open the full emoji picker from outside the row (the
   * double-tap on the partner's answer). 0/undefined never opens it.
   */
  openPickerNonce?: number;
}

function ReactionButton({
  icon,
  caption,
  isSelected,
  onPress,
  customEmoji,
  testID,
}: {
  icon: ReactionIconName | null;
  caption: string;
  isSelected: boolean;
  onPress: () => void;
  /** When set, render this emoji glyph instead of an SVG icon. */
  customEmoji?: string | null;
  testID?: string;
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
      testID={testID}
    >
      <Animated.View
        style={[
          styles.reactionBtn,
          isSelected && styles.reactionBtnSelected,
          animatedStyle,
        ]}
      >
        {customEmoji ? (
          <Text style={styles.customEmoji} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            {customEmoji}
          </Text>
        ) : icon ? (
          <Icon
            name={icon}
            size="sm"
            color={isSelected ? colors.accent.primary : colors.text.secondary}
            weight={isSelected ? 'fill' : 'regular'}
          />
        ) : (
          <Icon name="plus" size="sm" color={colors.text.secondary} weight="regular" />
        )}
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
  openPickerNonce = 0,
}: ReactionRowProps) {
  const { t } = useTranslation();
  const displayName = partnerName ?? t('explore.partnerFallback');
  const [pickerOpen, setPickerOpen] = useState(false);

  // The double-tap on the partner's answer opens the full picker directly.
  useEffect(() => {
    if (openPickerNonce > 0 && !disabled) setPickerOpen(true);
  }, [openPickerNonce, disabled]);

  // Optimistic selection: the ring lights the moment the button is tapped.
  // The myReaction prop follows a Firestore round-trip (and offline, never
  // arrives) — the local override renders immediately and clears once the
  // prop catches up. `undefined` means "no override".
  const [optimistic, setOptimistic] = useState<ReactionValue | null | undefined>(
    undefined
  );
  useEffect(() => {
    if (optimistic !== undefined && myReaction === optimistic) {
      setOptimistic(undefined);
    }
  }, [myReaction, optimistic]);
  const effectiveReaction = optimistic !== undefined ? optimistic : myReaction;

  const myCustomEmoji =
    effectiveReaction && !isCuratedReaction(effectiveReaction)
      ? effectiveReaction
      : null;

  const partnerIsCustom =
    partnerReaction != null && !isCuratedReaction(partnerReaction);
  const partnerCopy =
    partnerReaction && isCuratedReaction(partnerReaction)
      ? REACTION_COPY[partnerReaction]
      : null;
  const partnerLine = partnerCopy
    ? t(partnerCopy.partnerKey, { name: displayName })
    : partnerIsCustom
      ? t('reactions.partnerCustom', { name: displayName })
      : null;

  const select = (next: ReactionValue | null) => {
    if (disabled) return;
    setOptimistic(next);
    onReact(next);
  };

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
            caption={t(REACTION_COPY[r.type].captionKey)}
            isSelected={effectiveReaction === r.type}
            onPress={() =>
              select(effectiveReaction === r.type ? null : r.type)
            }
          />
        ))}
        {/* Any emoji — the fifth spot (founder ask 2026-08-02: some answers
            don't fit the curated four). A selected custom emoji lives here;
            tapping it again clears, tapping fresh opens the picker. */}
        <ReactionButton
          icon={null}
          caption={myCustomEmoji ? t('reactions.yours') : t('reactions.more')}
          isSelected={myCustomEmoji != null}
          customEmoji={myCustomEmoji}
          onPress={() => {
            if (disabled) return;
            if (myCustomEmoji) {
              select(null);
            } else {
              setPickerOpen(true);
            }
          }}
          testID="reaction-custom"
        />
      </View>
      {partnerReaction && partnerLine && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.partnerReaction}
          accessible
          accessibilityLabel={partnerLine}
        >
          {partnerIsCustom ? (
            <Text style={styles.partnerEmoji} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {partnerReaction}
            </Text>
          ) : (
            <Icon
              name={
                REACTIONS.find((r) => r.type === partnerReaction)?.icon ?? 'heart'
              }
              size="sm"
              color={colors.accent.primary}
              weight="fill"
            />
          )}
          <Text style={styles.partnerLine} maxFontSizeMultiplier={1.4}>
            {partnerLine}
          </Text>
        </Animated.View>
      )}
      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onEmojiSelected={(selected) => {
          if (isValidCustomReaction(selected.emoji)) {
            select(selected.emoji);
          }
          setPickerOpen(false);
        }}
        enableSearchBar
        categoryPosition="bottom"
      />
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
  customEmoji: {
    fontSize: 22,
    lineHeight: 26,
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
  partnerEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  partnerLine: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
