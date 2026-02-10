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
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCreateGoal, type TargetFrequency } from '@/hooks/useGoals';

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

export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<TargetFrequency>('weekly');
  const createGoal = useCreateGoal();

  const canSubmit = title.trim().length > 0 && !createGoal.isPending;

  const handleCreate = async () => {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            <Text style={styles.modalTitle}>New Goal</Text>
            <Text style={styles.modalSubtitle}>Set a goal to strengthen your connection</Text>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.label}>Title</Text>
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
            <Text style={styles.label}>Description <Text style={styles.labelHint}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add some details..."
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
            <Text style={styles.label}>How often?</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map((f) => {
                const isActive = frequency === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.frequencyPill, isActive && styles.frequencyPillActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFrequency(f.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.frequencyText, isActive && styles.frequencyTextActive]}>
                      {f.label}
                    </Text>
                    <Text style={[styles.frequencyHint, isActive && styles.frequencyHintActive]}>
                      {f.hint}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Error message */}
          {createGoal.isError && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {(createGoal.error as Error)?.message || 'Failed to create goal'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Buttons — pinned to bottom */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, !canSubmit && styles.disabled]}
              onPress={handleCreate}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.createText}>
                {createGoal.isPending ? 'Creating...' : 'Create Goal'}
              </Text>
              {!createGoal.isPending && <Text style={styles.createArrow}>{'\u2192'}</Text>}
            </TouchableOpacity>
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
  createArrow: {
    color: '#ffffff',
    fontSize: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});
