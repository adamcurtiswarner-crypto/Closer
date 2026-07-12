import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { usePartnerName } from '@/hooks/usePartnerName';

import { colors, spacing, typography } from '@/config/theme';
interface ConnectionHeaderProps {
  userName: string | null;
  /** Override for tests/callers that already resolved a name; when absent,
   *  usePartnerName decides (partner display_name > pet name > fallback). */
  partnerName?: string;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  typingContext?: 'chat' | 'prompt' | null;
  lastSeen: Date | null;
  currentStreak: number;
  isStreakActive: boolean;
  userPhotoUrl?: string | null;
  partnerPhotoUrl?: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return firstGrapheme(name);
}

// Array.from splits on code points, so names starting with an accented or
// non-BMP character still yield one whole glyph rather than half a surrogate.
function firstGrapheme(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : '?';
}

function getStatusText(
  partnerName: string,
  isOnline: boolean,
  isTyping: boolean,
  typingContext?: 'chat' | 'prompt' | null,
): string {
  if (isTyping) {
    if (typingContext === 'prompt') return `${partnerName} is responding...`;
    if (typingContext === 'chat') return `${partnerName} is writing...`;
    return `${partnerName} is typing...`;
  }
  if (isOnline) return `${partnerName} is here`;
  return '';
}

export function ConnectionHeader({
  userName,
  partnerName,
  isPartnerOnline,
  isPartnerTyping,
  typingContext,
  currentStreak,
  isStreakActive,
  userPhotoUrl,
  partnerPhotoUrl,
}: ConnectionHeaderProps) {
  const { name: hookPartnerName, isFallback } = usePartnerName();
  // Status lines start with the name; the hook's fallback is lowercase
  // "your partner" by design, so sentence-case it for this position.
  const statusName =
    partnerName ??
    (isFallback
      ? hookPartnerName.charAt(0).toUpperCase() + hookPartnerName.slice(1)
      : hookPartnerName);
  // The avatar initial always derives from the hook — a prop like the old
  // "Partner" default must never surface as a capital-P initial. When no
  // real name exists yet, a neutral glyph stands in.
  const partnerInitial = isFallback ? null : firstGrapheme(hookPartnerName);

  const statusText = getStatusText(statusName, isPartnerOnline, isPartnerTyping, typingContext);

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      {/* Avatars + connection line */}
      <View style={styles.avatarRow}>
        {/* You */}
        <View style={styles.avatarWrapper}>
          {userPhotoUrl ? (
            <Image source={{ uri: userPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarYou]}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, styles.onlineActive]} />
        </View>

        {/* Connection visualization */}
        <View style={styles.connectionLine}>
          <View style={[styles.dot, styles.dotLeft]} />
          <View style={styles.line} />
          {currentStreak > 0 && (
            <StreakPill streak={currentStreak} active={isStreakActive} />
          )}
          <View style={styles.line} />
          <View style={[styles.dot, styles.dotRight]} />
        </View>

        {/* Partner */}
        <View style={styles.avatarWrapper}>
          {partnerPhotoUrl ? (
            <Image source={{ uri: partnerPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPartner]}>
              {partnerInitial ? (
                <Text style={styles.avatarText}>{partnerInitial}</Text>
              ) : (
                <View testID="partner-avatar-fallback">
                  <Icon name="heart" size="sm" color={colors.text.inverse} weight="fill" />
                </View>
              )}
            </View>
          )}
          {isPartnerOnline && (
            <View style={[styles.onlineDot, styles.onlineActive]} />
          )}
          {!isPartnerOnline && (
            <View style={[styles.onlineDot, styles.onlineInactive]} />
          )}
        </View>
      </View>

      {/* Status text */}
      {statusText !== '' && (
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={[styles.statusText, isPartnerTyping && styles.statusTyping]}
        >
          {statusText}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

function StreakPill({ streak, active }: { streak: number; active: boolean }) {
  const scale = useSharedValue(0.5);
  const flameRotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    // Subtle flame wiggle on mount
    flameRotate.value = withDelay(300,
      withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      )
    );
  }, [streak]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flameRotate.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.streakPill, active ? styles.streakPillActive : styles.streakPillInactive, pillStyle]}>
      <Animated.View style={flameStyle}>
        <Icon name="flame" size="xs" color={colors.accent.primary} weight="fill" />
      </Animated.View>
      <Text style={[styles.streakCount, active ? styles.streakCountActive : styles.streakCountInactive]}>
        {streak}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarYou: {
    backgroundColor: colors.accent.primary,
  },
  avatarPartner: {
    backgroundColor: colors.brand.purple,
  },
  avatarText: {
    color: colors.text.inverse,
    ...typography.h3,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface.background,
  },
  onlineActive: {
    backgroundColor: colors.semantic.success,
  },
  onlineInactive: {
    backgroundColor: colors.border.default,
  },
  connectionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    flex: 1,
    minWidth: 40,
    maxWidth: 120,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border.default,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotLeft: {
    backgroundColor: colors.accent.primary,
  },
  dotRight: {
    backgroundColor: colors.brand.purple,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    marginHorizontal: spacing.xs,
    gap: 2,
  },
  streakPillActive: {
    backgroundColor: colors.surface.warmTint,
  },
  streakPillInactive: {
    backgroundColor: colors.border.default,
  },
  streakCount: {
    ...typography.caption,
  },
  streakCountActive: {
    color: colors.accent.primary,
  },
  streakCountInactive: {
    color: colors.text.secondary,
  },
  statusText: {
    marginTop: spacing.sm,
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  statusTyping: {
    color: colors.accent.primary,
    fontStyle: 'italic',
  },
});
