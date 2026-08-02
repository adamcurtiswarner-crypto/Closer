import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { CLARIFY_ANSWER_MAX, CLARIFY_QUESTION_MAX, type ClarifyExchange } from '@/hooks/useClarify';
import { Icon } from './Icon';
import { colors, radius, spacing, typography } from '@config/theme';

// The clarify exchange under an answer (founder feature 2026-08-02): one
// question, one answer, never a thread. Quiet trail styling — the exchange
// never shouts louder than the answer it hangs from. No waiting states, no
// nag copy: an unanswered question just shows as the question.

interface ClarifyBlockProps {
  /**
   * 'about-partner': under the PARTNER's answer — my exchange, or the ask
   * affordance when I haven't asked. 'about-me': under MY answer — the
   * partner's exchange, with the answer composer while it's open.
   */
  mode: 'about-partner' | 'about-me';
  exchange: ClarifyExchange | null;
  partnerName: string;
  onAsk?: (question: string) => void;
  onAnswer?: (answer: string) => void;
  pending?: boolean;
}

export function ClarifyBlock({
  mode,
  exchange,
  partnerName,
  onAsk,
  onAnswer,
  pending = false,
}: ClarifyBlockProps) {
  const { t } = useTranslation();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || pending) return;
    if (mode === 'about-partner') {
      onAsk?.(trimmed);
    } else {
      onAnswer?.(trimmed);
    }
    setComposing(false);
    setText('');
  };

  // ── about-partner: my question about their answer ──
  if (mode === 'about-partner') {
    if (!exchange) {
      if (!onAsk) return null;
      if (!composing) {
        return (
          <TouchableOpacity
            style={styles.askLink}
            onPress={() => setComposing(true)}
            accessibilityRole="button"
            activeOpacity={0.7}
            testID="clarify-ask-link"
          >
            <Icon name="chat-circle" size="sm" color={colors.accent.primary} />
            <Text style={styles.askLinkText} maxFontSizeMultiplier={1.4}>
              {t('clarify.askLink')}
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={t('clarify.askPlaceholder')}
            placeholderTextColor={colors.text.secondary}
            value={text}
            onChangeText={setText}
            maxLength={CLARIFY_QUESTION_MAX}
            multiline
            autoFocus
            testID="clarify-ask-input"
          />
          <View style={styles.composerRow}>
            <TouchableOpacity
              onPress={() => {
                setComposing(false);
                setText('');
              }}
              style={styles.composerCancel}
              accessibilityRole="button"
            >
              <Text style={styles.composerCancelText} maxFontSizeMultiplier={1.4}>
                {t('clarify.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={text.trim().length === 0 || pending}
              style={[
                styles.composerSend,
                (text.trim().length === 0 || pending) && styles.composerSendDisabled,
              ]}
              accessibilityRole="button"
              testID="clarify-ask-send"
            >
              <Text style={styles.composerSendText} maxFontSizeMultiplier={1.4}>
                {t('clarify.send')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }

    return (
      <View style={styles.trail} testID="clarify-trail-mine">
        <Text style={styles.trailLabel} maxFontSizeMultiplier={1.4}>
          {t('clarify.youAsked')}
        </Text>
        <Text style={styles.trailQuestion} maxFontSizeMultiplier={1.4}>
          {exchange.question}
        </Text>
        {exchange.answer ? (
          <Text style={styles.trailAnswer}>{exchange.answer}</Text>
        ) : null}
      </View>
    );
  }

  // ── about-me: their question about my answer ──
  if (!exchange) return null;
  return (
    <View style={styles.trail} testID="clarify-trail-theirs">
      <Text style={styles.trailLabel} maxFontSizeMultiplier={1.4}>
        {t('clarify.theyAsked', { name: partnerName })}
      </Text>
      <Text style={styles.trailQuestion} maxFontSizeMultiplier={1.4}>
        {exchange.question}
      </Text>
      {exchange.answer ? (
        <Text style={styles.trailAnswer}>{exchange.answer}</Text>
      ) : onAnswer ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={t('clarify.answerPlaceholder')}
            placeholderTextColor={colors.text.secondary}
            value={text}
            onChangeText={setText}
            maxLength={CLARIFY_ANSWER_MAX}
            multiline
            testID="clarify-answer-input"
          />
          <View style={styles.composerRow}>
            <View style={styles.composerCancel} />
            <TouchableOpacity
              onPress={submit}
              disabled={text.trim().length === 0 || pending}
              style={[
                styles.composerSend,
                (text.trim().length === 0 || pending) && styles.composerSendDisabled,
              ]}
              accessibilityRole="button"
              testID="clarify-answer-send"
            >
              <Text style={styles.composerSendText} maxFontSizeMultiplier={1.4}>
                {t('clarify.send')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  askLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingLeft: spacing.sm,
  },
  askLinkText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  trail: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border.default,
    paddingLeft: spacing.smd,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
    gap: 2,
  },
  trailLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  trailQuestion: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  trailAnswer: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  composer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.smd,
    ...typography.bodySm,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerCancel: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  composerCancelText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  composerSend: {
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  composerSendDisabled: {
    opacity: 0.4,
  },
  composerSendText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
