import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import type { ChatMessage } from '@/hooks/useChat';
import { SwipeableRow } from './SwipeableRow';
import { Icon } from './Icon';

type DeliveryStatus = 'sending' | 'sent' | 'read';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showTimestamp: boolean;
  onLongPress?: () => void;
  onDelete?: () => void;
  status?: DeliveryStatus;
}

function StatusIndicator({ status }: { status: DeliveryStatus }) {
  if (status === 'sending') {
    return <Icon name="hourglass" size={10} color="#B8B8C4" />;
  }
  if (status === 'read') {
    return <Icon name="checks" size={10} color="#D4522A" weight="bold" />;
  }
  // sent
  return <Icon name="check" size={10} color="#B8B8C4" weight="bold" />;
}

export function ChatBubble({ message, isOwn, showTimestamp, onLongPress, onDelete, status }: ChatBubbleProps) {
  const bubbleContent = (
    <Animated.View entering={FadeInUp.duration(200)}>
      {showTimestamp && (
        <Text style={styles.timestamp}>
          {format(message.createdAt, 'h:mm a')}
        </Text>
      )}

      <View style={[styles.row, isOwn && styles.rowOwn]}>
        <View style={styles.bubbleWrapper}>
          <TouchableOpacity
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubblePartner,
            ]}
            onLongPress={onLongPress}
            activeOpacity={0.8}
            disabled={!onLongPress}
          >
            {message.isDeleted ? (
              <Text style={[styles.text, styles.deletedText]}>
                This message was removed
              </Text>
            ) : (
              <>
                {message.imageUrl && (
                  <Image
                    source={{ uri: message.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                )}
                {message.text && message.text !== '[message removed]' && (
                  <Text
                    style={[
                      styles.text,
                      isOwn ? styles.textOwn : styles.textPartner,
                    ]}
                  >
                    {message.text}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>

          {isOwn && status && (
            <View style={styles.statusRow}>
              <StatusIndicator status={status} />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  if (isOwn && onDelete) {
    return (
      <SwipeableRow
        rightActions={[{ label: 'Delete', color: '#ef4444', onPress: onDelete }]}
      >
        {bubbleContent}
      </SwipeableRow>
    );
  }

  return bubbleContent;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: '#D4522A',
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2DED8',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    lineHeight: 22,
  },
  textOwn: {
    color: '#ffffff',
  },
  textPartner: {
    color: '#1E1E2E',
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#B8B8C4',
  },
  image: {
    width: 220,
    height: 165,
    borderRadius: 12,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    color: '#B8B8C4',
    textAlign: 'center',
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    paddingRight: 4,
  },
});
