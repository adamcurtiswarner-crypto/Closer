import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { ToneShapes } from './ToneShapes';
import { logEvent } from '@/services/analytics';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import { scoresFor, type HearthCompletion } from '@/hooks/useHearth';

interface HearthTalkSheetProps {
  visible: boolean;
  completion: HearthCompletion | null;
  myUid: string;
  partnerName: string;
  marking?: boolean;
  onMarkDiscussed: (completionId: string) => void;
  onClose: () => void;
}

type RitualState = 'unmarked' | 'waiting' | 'tended';

/**
 * "Take it to the couch" — pageSheet ritual for repair/divergence entries.
 * Both partners mark "we talked"; when the partner's mark lands server-side
 * (discussed_at via onSnapshot) the sheet settles into sage with one quiet
 * medium haptic — the tended beat.
 */
export function HearthTalkSheet({
  visible,
  completion,
  myUid,
  partnerName,
  marking = false,
  onMarkDiscussed,
  onClose,
}: HearthTalkSheetProps) {
  const { t } = useTranslation();

  const tended = completion?.discussedAt != null;
  const iMarked = !!(completion && completion.discussed[myUid]);
  const partnerMarked = !!(
    completion && Object.keys(completion.discussed).some((uid) => uid !== myUid)
  );

  const ritualState: RitualState = tended ? 'tended' : iMarked ? 'waiting' : 'unmarked';

  // The tended beat fires exactly once, and only on the live transition
  // from un-tended to tended while the sheet is up.
  const sawUntendedRef = useRef(false);
  const settleFiredRef = useRef(false);
  const completionId = completion?.id ?? null;

  useEffect(() => {
    sawUntendedRef.current = false;
    settleFiredRef.current = false;
  }, [completionId]);

  useEffect(() => {
    if (!visible || !completionId) return;
    if (!tended) {
      sawUntendedRef.current = true;
      return;
    }
    if (sawUntendedRef.current && !settleFiredRef.current) {
      settleFiredRef.current = true;
      hapticImpact(ImpactFeedbackStyle.Medium);
      logEvent('completion_tended', { completion_id: completionId });
    }
  }, [visible, tended, completionId]);

  if (!completion) return null;

  const isDivergence = completion.signal === 'divergence';
  const starterVisual = isDivergence
    ? { bg: colors.brand.purpleLight, fg: colors.brand.purple }
    : { bg: colors.accent.primaryLight, fg: colors.accent.primary };
  const { mine, theirs } = scoresFor(completion, myUid);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handleBar} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          testID="talk-sheet-close"
        >
          <Icon name="x" size="sm" color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Ink hero — the prompt this ember came from */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(80).reduceMotion(ReduceMotion.System)}
            style={styles.heroCard}
          >
            <ToneShapes variant="black" />
            <Text style={styles.heroEyebrow} maxFontSizeMultiplier={1.4}>
              {t('hearth.talkSheet.eyebrow')}
            </Text>
            <Text style={styles.heroPrompt}>
              {'“'}
              {completion.promptText}
              {'”'}
            </Text>
            {mine != null && theirs != null && (
              <View style={styles.chipRow}>
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreChipText} maxFontSizeMultiplier={1.4}>
                    {t('hearth.youChip', { score: mine })}
                  </Text>
                </View>
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreChipText} maxFontSizeMultiplier={1.4}>
                    {t('hearth.partnerChip', { name: partnerName, score: theirs })}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Conversation starter */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200).reduceMotion(ReduceMotion.System)}
            style={[styles.starterCard, { backgroundColor: starterVisual.bg }]}
          >
            <Text
              style={[styles.starterLabel, { color: starterVisual.fg }]}
              maxFontSizeMultiplier={1.4}
            >
              {t('hearth.talkSheet.starterLabel')}
            </Text>
            <Text style={styles.starterText}>
              {isDivergence
                ? t('hearth.talkSheet.starterDivergence')
                : t('hearth.talkSheet.starterRepair')}
            </Text>
            <Text style={styles.starterHint} maxFontSizeMultiplier={1.4}>
              {t('hearth.talkSheet.starterHint')}
            </Text>
          </Animated.View>

          {/* The ritual */}
          <View style={styles.footer}>
            {ritualState === 'tended' ? (
              <Animated.View
                key="tended"
                entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
                style={styles.ritual}
                testID="talk-sheet-tended"
              >
                <View style={styles.tendedPill}>
                  <Text style={styles.tendedPillText} maxFontSizeMultiplier={1.4}>
                    {t('hearth.talkSheet.tendedTogether')}
                  </Text>
                </View>
                <Animated.View
                  entering={FadeInUp.duration(500)
                    .delay(150)
                    .reduceMotion(ReduceMotion.System)}
                  style={styles.settleCard}
                  testID="talk-sheet-settle-card"
                >
                  <Text style={styles.settleText}>{t('hearth.talkSheet.settleBody')}</Text>
                </Animated.View>
              </Animated.View>
            ) : ritualState === 'waiting' ? (
              <Animated.View
                key="waiting"
                entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
                style={styles.ritual}
                testID="talk-sheet-waiting"
              >
                <View style={styles.waitingPill}>
                  <Text style={styles.waitingText} maxFontSizeMultiplier={1.4}>
                    {t('hearth.talkSheet.waitingForPartner', { name: partnerName })}
                  </Text>
                </View>
                <Text style={styles.waitingSub} maxFontSizeMultiplier={1.4}>
                  {t('hearth.talkSheet.waitingSub')}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                key="unmarked"
                entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
                style={styles.ritual}
              >
                {partnerMarked && (
                  <Text style={styles.partnerFirstText} testID="talk-sheet-partner-first">
                    {t('hearth.talkSheet.partnerMarkedFirst', { name: partnerName })}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.markPill, marking && styles.markPillDisabled]}
                  onPress={() => onMarkDiscussed(completion.id)}
                  disabled={marking}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  testID="talk-sheet-mark-button"
                >
                  <Text style={styles.markPillText} maxFontSizeMultiplier={1.4}>
                    {t('hearth.talkSheet.markTalked')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginTop: spacing.smd,
    marginBottom: spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.smd,
    right: spacing.smd,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
  },

  // Ink hero
  heroCard: {
    backgroundColor: colors.surface.ink,
    borderRadius: radius.hero,
    padding: spacing.cardPad,
    overflow: 'hidden',
    gap: spacing.smd,
    ...shadow.card,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: colors.onDark.muted,
  },
  heroPrompt: {
    ...typography.heading,
    color: colors.text.inverse,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreChip: {
    backgroundColor: colors.onDark.field,
    borderWidth: 1,
    borderColor: colors.onDark.outline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
  },
  scoreChipText: {
    ...typography.caption,
    color: colors.onDark.body,
  },

  // Starter card
  starterCard: {
    borderRadius: radius.card,
    padding: spacing.cardPad,
    marginTop: spacing.section,
    gap: spacing.sm,
  },
  starterLabel: {
    ...typography.eyebrow,
  },
  starterText: {
    ...typography.body,
    color: colors.text.primary,
  },
  starterHint: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Ritual footer
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
  },
  ritual: {
    gap: spacing.sm,
  },
  markPill: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    ...shadow.accent,
  },
  markPillDisabled: {
    opacity: 0.4,
  },
  markPillText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  partnerFirstText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  waitingPill: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.warmTint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  waitingText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  waitingSub: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tendedPill: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  tendedPillText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  settleCard: {
    borderRadius: radius.card,
    backgroundColor: colors.brand.greenLight,
    padding: spacing.md,
  },
  settleText: {
    ...typography.bodySm,
    color: colors.semantic.success,
    textAlign: 'center',
  },
});
