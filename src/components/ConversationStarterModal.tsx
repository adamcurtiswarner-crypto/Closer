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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Start a conversation</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
            <Icon name="x" size="sm" color="#6B6B7A" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
            <View style={styles.accentBar} />
            <Icon name="chat-circle" size="xl" color="#D4522A" weight="light" />
            <Text style={styles.starterText}>{starterText}</Text>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonCopied]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Icon
                name={copied ? 'check' : 'chat-text'}
                size="sm"
                color={copied ? '#22c55e' : '#D4522A'}
              />
              <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Text>
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
    backgroundColor: '#F5F2EE',
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
    color: '#1E1E2E',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2DED8',
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
    shadowColor: '#1E1E2E',
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
    backgroundColor: '#D4522A',
  },
  starterText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1E1E2E',
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
    backgroundColor: '#F5F2EE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2DED8',
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
    color: '#D4522A',
  },
  copyTextCopied: {
    color: '#22c55e',
  },
  chatLink: {
    color: '#D4522A',
    fontSize: 14,
    fontWeight: '500',
  },
});
