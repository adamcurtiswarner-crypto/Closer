import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@utils/haptics';
import { Icon } from './Icon';

interface ConversationStarterModalProps {
  visible: boolean;
  onClose: () => void;
  starterText: string;
  durationMinutes?: number;
}

export function ConversationStarterModal({
  visible,
  onClose,
  starterText,
  durationMinutes,
}: ConversationStarterModalProps) {
  const [copied, setCopied] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(durationMinutes ?? 5);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      clearTimer();
      setTimerActive(false);
      setCopied(false);
    }
  }, [visible, clearTimer]);

  const startTimer = () => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    setSecondsLeft(selectedMinutes * 60);
    setTimerActive(true);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          hapticNotification(NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    clearTimer();
    setCopied(false);
    setTimerActive(false);
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const TIMER_OPTIONS = [3, 5, 10];

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
            <Icon name="x" size="sm" color="#57534e" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
            <View style={styles.accentBar} />
            <Icon name="chat-circle" size="xl" color="#c97454" weight="light" />
            <Text style={styles.starterText}>{starterText}</Text>
          </Animated.View>

          {durationMinutes !== undefined && (
            <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.timerSection}>
              {!timerActive ? (
                <>
                  <Text style={styles.timerLabel}>Set a timer</Text>
                  <View style={styles.timerOptions}>
                    {TIMER_OPTIONS.map((min) => (
                      <TouchableOpacity
                        key={min}
                        style={[
                          styles.timerOption,
                          selectedMinutes === min && styles.timerOptionSelected,
                        ]}
                        onPress={() => setSelectedMinutes(min)}
                      >
                        <Text
                          style={[
                            styles.timerOptionText,
                            selectedMinutes === min && styles.timerOptionTextSelected,
                          ]}
                        >
                          {min} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.startTimerBtn} onPress={startTimer}>
                    <Icon name="play" size="sm" color="#ffffff" weight="fill" />
                    <Text style={styles.startTimerText}>Start</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.timerRunning}>
                  <Text style={styles.timerCountdown}>
                    {secondsLeft === 0 ? 'Time is up' : formatTime(secondsLeft)}
                  </Text>
                  {secondsLeft === 0 && (
                    <Text style={styles.timerDoneSubtext}>How did it go?</Text>
                  )}
                </View>
              )}
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonCopied]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Icon
                name={copied ? 'check' : 'chat-text'}
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
    backgroundColor: '#fef7f4',
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
  timerSection: {
    alignItems: 'center',
    gap: 12,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
  timerOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  timerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  timerOptionSelected: {
    backgroundColor: '#c97454',
  },
  timerOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#57534e',
  },
  timerOptionTextSelected: {
    color: '#ffffff',
  },
  startTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#c97454',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startTimerText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  timerRunning: {
    alignItems: 'center',
    gap: 4,
  },
  timerCountdown: {
    fontSize: 48,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -1,
  },
  timerDoneSubtext: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
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
