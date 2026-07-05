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

import { colors, spacing, typography } from '@/config/theme';
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
            <Icon name="x" size="sm" color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
            <Icon name="chat-circle" size="xl" color={colors.accent.primary} weight="light" />
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
                color={copied ? colors.semantic.success : colors.accent.primary}
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
    backgroundColor: colors.surface.background,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginTop: spacing.smd,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.xl,
    paddingTop: spacing.xl,
    overflow: 'hidden',
    alignItems: 'center',
    gap: spacing.cardPad,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  starterText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: spacing.cardPad,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.background,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screen,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  copyButtonCopied: {
    backgroundColor: colors.semantic.successLight,
    borderColor: colors.semantic.successLight,
  },
  copyText: {
    ...typography.body,
    color: colors.accent.primary,
  },
  copyTextCopied: {
    color: colors.semantic.success,
  },
  chatLink: {
    color: colors.accent.primary,
    ...typography.bodySm,
  },
});
