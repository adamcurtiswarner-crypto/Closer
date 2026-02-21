import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import type { ChatMessage } from '@/hooks/useChat';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showTimestamp: boolean;
  onLongPress?: () => void;
}

export function ChatBubble({ message, isOwn, showTimestamp, onLongPress }: ChatBubbleProps) {
  return (
    <Animated.View entering={FadeInUp.duration(200)}>
      {showTimestamp && (
        <Text style={styles.timestamp}>
          {format(message.createdAt, 'h:mm a')}
        </Text>
      )}

      <View style={[styles.row, isOwn && styles.rowOwn]}>
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
              [message removed]
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
      </View>
    </Animated.View>
  );
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
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: '#c97454',
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  textOwn: {
    color: '#ffffff',
  },
  textPartner: {
    color: '#1c1917',
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#a8a29e',
  },
  image: {
    width: 220,
    height: 165,
    borderRadius: 12,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#a8a29e',
    textAlign: 'center',
    marginVertical: 8,
  },
});
