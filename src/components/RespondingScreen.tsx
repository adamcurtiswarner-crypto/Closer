import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@components';
import { colors, radius, spacing, typography } from '@config/theme';
import { useTranslation } from 'react-i18next';

interface RespondingScreenProps {
  promptText: string;
  /** Quiet follow-up context line rendered above the prompt text */
  contextText?: string | null;
  responseText: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onAddPhoto: () => void;
  selectedImage: string | null;
  onRemovePhoto: () => void;
  isPending: boolean;
}

export function RespondingScreen({
  promptText,
  contextText = null,
  responseText,
  onChangeText,
  onSubmit,
  onCancel,
  onAddPhoto,
  selectedImage,
  onRemovePhoto,
  isPending,
}: RespondingScreenProps) {
  const { t } = useTranslation();
  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.respondingScroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(300)} style={styles.respondingHeader}>
            {contextText ? (
              <Text style={styles.contextText}>{contextText}</Text>
            ) : null}
            <Text style={styles.respondingPrompt}>
              {'\u201C'}{promptText}{'\u201D'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <TextInput
              style={styles.textInput}
              placeholder={t('today.sharePlaceholder')}
              placeholderTextColor={colors.text.secondary}
              multiline
              textAlignVertical="top"
              value={responseText}
              onChangeText={onChangeText}
              autoFocus
            />
          </Animated.View>

          {selectedImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImage} onPress={onRemovePhoto} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size="xs" color={colors.text.inverse} weight="bold" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.attachPhotoButton} onPress={onAddPhoto}>
              <Icon name="camera" size="md" color={colors.text.secondary} />
              <Text style={styles.attachPhotoText}>{t('today.addPhoto')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.respondingFooter}>
            <Text style={styles.charHint}>
              {responseText.length < 10
                ? t('today.moreCharacters', { count: 10 - responseText.length })
                : t('today.readyToShare')}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>Back</Text>
              </TouchableOpacity>
              <Animated.View style={[{ flex: 1 }, submitAnimStyle]}>
                <TouchableOpacity
                  style={[styles.submitButton, (responseText.length < 10 || isPending) && styles.disabled]}
                  onPress={onSubmit}
                  onPressIn={() => { submitScale.value = withTiming(0.96, { duration: 100 }); }}
                  onPressOut={() => { submitScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
                  disabled={responseText.length < 10 || isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitText} maxFontSizeMultiplier={1.4}>
                    {isPending ? t('today.sending') : t('today.share')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  respondingScroll: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  respondingHeader: {
    marginBottom: spacing.lg,
  },
  contextText: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  respondingPrompt: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.screen,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    minHeight: 140,
    maxHeight: 240,
  },
  attachPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.smd,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.border.default,
    borderRadius: radius.input,
  },
  attachPhotoText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  imagePreview: {
    marginTop: spacing.smd,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: radius.input,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respondingFooter: {
    marginTop: spacing.smd,
  },
  charHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  disabled: {
    opacity: 0.4,
  },
});
