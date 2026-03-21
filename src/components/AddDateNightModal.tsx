import React, { useState, useEffect } from 'react';
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
  StyleProp,
  ViewStyle,
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
import { useAddDateNight } from '@/hooks/useDateNights';
import { DATE_NIGHT_CATEGORIES } from '@/config/dateNightIdeas';
import { Icon } from './Icon';
import DateTimePicker from '@react-native-community/datetimepicker';

import type { DateNightCategory, DateNightIdea } from '@/types';

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

interface AddDateNightModalProps {
  visible: boolean;
  onClose: () => void;
  idea?: DateNightIdea;
}

export function AddDateNightModal({ visible, onClose, idea }: AddDateNightModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DateNightCategory>('at_home');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDate, setTimeDate] = useState<Date>(new Date());

  const addDateNight = useAddDateNight();

  // Pre-fill from idea when provided
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
      setCategory(idea.category);
    }
  }, [idea]);

  const canSubmit = title.trim().length > 0 && !addDateNight.isPending;

  const createScale = useSharedValue(1);
  const createAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createScale.value }],
  }));

  const handleCreate = async () => {
    if (!canSubmit) return;
    hapticNotification(NotificationFeedbackType.Success);
    try {
      await addDateNight.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        costTier: idea?.costTier ?? 'free',
        durationMinutes: idea?.durationMinutes ?? null,
        source: idea ? 'library' : 'custom',
        sourceId: idea?.id ?? null,
        scheduledDate,
        scheduledTime,
      });
      resetForm();
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('at_home');
    setScheduledDate(null);
    setScheduledTime(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (_event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setScheduledDate(selected);
    }
  };

  const handleTimeChange = (_event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selected) {
      setTimeDate(selected);
      const hours = selected.getHours().toString().padStart(2, '0');
      const minutes = selected.getMinutes().toString().padStart(2, '0');
      setScheduledTime(`${hours}:${minutes}`);
    }
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeLabel = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${minutes} ${suffix}`;
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
            <Text style={styles.modalTitle}>Plan a date night</Text>
            <Text style={styles.modalSubtitle}>
              Something to look forward to, together.
            </Text>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.label}>What are you planning?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cook a new recipe together"
              placeholderTextColor="#a8a29e"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus={!idea}
              returnKeyType="next"
            />
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.label}>
              Details <Text style={styles.labelHint}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add any notes or plans"
              placeholderTextColor="#a8a29e"
              value={description}
              onChangeText={setDescription}
              maxLength={300}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Category picker */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {DATE_NIGHT_CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <AnimatedPill
                    key={c.key}
                    style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                    onPress={() => {
                      hapticImpact();
                      setCategory(c.key);
                    }}
                  >
                    <Text style={styles.categoryIcon}>{c.icon}</Text>
                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                      {c.label}
                    </Text>
                  </AnimatedPill>
                );
              })}
            </View>
          </Animated.View>

          {/* Date & Time */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={styles.label}>
              When? <Text style={styles.labelHint}>(optional)</Text>
            </Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateButton, scheduledDate && styles.dateButtonActive]}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size="sm" color={scheduledDate ? '#c97454' : '#a8a29e'} />
                <Text style={[styles.dateButtonText, scheduledDate && styles.dateButtonTextActive]}>
                  {scheduledDate ? formatDateLabel(scheduledDate) : 'Pick a date'}
                </Text>
              </TouchableOpacity>

              {scheduledDate && (
                <TouchableOpacity
                  style={[styles.dateButton, scheduledTime && styles.dateButtonActive]}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                  activeOpacity={0.7}
                >
                  <Icon name="hourglass" size="sm" color={scheduledTime ? '#c97454' : '#a8a29e'} />
                  <Text style={[styles.dateButtonText, scheduledTime && styles.dateButtonTextActive]}>
                    {scheduledTime ? formatTimeLabel(scheduledTime) : 'Set time'}
                  </Text>
                </TouchableOpacity>
              )}

              {scheduledDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => {
                    setScheduledDate(null);
                    setScheduledTime(null);
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="x" size="xs" color="#a8a29e" />
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={scheduledDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  accentColor="#c97454"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerDone}
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  accentColor="#c97454"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerDone}
                    onPress={() => setShowTimePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>

          {/* Error message */}
          {addDateNight.isError && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {(addDateNight.error as Error)?.message || 'Something went wrong. Try again.'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Buttons -- pinned to bottom */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Animated.View style={[{ flex: 1 }, createAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.createButton, !canSubmit && styles.primaryDisabled]}
                onPress={handleCreate}
                onPressIn={() => { createScale.value = withTiming(0.97, { duration: 80 }); }}
                onPressOut={() => { createScale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
                disabled={!canSubmit}
                activeOpacity={1}
              >
                <Text style={styles.createText}>
                  {addDateNight.isPending
                    ? 'Saving...'
                    : scheduledDate
                      ? 'Plan it'
                      : 'Save'}
                </Text>
                {!addDateNight.isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
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
    backgroundColor: '#fef7f4',
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
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  categoryPillActive: {
    backgroundColor: '#fef5f0',
    borderColor: '#c97454',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
  },
  categoryTextActive: {
    color: '#c97454',
  },
  // --- Date & Time ---
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  dateButtonActive: {
    backgroundColor: '#fef5f0',
    borderColor: '#c97454',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a8a29e',
  },
  dateButtonTextActive: {
    color: '#c97454',
  },
  clearDateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
    marginBottom: 16,
  },
  pickerDone: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  // --- Error ---
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
  // --- Buttons ---
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
    backgroundColor: '#fef7f4',
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  primaryDisabled: {
    backgroundColor: '#f9a07a',
  },
});
