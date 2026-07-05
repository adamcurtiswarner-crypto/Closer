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
import { Icon } from './Icon';

import { colors, spacing, typography } from '@/config/theme';
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
              placeholderTextColor={colors.text.secondary}
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
              placeholderTextColor={colors.text.secondary}
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
                {!createGoal.isPending && <Icon name="arrow-right" size="sm" color={colors.text.inverse} />}
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
    backgroundColor: colors.surface.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
    paddingBottom: spacing.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  labelHint: {
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.surface.card,
    borderRadius: 14,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    marginBottom: spacing.lg,
  },
  descriptionInput: {
    minHeight: 88,
    maxHeight: 120,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  frequencyPill: {
    flex: 1,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    gap: 2,
  },
  frequencyPillActive: {
    backgroundColor: colors.surface.warmTint,
    borderColor: colors.accent.primary,
  },
  frequencyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  frequencyTextActive: {
    color: colors.accent.primary,
  },
  frequencyHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  frequencyHintActive: {
    color: colors.accent.primary,
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: colors.semantic.destructiveLight,
    borderRadius: 12,
    padding: spacing.smd,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.semantic.destructive,
    ...typography.bodySm,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.surface.background,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.border.default,
    borderRadius: 14,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.text.secondary,
    ...typography.body,
  },
  createButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  createText: {
    color: colors.text.inverse,
    ...typography.h3,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryDisabled: {
    opacity: 0.4,
  },
});
