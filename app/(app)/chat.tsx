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
import { format, isToday, isYesterday, isSameDay, isSameYear } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { usePresence, useTypingIndicator } from '@/hooks/usePresence';
import {
  useMessages,
  useLoadOlderMessages,
  useSendMessage,
  useMarkMessagesRead,
  useDeleteMessage,
  usePartnerReadCursor,
} from '@/hooks/useChat';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '@/hooks/useChat';

function getDateSeparatorLabel(date: Date, t: (key: string) => string): string {
  if (isToday(date)) return t('chat.today');
  if (isYesterday(date)) return t('chat.yesterday');
  if (isSameYear(date, new Date())) return format(date, 'EEE, MMM d');
  return format(date, 'EEE, MMM d, yyyy');
}

export default function ChatScreen() {
  const { t } = useTranslation();
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
  const partnerReadAt = usePartnerReadCursor();
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
          options: [t('common.cancel'), t('chat.deleteMessage')],
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
      Alert.alert(t('chat.deleteMessage'), t('chat.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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

  // Check if we need a date separator above this message
  // In inverted list, index 0 is newest. We show separator when the next (older) message is on a different day.
  const shouldShowDateSeparator = (message: ChatMessage, index: number): string | null => {
    // For the oldest message (last in array), always show a separator
    if (index === messages.length - 1) {
      return getDateSeparatorLabel(message.createdAt, t);
    }
    const olderMessage = messages[index + 1];
    if (!olderMessage) return null;
    if (!isSameDay(message.createdAt, olderMessage.createdAt)) {
      return getDateSeparatorLabel(message.createdAt, t);
    }
    return null;
  };

  const getMessageStatus = (message: ChatMessage): 'sending' | 'sent' | 'read' | undefined => {
    const isOwn = message.senderId === user?.id;
    if (!isOwn) return undefined;

    // Check if this is the optimistic/pending message
    if (sendMessage.isPending && sendMessage.variables) {
      // The most recent own message during pending might be the optimistic one
      // Since Firestore snapshots arrive after write, a pending message
      // won't yet be in our messages array. So all messages from snapshot are 'sent'.
    }

    if (partnerReadAt && message.createdAt <= partnerReadAt) {
      return 'read';
    }
    return 'sent';
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const dateSeparator = shouldShowDateSeparator(item, index);

    return (
      <View>
        {/* Date separator rendered below the message in inverted list (appears above visually) */}
        {dateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{dateSeparator}</Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        <ChatBubble
          message={item}
          isOwn={item.senderId === user?.id}
          showTimestamp={shouldShowTimestamp(item, index)}
          status={getMessageStatus(item)}
          onLongPress={
            item.senderId === user?.id && !item.isDeleted
              ? () => handleDeleteMessage(item)
              : undefined
          }
        />
      </View>
    );
  };

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
            <Text style={styles.typingText}>{t('chat.writing')}</Text>
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
            <Text style={styles.emptyText}>{t('chat.startConversation')}</Text>
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
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e7e5e4',
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
  },
});
