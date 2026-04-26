import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
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

function TypingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.3, { duration: 300 })
          ),
          -1
        )
      );
    dot1.value = pulse(0);
    dot2.value = pulse(150);
    dot3.value = pulse(300);
  }, []);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingDots}>
      <Animated.View style={[styles.dot, style1]} />
      <Animated.View style={[styles.dot, style2]} />
      <Animated.View style={[styles.dot, style3]} />
    </View>
  );
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
      {isTyping && <TypingDots />}
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
    fontFamily: 'Inter-Regular',
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
});
