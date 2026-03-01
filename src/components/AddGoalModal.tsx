import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { useTranslation } from 'react-i18next';
import { useCreateGoal, type TargetFrequency } from '@/hooks/useGoals';
import { Icon } from '@/components';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
}

const FREQUENCIES: { value: TargetFrequency; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: '7 per week' },
  { value: 'weekly', label: 'Weekly', hint: '4 per month' },
  { value: 'monthly', label: 'Monthly', hint: '1 per month' },
  { value: 'one_time', label: 'One-time', hint: 'Just once' },
];

function AnimatedPill({ children, onPress, style }: {
  children: React.ReactNode;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.95, { duration: 80 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<TargetFrequency>('weekly');
  const createGoal = useCreateGoal();

  const createButtonScale = useSharedValue(1);
  const createButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  const canSubmit = title.trim().length > 0 && !createGoal.isPending;

  const handleCreate = async () => {
    if (!canSubmit) return;
    hapticNotification(NotificationFeedbackType.Success);
    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        targetFrequency: frequency,
      });
      setTitle('');
      setDescription('');
      setFrequency('weekly');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setFrequency('weekly');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.modalTitle}>{t('goals.newGoal')}</Text>
            <Text style={styles.modalSubtitle}>{t('goals.setGoalSubtitle')}</Text>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.label}>{t('goals.titleLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Weekly date night"
              placeholderTextColor="#a8a29e"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              autoFocus
              returnKeyType="next"
            />
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.label}>{t('goals.descriptionLabel')} <Text style={styles.labelHint}>({t('wishlist.optional')})</Text></Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t('goals.descriptionPlaceholder')}
              placeholderTextColor="#a8a29e"
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Frequency picker */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text style={styles.label}>{t('goals.howOften')}</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map((f) => {
                const isActive = frequency === f.value;
                return (
                  <AnimatedPill
                    key={f.value}
                    style={[styles.frequencyPill, isActive && styles.frequencyPillActive]}
                    onPress={() => {
                      hapticImpact();
                      setFrequency(f.value);
                    }}
                  >
                    <Text style={[styles.frequencyText, isActive && styles.frequencyTextActive]}>
                      {f.label}
                    </Text>
                    <Text style={[styles.frequencyHint, isActive && styles.frequencyHintActive]}>
                      {f.hint}
                    </Text>
                  </AnimatedPill>
                );
              })}
            </View>
          </Animated.View>

          {/* Error message */}
          {createGoal.isError && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {(createGoal.error as Error)?.message || t('goals.failedToCreate')}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Buttons — pinned to bottom */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Animated.View style={[{ flex: 1 }, createButtonAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.createButton, !canSubmit && styles.primaryDisabled]}
                onPress={handleCreate}
                onPressIn={() => { createButtonScale.value = withTiming(0.97, { duration: 80 }); }}
                onPressOut={() => { createButtonScale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
                disabled={!canSubmit}
                activeOpacity={1}
              >
                <Text style={styles.createText}>
                  {createGoal.isPending ? t('common.saving') : t('goals.createGoal')}
                </Text>
                {!createGoal.isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
    alignSelf: 'center',
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#78716c',
    marginTop: 4,
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534e',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  labelHint: {
    fontWeight: '500',
    color: '#a8a29e',
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1c1917',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    marginBottom: 24,
    lineHeight: 22,
  },
  descriptionInput: {
    minHeight: 88,
    maxHeight: 120,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  frequencyPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    gap: 2,
  },
  frequencyPillActive: {
    backgroundColor: '#fef7f4',
    borderColor: '#c97454',
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716c',
  },
  frequencyTextActive: {
    color: '#c97454',
  },
  frequencyHint: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a8a29e',
  },
  frequencyHintActive: {
    color: '#c97454',
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#57534e',
    fontWeight: '600',
    fontSize: 16,
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryDisabled: {
    opacity: 0.4,
    backgroundColor: '#d4a48e',
  },
});
