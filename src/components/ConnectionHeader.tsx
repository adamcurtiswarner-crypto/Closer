import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ConnectionHeaderProps {
  userName: string | null;
  partnerName: string;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  typingContext?: 'chat' | 'prompt' | null;
  lastSeen: Date | null;
  currentStreak: number;
  isStreakActive: boolean;
  userPhotoUrl?: string | null;
  partnerPhotoUrl?: string | null;
  unreadMessageCount?: number;
  onChatPress?: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
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
  unreadMessageCount,
  onChatPress,
}: ConnectionHeaderProps) {
  const statusText = getStatusText(partnerName, isPartnerOnline, isPartnerTyping, typingContext);

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
            <View style={[styles.streakPill, isStreakActive ? styles.streakPillActive : styles.streakPillInactive]}>
              <Text style={styles.streakFlame}>{'\uD83D\uDD25'}</Text>
              <Text style={[styles.streakCount, isStreakActive ? styles.streakCountActive : styles.streakCountInactive]}>
                {currentStreak}
              </Text>
            </View>
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
              <Text style={styles.avatarText}>{getInitials(partnerName)}</Text>
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

      {/* Chat entry point */}
      {onChatPress && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={onChatPress}
          activeOpacity={0.7}
        >
          <Text style={styles.chatIcon}>{'\uD83D\uDCAC'}</Text>
          {(unreadMessageCount ?? 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadMessageCount! > 99 ? '99+' : unreadMessageCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
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
    backgroundColor: '#c97454',
  },
  avatarPartner: {
    backgroundColor: '#8b7355',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fafaf9',
  },
  onlineActive: {
    backgroundColor: '#22c55e',
  },
  onlineInactive: {
    backgroundColor: '#d6d3d1',
  },
  connectionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    width: 100,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#e7e5e4',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotLeft: {
    backgroundColor: '#c97454',
  },
  dotRight: {
    backgroundColor: '#8b7355',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 2,
  },
  streakPillActive: {
    backgroundColor: '#fef3ee',
  },
  streakPillInactive: {
    backgroundColor: '#f5f5f4',
  },
  streakFlame: {
    fontSize: 11,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakCountActive: {
    color: '#c97454',
  },
  streakCountInactive: {
    color: '#a8a29e',
  },
  chatButton: {
    marginTop: 8,
    position: 'relative',
  },
  chatIcon: {
    fontSize: 18,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#c97454',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {
    marginTop: 6,
    fontSize: 13,
    color: '#78716c',
  },
  statusTyping: {
    color: '#c97454',
    fontStyle: 'italic',
  },
});
