import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { Icon } from './Icon';

interface ConversationStarterModalProps {
  visible: boolean;
  onClose: () => void;
  starterText: string;
}

export function ConversationStarterModal({
  visible,
  onClose,
  starterText,
}: ConversationStarterModalProps) {
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(starterText);
    hapticNotification(NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToChat = () => {
    handleClose();
    router.push('/(app)/chat');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Start a conversation</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
            <Icon name="x" size="sm" color="#57534e" />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
            <View style={styles.accentBar} />
            <Icon name="chat-circle" size="xl" color="#c97454" weight="light" />
            <Text style={styles.starterText}>{starterText}</Text>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonCopied]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Icon
                name={copied ? 'check' : 'copy'}
                size="sm"
                color={copied ? '#22c55e' : '#c97454'}
              />
              <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGoToChat} activeOpacity={0.7}>
              <Text style={styles.chatLink}>Go to chat</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    paddingTop: 40,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  starterText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1c1917',
    textAlign: 'center',
    lineHeight: 26,
  },
  actions: {
    alignItems: 'center',
    gap: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef7f4',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#f5f5f4',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  copyButtonCopied: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  copyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  copyTextCopied: {
    color: '#22c55e',
  },
  chatLink: {
    color: '#c97454',
    fontSize: 14,
    fontWeight: '500',
  },
});
