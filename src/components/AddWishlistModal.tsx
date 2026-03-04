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
    } catch {
      // Error handled by mutation
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
              placeholderTextColor="#a8a29e"
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
              placeholderTextColor="#a8a29e"
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
                {!addItem.isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
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
    borderColor: '#ef5323',
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
    color: '#ef5323',
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
    backgroundColor: '#ef5323',
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
  disabled: {
    opacity: 0.4,
  },
  primaryDisabled: {
    backgroundColor: '#f9a07a',
  },
});
