import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { revealSeenKey } from '@/utils/revealGate';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { AccentBar } from './AccentBar';
import { ResponseCard } from './ResponseCard';
import { ReactionRow } from './ReactionRow';
import { Icon } from './Icon';
import type { ReactionType } from '@/hooks/useReaction';

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
  partnerName = 'Partner',
  yourImageUrl,
  partnerImageUrl,
  myReaction = null,
  partnerReaction = null,
  onReact,
  yourScore = null,
  partnerScore = null,
  showMidScaleLine = false,
  closingText = null,
  assignmentId,
}: CompletionMomentProps) {
  const hasScores = yourScore != null && partnerScore != null;

  // null = still resolving the reveal_seen flag (one microtask when assignmentId given)
  const [isFirstReveal, setIsFirstReveal] = useState<boolean | null>(
    assignmentId ? null : true
  );

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

    const runChoreography = () => {
      // t=0: card settles in — no mount haptic; the beats carry the feeling.
      cardScale.value = withSpring(1, CARD_SPRING);

      if (hasScores) {
        // t=500: YOUR score enters + Light haptic.
        yourScoreOpacity.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(1, YOUR_SCORE_SPRING));
        yourScoreTY.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(0, YOUR_SCORE_SPRING));
        yourScoreScale.value = withDelay(REVEAL_T.YOUR_SCORE, withSpring(1, YOUR_SCORE_SPRING));

        // t=1300: the partner score lands (identical for matching and divergent
        // scores) + the only Medium haptic in the whole day.
        partnerScoreOpacity.value = withDelay(
          REVEAL_T.PARTNER_SCORE,
          withSpring(1, PARTNER_SCORE_SPRING)
        );
        partnerScoreTY.value = withDelay(REVEAL_T.PARTNER_SCORE, withSpring(0, PARTNER_SCORE_SPRING));
        partnerScoreScale.value = withDelay(
          REVEAL_T.PARTNER_SCORE,
          withSpring(1, PARTNER_SCORE_SPRING)
        );
        placeholderOpacity.value = withDelay(
          REVEAL_T.PARTNER_SCORE,
          withTiming(0, { duration: 200 })
        );
        // Single quiet accent-bar pulse at the partner-score beat.
        accentOpacity.value = withDelay(
          REVEAL_T.PARTNER_SCORE,
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
        setTimeout(() => hapticImpact(ImpactFeedbackStyle.Medium), REVEAL_T.PARTNER_SCORE)
      );
    };

    const resolve = async () => {
      let first = true;
      if (assignmentId) {
        try {
          first = (await AsyncStorage.getItem(revealSeenKey(assignmentId))) !== 'true';
        } catch {
          first = true;
        }
        if (cancelled) return;
        setIsFirstReveal(first);
        if (first) {
          AsyncStorage.setItem(revealSeenKey(assignmentId), 'true').catch(() => {
            // Non-critical — worst case the reveal choreographs once more.
          });
        }
      }
      if (first) {
        runChoreography();
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

  const enterFade = (delay: number, duration: number) =>
    flat ? FadeIn.duration(REVISIT_FADE_MS) : FadeIn.duration(duration).delay(delay);
  const enterUp = (delay: number, duration: number) =>
    flat ? FadeIn.duration(REVISIT_FADE_MS) : FadeInUp.duration(duration).delay(delay);

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
                    <Text style={styles.scoreName}>{partnerName}</Text>
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
                    label={partnerName}
                    responseText={partnerResponse}
                    imageUrl={partnerImageUrl}
                    isYours={false}
                  />
                </Animated.View>
              )}

              {/* Middle scores: a light optional line — static text, no obligation */}
              {showMidScaleLine && (
                <Animated.View entering={enterFade(REVEAL_T.CLOSING_LINE, CLOSING_FADE_MS)}>
                  <Text style={styles.midScaleLine}>What would move this one point higher?</Text>
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
                    partnerName={partnerName}
                    onReact={onReact}
                  />
                </Animated.View>
              )}
            </View>

            <Animated.View entering={enterFade(REVEAL_T.FOOTER, FOOTER_FADE_MS)}>
              <View style={styles.footerRow}>
                <View style={styles.footerDot} />
                <Text style={styles.footer}>Another moment saved</Text>
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
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
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
