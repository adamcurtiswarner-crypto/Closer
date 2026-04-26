import React, { useState, useCallback } from 'react';
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
import { useCompleteDateNight } from '@/hooks/useDateNights';

import type { DateNight } from '@/types';

type Rating = 'warm' | 'okay' | 'not_great';

const RATING_OPTIONS: { key: Rating; label: string; sublabel: string }[] = [
  { key: 'warm', label: 'Warm', sublabel: 'felt connected' },
  { key: 'okay', label: 'Okay', sublabel: 'it was fine' },
  { key: 'not_great', label: 'Not great', sublabel: 'felt off' },
];

function RatingPill({
  label,
  sublabel,
  isActive,
  onPress,
}: {
  label: string;
  sublabel: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.ratingPill, isActive && styles.ratingPillActive]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.95, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        }}
        activeOpacity={1}
      >
        <Text style={[styles.ratingLabel, isActive && styles.ratingLabelActive]}>
          {label}
        </Text>
        <Text style={[styles.ratingSublabel, isActive && styles.ratingSublabelActive]}>
          {sublabel}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CompleteDateNightModalProps {
  visible: boolean;
  onClose: () => void;
  dateNight: DateNight | null;
}

export function CompleteDateNightModal({
  visible,
  onClose,
  dateNight,
}: CompleteDateNightModalProps) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState('');

  const completeDateNight = useCompleteDateNight();

  const doneScale = useSharedValue(1);
  const doneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneScale.value }],
  }));

  const resetForm = useCallback(() => {
    setRating(null);
    setNote('');
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDone = async () => {
    if (!dateNight) return;
    hapticNotification(NotificationFeedbackType.Success);
    try {
      await completeDateNight.mutateAsync({
        dateNightId: dateNight.id,
        reflectionRating: rating ?? undefined,
        reflectionNote: note.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSelectRating = (r: Rating) => {
    hapticImpact();
    setRating(r);
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

          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.dateNightTitle} numberOfLines={2}>
              {dateNight?.title}
            </Text>
          </Animated.View>

          {/* How was it? */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.sectionHeader}>How was it?</Text>
          </Animated.View>

          {/* Rating pills */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.ratingRow}
          >
            {RATING_OPTIONS.map((opt) => (
              <RatingPill
                key={opt.key}
                label={opt.label}
                sublabel={opt.sublabel}
                isActive={rating === opt.key}
                onPress={() => handleSelectRating(opt.key)}
              />
            ))}
          </Animated.View>

          {/* Note input */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <TextInput
              style={styles.noteInput}
              placeholder="Any thoughts to remember?"
              placeholderTextColor="#a8a29e"
              value={note}
              onChangeText={setNote}
              maxLength={200}
              returnKeyType="done"
            />
          </Animated.View>

          {/* Error message */}
          {completeDateNight.isError && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {(completeDateNight.error as Error)?.message ||
                  'Something went wrong. Try again.'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Buttons -- pinned to bottom */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          style={styles.buttonContainer}
        >
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Animated.View style={[{ flex: 1 }, doneAnimatedStyle]}>
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  completeDateNight.isPending && styles.primaryDisabled,
                ]}
                onPress={handleDone}
                onPressIn={() => {
                  doneScale.value = withTiming(0.97, { duration: 80 });
                }}
                onPressOut={() => {
                  doneScale.value = withSpring(1, { damping: 15, stiffness: 200 });
                }}
                disabled={completeDateNight.isPending}
                activeOpacity={1}
              >
                <Text style={styles.doneText}>
                  {completeDateNight.isPending ? 'Saving...' : 'Done'}
                </Text>
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
  dateNightTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.5,
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#57534e',
    marginBottom: 16,
  },
  // --- Rating Pills ---
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  ratingPill: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    gap: 4,
  },
  ratingPillActive: {
    backgroundColor: '#fef5f0',
    borderColor: '#c97454',
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#57534e',
  },
  ratingLabelActive: {
    color: '#c97454',
  },
  ratingSublabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a8a29e',
  },
  ratingSublabelActive: {
    color: '#c97454',
  },
  // --- Note Input ---
  noteInput: {
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
  doneButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  primaryDisabled: {
    backgroundColor: '#f9a07a',
  },
});
