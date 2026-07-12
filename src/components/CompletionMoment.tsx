import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { revealSeenKey } from '@/utils/revealGate';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { AccentBar } from './AccentBar';
import { ResponseCard } from './ResponseCard';
import { ReactionRow } from './ReactionRow';
import { Icon } from './Icon';
import type { ReactionType } from '@/hooks/useReaction';
import { isCouchFlagged, useCouchFlag, useCouchFlagState } from '@/hooks/useCouchFlag';

// ─── Reveal choreography timeline (ms from mount) ───
// Two beats: YOUR side lands first, then a held breath, then the partner's.
const REVEAL_T = {
  EYEBROW: 0,
  PROMPT: 100,
  SCORES_ROW: 400, // row shell (names + placeholder) settles just before your score
  YOUR_SCORE: 500,
  PARTNER_SCORE: 1300, // 800ms held breath after your score
  YOUR_NOTE: 1800,
  PARTNER_NOTE: 2200,
  CLOSING_LINE: 2700,
  REACTIONS: 2950,
  FOOTER: 3300,
} as const;

/**
 * Lifetime flag: the couple's FIRST completed reveal on this device (daily or
 * explore — both render through this component). That one reveal gets one
 * extra held beat before the partner's side lands, and the footer reads
 * "The first of many" instead of "Another moment saved".
 */
export const FIRST_REVEAL_LIFETIME_KEY = '@stoke_first_reveal_seen';
/** The extra held breath on the first-ever reveal (added at the partner beat). */
export const FIRST_EVER_EXTRA_HOLD_MS = 600;

const EYEBROW_FADE_MS = 350;
const PROMPT_FADE_MS = 450;
const NOTE_FADE_MS = 450;
const CLOSING_FADE_MS = 400;
const REACTIONS_FADE_MS = 400;
const FOOTER_FADE_MS = 500;
/** Revisits (reveal already seen) render with flat fades and no haptics. */
const REVISIT_FADE_MS = 200;

const CARD_SPRING = { damping: 16, stiffness: 140 };
const YOUR_SCORE_SPRING = { damping: 14, stiffness: 180 };
const PARTNER_SCORE_SPRING = { damping: 12, stiffness: 160 }; // slight overshoot

interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName?: string;
  yourImageUrl?: string | null;
  partnerImageUrl?: string | null;
  myReaction?: ReactionType | null;
  partnerReaction?: ReactionType | null;
  onReact?: (reaction: ReactionType | null) => void;
  /** Scale prompts: both scores shown side by side, visually quiet */
  yourScore?: number | null;
  partnerScore?: number | null;
  /** Middle-score reveal: one light optional line, static text */
  showMidScaleLine?: boolean;
  /** Final-step follow-up templates: shown at reveal */
  closingText?: string | null;
  /**
   * Divergence/repair outcomes: a quiet anticipation line after the
   * reactions — tomorrow's follow-up is coming. First viewing only
   * (revisits settle flat and say nothing about tomorrow).
   */
  anticipationSignal?: 'divergence' | 'repair' | null;
  /**
   * Gate the choreography + haptics to the FIRST reveal of this assignment
   * (AsyncStorage reveal_seen key, shared with the Today screen dwell gate).
   * When omitted, the reveal is treated as first (used in tests/previews).
   */
  assignmentId?: string;
}

export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName,
  yourImageUrl,
  partnerImageUrl,
  myReaction = null,
  partnerReaction = null,
  onReact,
  yourScore = null,
  partnerScore = null,
  showMidScaleLine = false,
  closingText = null,
  anticipationSignal = null,
  assignmentId,
}: CompletionMomentProps) {
  const { t } = useTranslation();
  const hasScores = yourScore != null && partnerScore != null;
  // Lowercase "your partner", never robot-register "Partner" (sim 2026-07-12)
  const displayPartnerName = partnerName?.trim() || t('explore.partnerFallback');

  // "Keep it for the couch" — only fetched when the mid-scale block renders
  // for a real completion. Flagged by EITHER partner → quiet confirmation.
  const couchAssignmentId = showMidScaleLine ? (assignmentId ?? null) : null;
  const { data: couchFlagState } = useCouchFlagState(couchAssignmentId);
  const couchFlag = useCouchFlag();
  const keptForCouch = isCouchFlagged(couchFlagState);

  // null = still resolving the reveal_seen flag (one microtask when assignmentId given)
  const [isFirstReveal, setIsFirstReveal] = useState<boolean | null>(
    assignmentId ? null : true
  );
  // The couple's first-ever reveal on this device (lifetime AsyncStorage flag).
  // Only real reveals (assignmentId given) can be first-ever.
  const [isFirstEver, setIsFirstEver] = useState(false);

  const cardScale = useSharedValue(0.97);
  const accentOpacity = useSharedValue(1);
  const yourScoreOpacity = useSharedValue(0);
  const yourScoreTY = useSharedValue(12);
  const yourScoreScale = useSharedValue(1.08);
  const partnerScoreOpacity = useSharedValue(0);
  const partnerScoreTY = useSharedValue(-14);
  const partnerScoreScale = useSharedValue(1.15);
  const placeholderOpacity = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Revisit: everything settles instantly, flat fades handle entrances.
    const settleFlat = () => {
      cardScale.value = 1;
      accentOpacity.value = 1;
      yourScoreOpacity.value = 1;
      yourScoreTY.value = 0;
      yourScoreScale.value = 1;
      partnerScoreOpacity.value = 1;
      partnerScoreTY.value = 0;
      partnerScoreScale.value = 1;
      placeholderOpacity.value = 0;
    };

    // First-ever reveals hold the breath one beat longer: everything from the
    // partner beat onward shifts by extraHold (0 on every reveal after that).
    const runChoreography = (extraHold: number) => {
      const partnerBeat = REVEAL_T.PARTNER_SCORE + extraHold;

      // t=0: card settles in — no mount haptic; the beats carry the feeling.
      cardScale.value = withSpring(1, CARD_SPRING);

      if (hasScores) {
        // t=500: YOUR score enters + Light haptic.
        yourScoreOpacity.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(1, YOUR_SCORE_SPRING));
        yourScoreTY.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(0, YOUR_SCORE_SPRING));
        yourScoreScale.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(1, YOUR_SCORE_SPRING));

        // t=1300 (+extra hold on the first-ever reveal): the partner score
        // lands (identical for matching and divergent scores) + the only
        // Medium haptic in the whole day.
        partnerScoreOpacity.value = withDelay(partnerBeat, withSpring(1, PARTNER_SCORE_SPRING));
        partnerScoreTY.value = withDelay(partnerBeat, withSpring(0, PARTNER_SCORE_SPRING));
        partnerScoreScale.value = withDelay(partnerBeat, withSpring(1, PARTNER_SCORE_SPRING));
        placeholderOpacity.value = withDelay(partnerBeat, withTiming(0, { duration: 200 }));
        // Single quiet accent-bar pulse at the partner-score beat.
        accentOpacity.value = withDelay(
          partnerBeat,
          withSequence(withTiming(0.55, { duration: 300 }), withTiming(1, { duration: 600 }))
        );
      } else {
        placeholderOpacity.value = 0;
      }

      // Haptic beats mirror the two-beat reveal for both scored and text prompts.
      timers.push(
        setTimeout(() => hapticImpact(ImpactFeedbackStyle.Light), REVEAL_T.YOUR_SCORE)
      );
      timers.push(
        setTimeout(() => hapticImpact(ImpactFeedbackStyle.Medium), partnerBeat)
      );
    };

    const resolve = async () => {
      let first = true;
      let firstEver = false;
      if (assignmentId) {
        try {
          const [seenRaw, lifetimeRaw] = await Promise.all([
            AsyncStorage.getItem(revealSeenKey(assignmentId)),
            AsyncStorage.getItem(FIRST_REVEAL_LIFETIME_KEY),
          ]);
          first = seenRaw !== 'true';
          firstEver = first && lifetimeRaw !== 'true';
        } catch {
          first = true;
          firstEver = false;
        }
        if (cancelled) return;
        setIsFirstEver(firstEver);
        setIsFirstReveal(first);
        if (first) {
          AsyncStorage.setItem(revealSeenKey(assignmentId), 'true').catch(() => {
            // Non-critical — worst case the reveal choreographs once more.
          });
        }
        if (firstEver) {
          AsyncStorage.setItem(FIRST_REVEAL_LIFETIME_KEY, 'true').catch(() => {
            // Non-critical — worst case the first-of-many beat plays once more.
          });
        }
      }
      if (first) {
        runChoreography(firstEver ? FIRST_EVER_EXTRA_HOLD_MS : 0);
      } else {
        settleFlat();
      }
    };

    resolve();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Mount-only: the reveal choreographs once per mount of this assignment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  const accentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: accentOpacity.value,
  }));
  const yourScoreStyle = useAnimatedStyle(() => ({
    opacity: yourScoreOpacity.value,
    transform: [{ translateY: yourScoreTY.value }, { scale: yourScoreScale.value }],
  }));
  const partnerScoreStyle = useAnimatedStyle(() => ({
    opacity: partnerScoreOpacity.value,
    transform: [{ translateY: partnerScoreTY.value }, { scale: partnerScoreScale.value }],
  }));
  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: placeholderOpacity.value,
  }));

  const resolved = isFirstReveal !== null;
  const flat = isFirstReveal === false;

  // Everything from the partner beat onward shifts by the first-ever hold.
  const extraHold = isFirstEver ? FIRST_EVER_EXTRA_HOLD_MS : 0;
  const afterHold = (delay: number) =>
    delay >= REVEAL_T.PARTNER_SCORE ? delay + extraHold : delay;

  const enterFade = (delay: number, duration: number) =>
    flat ? FadeIn.duration(REVISIT_FADE_MS) : FadeIn.duration(duration).delay(afterHold(delay));
  const enterUp = (delay: number, duration: number) =>
    flat ? FadeIn.duration(REVISIT_FADE_MS) : FadeInUp.duration(duration).delay(afterHold(delay));

  // Text reveals reuse the two score beats for the response cards themselves.
  const yourBodyDelay = hasScores ? REVEAL_T.YOUR_NOTE : REVEAL_T.YOUR_SCORE;
  const partnerBodyDelay = hasScores ? REVEAL_T.PARTNER_NOTE : REVEAL_T.PARTNER_SCORE;

  return (
    <Animated.View style={cardAnimatedStyle}>
      <View style={styles.card}>
        {/* Accent bar (pulses once at the partner-score beat) */}
        <AccentBar style={accentAnimatedStyle} />

        {resolved && (
          <>
            <Animated.View entering={enterFade(REVEAL_T.EYEBROW, EYEBROW_FADE_MS)}>
              <View style={styles.headerRow}>
                <Icon name="sparkle" size="lg" color={colors.accent.primary} weight="fill" />
                <Text style={styles.header}>You both answered</Text>
              </View>
            </Animated.View>

            <Animated.View entering={enterUp(REVEAL_T.PROMPT, PROMPT_FADE_MS)}>
              <Text style={styles.promptText}>{'“'}{promptText}{'”'}</Text>
            </Animated.View>

            <View style={styles.responses}>
              {/* Scale prompts: your score springs in first; the partner column
                  holds name + em-dash until their score lands at t=1300 */}
              {hasScores && (
                <Animated.View
                  entering={enterFade(REVEAL_T.SCORES_ROW, 300)}
                  style={styles.scoresRow}
                  testID="score-reveal"
                >
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreName}>You</Text>
                    <Animated.Text style={[styles.scoreValue, yourScoreStyle]} testID="your-score">
                      {yourScore}
                    </Animated.Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreName}>{displayPartnerName}</Text>
                    <View style={styles.scoreValueWrap}>
                      <Animated.Text
                        style={[styles.scoreValue, partnerScoreStyle]}
                        testID="partner-score"
                      >
                        {partnerScore}
                      </Animated.Text>
                      <Animated.Text
                        style={[styles.scoreValue, styles.scorePlaceholder, placeholderStyle]}
                        testID="partner-score-placeholder"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {'—'}
                      </Animated.Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Your response (scale notes are optional; hide when empty) */}
              {(!hasScores || yourResponse.length > 0) && (
                <Animated.View entering={enterUp(yourBodyDelay, NOTE_FADE_MS)}>
                  <ResponseCard
                    label="You"
                    responseText={yourResponse}
                    imageUrl={yourImageUrl}
                    isYours={true}
                  />
                </Animated.View>
              )}
              <View style={styles.spacer} />
              {/* Partner response lands on the second beat */}
              {(!hasScores || partnerResponse.length > 0) && (
                <Animated.View entering={enterUp(partnerBodyDelay, NOTE_FADE_MS)}>
                  <ResponseCard
                    label={displayPartnerName}
                    responseText={partnerResponse}
                    imageUrl={partnerImageUrl}
                    isYours={false}
                  />
                </Animated.View>
              )}

              {/* Closing text on final-step follow-up reveals */}
              {closingText ? (
                <Animated.View entering={enterFade(REVEAL_T.CLOSING_LINE, CLOSING_FADE_MS)}>
                  <Text style={styles.closingText}>{closingText}</Text>
                </Animated.View>
              ) : null}

              {/* Reaction row */}
              {onReact && (
                <Animated.View entering={enterUp(REVEAL_T.REACTIONS, REACTIONS_FADE_MS)}>
                  <ReactionRow
                    myReaction={myReaction}
                    partnerReaction={partnerReaction}
                    partnerName={displayPartnerName}
                    onReact={onReact}
                  />
                </Animated.View>
              )}

              {/* Divergence/repair: one quiet anticipation line after the
                  reactions — tomorrow's follow-up is real, name it softly.
                  First viewing only; revisits never re-promise tomorrow. */}
              {anticipationSignal != null && isFirstReveal === true && (
                <Animated.View entering={enterFade(REVEAL_T.FOOTER, CLOSING_FADE_MS)}>
                  <Text style={styles.anticipationLine} testID="anticipation-line">
                    {anticipationSignal === 'divergence'
                      ? t('today.anticipationDivergence')
                      : t('today.anticipationRepair')}
                  </Text>
                </Animated.View>
              )}

              {/* Middle scores: a closing thought AFTER the reactions (so the
                  row above never reads as answers to it), with one quiet
                  output — keep it for the couch. */}
              {showMidScaleLine && (
                <Animated.View entering={enterFade(REVEAL_T.FOOTER, CLOSING_FADE_MS)}>
                  <Text style={styles.midScaleLine}>{t('today.midScaleLine')}</Text>
                  {assignmentId != null &&
                    (keptForCouch ? (
                      <View style={styles.couchKeptRow} testID="couch-kept">
                        <Icon
                          name="campfire"
                          size="sm"
                          color={colors.accent.primary}
                          weight="fill"
                        />
                        <Text style={styles.couchKeptText} maxFontSizeMultiplier={1.4}>
                          {t('today.keptForCouch')}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.couchFlagRow}
                        onPress={() => couchFlag.mutate({ assignmentId })}
                        disabled={couchFlag.isPending}
                        accessibilityRole="button"
                        accessibilityLabel={t('today.keepForCouch')}
                        activeOpacity={0.7}
                        testID="couch-flag-button"
                      >
                        <Icon name="campfire" size="sm" color={colors.accent.primary} />
                        <Text style={styles.couchFlagText} maxFontSizeMultiplier={1.4}>
                          {t('today.keepForCouch')}
                        </Text>
                        <Icon name="caret-right" size="sm" color={colors.accent.primary} />
                      </TouchableOpacity>
                    ))}
                </Animated.View>
              )}
            </View>

            <Animated.View entering={enterFade(REVEAL_T.FOOTER, FOOTER_FADE_MS)}>
              <View style={styles.footerRow}>
                <View style={styles.footerDot} />
                <Text style={styles.footer}>
                  {isFirstEver ? t('today.firstOfMany') : t('today.anotherMomentSaved')}
                </Text>
                <View style={styles.footerDot} />
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.lg,
    paddingTop: spacing.screen,
    ...shadow.card,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  header: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  promptText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  responses: {},
  spacer: {
    height: 12,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.background,
    borderRadius: radius.choice,
    paddingVertical: spacing.md,
    marginBottom: spacing.smd,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.default,
  },
  scoreName: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  scoreValue: {
    ...typography.display,
    color: colors.text.primary,
  },
  scoreValueWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePlaceholder: {
    position: 'absolute',
    color: colors.text.secondary,
  },
  midScaleLine: {
    // Closing-thought register — mirrors closingText below.
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  anticipationLine: {
    // Same closing-thought register as midScaleLine/closingText.
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  couchFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xs,
  },
  couchFlagText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  couchKeptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xs,
  },
  couchKeptText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  closingText: {
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
  footer: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
