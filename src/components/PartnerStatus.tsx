import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { PresenceIndicator } from './PresenceIndicator';

interface PartnerStatusProps {
  isOnline: boolean;
  isTyping: boolean;
  typingContext?: 'prompt' | null;
  lastSeen: Date | null;
  partnerName?: string;
  showIndicator?: boolean;
}

export function PartnerStatus({
  isOnline,
  isTyping,
  typingContext,
  lastSeen,
  partnerName = 'Partner',
  showIndicator = true,
}: PartnerStatusProps) {
  const getStatusText = () => {
    if (isTyping) {
      if (typingContext === 'prompt') {
        return `${partnerName} is responding...`;
      }
      return `${partnerName} is typing...`;
    }

    if (isOnline) {
      return `${partnerName} is online`;
    }

    if (lastSeen) {
      const timeAgo = formatDistanceToNow(lastSeen, { addSuffix: true });
      return `Last seen ${timeAgo}`;
    }

    return 'Offline';
  };

  return (
    <View style={styles.container}>
      {showIndicator && !isTyping && (
        <PresenceIndicator isOnline={isOnline} size="small" />
      )}
      {isTyping && (
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      )}
      <Text style={[styles.statusText, isTyping && styles.typingText]}>
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#78716c',
  },
  typingText: {
    color: '#c97454',
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c97454',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});
