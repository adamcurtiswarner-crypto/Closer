import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Alert,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { usePresence, useTypingIndicator } from '@/hooks/usePresence';
import {
  useMessages,
  useLoadOlderMessages,
  useSendMessage,
  useMarkMessagesRead,
  useDeleteMessage,
} from '@/hooks/useChat';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { logEvent } from '@/services/analytics';
import type { ChatMessage } from '@/hooks/useChat';

export default function ChatScreen() {
  const { user } = useAuth();
  const {
    isPartnerOnline,
    isPartnerTyping,
    partnerTypingContext,
    setTyping,
  } = usePresence();

  const { messages, isLoading } = useMessages();
  const loadOlder = useLoadOlderMessages();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();
  const deleteMessage = useDeleteMessage();
  const { handleTextChange: handleTypingIndicator } = useTypingIndicator();

  const partnerName = user?.partnerName || 'Partner';

  // Mark messages read on focus
  useFocusEffect(
    useCallback(() => {
      markRead();
      logEvent('chat_opened');
    }, [markRead])
  );

  const handleSend = (text: string, imageUri?: string | null) => {
    sendMessage.mutate({ text, imageUri });
  };

  const handleTyping = (isTyping: boolean) => {
    if (isTyping) {
      setTyping(true, 'chat');
      handleTypingIndicator('typing', 'chat');
    } else {
      setTyping(false);
    }
  };

  const handleDeleteMessage = (message: ChatMessage) => {
    if (message.senderId !== user?.id) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete message'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            deleteMessage.mutate(message.id);
          }
        }
      );
    } else {
      Alert.alert('Delete message', 'This message will be removed for both of you.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage.mutate(message.id),
        },
      ]);
    }
  };

  const handleLoadMore = () => {
    if (loadOlder.isPending || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    if (!oldest) return;

    loadOlder.mutate({
      oldestTimestamp: oldest.createdAt,
      currentMessages: messages,
    });
  };

  const shouldShowTimestamp = (message: ChatMessage, index: number) => {
    if (index === messages.length - 1) return true; // Last (oldest in inverted)
    const prev = messages[index + 1];
    if (!prev) return true;
    // Show timestamp if gap > 5 minutes
    const gap = Math.abs(message.createdAt.getTime() - prev.createdAt.getTime());
    return gap > 5 * 60 * 1000;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <ChatBubble
      message={item}
      isOwn={item.senderId === user?.id}
      showTimestamp={shouldShowTimestamp(item, index)}
      onLongPress={
        item.senderId === user?.id && !item.isDeleted
          ? () => handleDeleteMessage(item)
          : undefined
      }
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.partnerNameRow}>
            <Text style={styles.headerTitle}>{partnerName}</Text>
            {isPartnerOnline && <View style={styles.onlineDot} />}
          </View>
          {isPartnerTyping && partnerTypingContext === 'chat' && (
            <Text style={styles.typingText}>writing...</Text>
          )}
        </View>

        <View style={styles.backButton} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
          />
        )}

        <SafeAreaView edges={['bottom']}>
          <ChatInput
            onSend={handleSend}
            onTyping={handleTyping}
            isSending={sendMessage.isPending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#57534e',
  },
  headerCenter: {
    alignItems: 'center',
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  typingText: {
    fontSize: 12,
    color: '#c97454',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#a8a29e',
  },
  listContent: {
    paddingVertical: 8,
  },
});
