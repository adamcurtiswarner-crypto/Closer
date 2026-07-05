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
  StyleProp,
  ViewStyle,
  Alert,
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
import { useAddWishlistItem } from '@/hooks/useWishlist';
import { WISHLIST_CATEGORIES } from '@/config/wishlistCategories';
import { Icon } from './Icon';

import { colors, spacing, typography } from '@/config/theme';
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

interface AddWishlistModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddWishlistModal({ visible, onClose }: AddWishlistModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('experiences');
  const addItem = useAddWishlistItem();

  const canSubmit = title.trim().length > 0 && !addItem.isPending;
  const createScale = useSharedValue(1);
  const createAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createScale.value }],
  }));

  const handleCreate = async () => {
    if (!canSubmit) return;
    hapticNotification(NotificationFeedbackType.Success);
    try {
      await addItem.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
      });
      setTitle('');
      setDescription('');
      setCategory('experiences');
      onClose();
    } catch (error: any) {
      Alert.alert('Unable to save', error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('experiences');
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
            <Text style={styles.modalTitle}>{t('wishlist.addToWishlist')}</Text>
            <Text style={styles.modalSubtitle}>{t('wishlist.somethingYoudLove')}</Text>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.label}>{t('wishlist.whatIsIt')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Visit Paris together"
              placeholderTextColor={colors.text.secondary}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
              returnKeyType="next"
            />
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.label}>{t('wishlist.details')} <Text style={styles.labelHint}>({t('wishlist.optional')})</Text></Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t('wishlist.addNotes')}
              placeholderTextColor={colors.text.secondary}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Category picker */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text style={styles.label}>{t('wishlist.category')}</Text>
            <View style={styles.categoryGrid}>
              {WISHLIST_CATEGORIES.map((c) => {
                const isActive = category === c.value;
                return (
                  <AnimatedPill
                    key={c.value}
                    style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                    onPress={() => {
                      hapticImpact();
                      setCategory(c.value);
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

          {/* Error message */}
          {addItem.isError && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {(addItem.error as Error)?.message || t('wishlist.failedToAdd')}
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
                  {addItem.isPending ? t('wishlist.adding') : t('wishlist.addToWishlist')}
                </Text>
                {!addItem.isPending && <Icon name="arrow-right" size="sm" color={colors.text.inverse} />}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  categoryPillActive: {
    backgroundColor: colors.surface.warmTint,
    borderColor: colors.accent.primary,
  },
  categoryIcon: {
    ...typography.body,
  },
  categoryText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.accent.primary,
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
