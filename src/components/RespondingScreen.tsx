import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToneShapes } from '@/components/ToneShapes';
import { ScaleSlider } from '@/components/ScaleSlider';
import { DEFAULT_SCALE_CONFIG } from '@/utils/scale';
import type { ScaleConfig } from '@/types';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { useTranslation } from 'react-i18next';

/**
 * The original question a follow-up chains from — rendered as a quiet
 * quote block above the follow-up prompt so the couple answers against
 * the right context (founder ask, 2026-08-02).
 */
export interface RespondingTrail {
  promptText: string;
  /** Pre-built score line ("You 3 · Masha 8") or null for text parents. */
  metaLine: string | null;
}

interface RespondingScreenProps {
  promptText: string;
  /** Quiet follow-up context line rendered above the prompt text */
  contextText?: string | null;
  /** The original question this follow-up chains from, when known. */
  trail?: RespondingTrail | null;
  responseText: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  /**
   * Scale prompts routed through the editor (open days, the yesterday
   * chip): the score is required, the note optional — same contract as the
   * Today card. Null/omitted = plain text prompt (10-char minimum).
   */
  scale?: {
    config: ScaleConfig | null;
    value: number | null;
    onChange: (value: number) => void;
  } | null;
}

// The full-screen text editor renders on the same ink hero surface as the
// daily prompt card and Explore's responding mode — one design language for
// every prompt (no quote marks, heading scale, tone shapes). The add-photo
// affordance was removed 2026-08-02 (founder ask).
export function RespondingScreen({
  promptText,
  contextText = null,
  trail = null,
  responseText,
  onChangeText,
  onSubmit,
  onCancel,
  isPending,
  scale = null,
}: RespondingScreenProps) {
  const { t } = useTranslation();
  const scaleConfig = scale ? (scale.config ?? DEFAULT_SCALE_CONFIG) : null;
  // Scale: score required, note optional. Text: the 10-character floor.
  const canSubmit = scale ? scale.value != null : responseText.length >= 10;
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
          <Animated.View entering={FadeIn.duration(300)} style={styles.heroCard}>
            <ToneShapes variant="black" />

            {contextText ? (
              <Text style={styles.heroEyebrow} maxFontSizeMultiplier={1.4}>
                {contextText}
              </Text>
            ) : null}

            {trail ? (
              <View style={styles.trailBlock} testID="responding-trail">
                <Text style={styles.trailPrompt} maxFontSizeMultiplier={1.4}>
                  {trail.promptText}
                </Text>
                {trail.metaLine ? (
                  <Text style={styles.trailMeta} maxFontSizeMultiplier={1.4}>
                    {trail.metaLine}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.heroPrompt}>{promptText}</Text>

            {scale && scaleConfig ? (
              <Animated.View entering={FadeInUp.duration(400).delay(80)} style={styles.heroScale}>
                <ScaleSlider
                  value={scale.value}
                  onChange={scale.onChange}
                  minLabel={scaleConfig.minLabel}
                  maxLabel={scaleConfig.maxLabel}
                  min={scaleConfig.min}
                  max={scaleConfig.max}
                  tone="dark"
                />
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
              <TextInput
                style={[styles.heroInput, scale ? styles.heroInputScale : null]}
                placeholder={scale ? t('today.scaleNotePlaceholder') : t('today.sharePlaceholder')}
                placeholderTextColor={colors.onDark.faint}
                multiline
                textAlignVertical="top"
                value={responseText}
                onChangeText={onChangeText}
                autoFocus={!scale}
              />
            </Animated.View>
          </Animated.View>

          <View style={styles.respondingFooter}>
            <Text style={styles.charHint}>
              {scale
                ? canSubmit
                  ? t('today.readyToShare')
                  : t('today.chooseNumber')
                : responseText.length < 10
                  ? t('today.moreCharacters', { count: 10 - responseText.length })
                  : t('today.readyToShare')}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>{t('today.back')}</Text>
              </TouchableOpacity>
              <Animated.View style={[{ flex: 1 }, submitAnimStyle]}>
                <TouchableOpacity
                  style={[styles.submitButton, (!canSubmit || isPending) && styles.disabled]}
                  onPress={onSubmit}
                  onPressIn={() => { submitScale.value = withTiming(0.96, { duration: 100 }); }}
                  onPressOut={() => { submitScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
                  disabled={!canSubmit || isPending}
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
  },
  respondingScroll: {
    padding: spacing.screen,
    flexGrow: 1,
  },

  // The ink hero card — same surface as the daily prompt card and Explore
  heroCard: {
    backgroundColor: colors.surface.ink,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    paddingTop: spacing.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: colors.onDark.muted,
    marginBottom: spacing.smd,
  },
  // The trail — the original question as a quiet quote block, never louder
  // than the question being answered now
  trailBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.onDark.outline,
    paddingLeft: spacing.smd,
    marginBottom: spacing.md,
    gap: 2,
  },
  trailPrompt: {
    ...typography.bodySm,
    color: colors.onDark.body,
  },
  trailMeta: {
    ...typography.caption,
    color: colors.onDark.muted,
  },
  heroPrompt: {
    ...typography.headingLg,
    color: colors.text.inverse,
  },
  heroScale: {
    marginTop: spacing.md,
  },
  heroInput: {
    marginTop: spacing.md,
    backgroundColor: colors.onDark.field,
    borderRadius: radius.input,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.inverse,
    minHeight: 160,
    maxHeight: 260,
    textAlignVertical: 'top',
  },

  heroInputScale: {
    minHeight: 90,
  },
  respondingFooter: {
    marginTop: spacing.xs,
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
    ...typography.body,
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
