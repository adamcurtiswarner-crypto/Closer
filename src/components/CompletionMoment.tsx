import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { ResponseCard } from './ResponseCard';
import { ReactionRow } from './ReactionRow';
import { Icon } from './Icon';
import type { ReactionType } from '@/hooks/useReaction';

const SPARKLE_POSITIONS = [
  { x: 40, delay: 200 },
  { x: 80, delay: 400 },
  { x: 140, delay: 100 },
  { x: 200, delay: 500 },
  { x: 260, delay: 300 },
  { x: 300, delay: 600 },
];

function SparkleParticle({ x, delay }: { x: number; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(-30, { duration: 1500, easing: Easing.out(Easing.ease) }));

    const fadeOutTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) });
    }, delay + 700);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 8,
          left: x,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.accent.primary,
        },
        animatedStyle,
      ]}
    />
  );
}

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
}: CompletionMomentProps) {
  const cardScale = useSharedValue(0.95);
  const hasScores = yourScore != null && partnerScore != null;

  useEffect(() => {
    cardScale.value = withSpring(1.0, { damping: 14, stiffness: 150 });
    hapticNotification(NotificationFeedbackType.Success);
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Animated.View style={cardAnimatedStyle}>
      <View style={styles.card}>
        {/* Sparkle particles */}
        {SPARKLE_POSITIONS.map((sparkle, index) => (
          <SparkleParticle key={index} x={sparkle.x} delay={sparkle.delay} />
        ))}

        {/* Accent bar */}
        <View style={styles.accentBar} />

        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.headerRow}>
            <Icon name="sparkle" size="lg" color={colors.accent.primary} weight="fill" />
            <Text style={styles.header}>You both answered</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <Text style={styles.promptText}>{'\u201C'}{promptText}{'\u201D'}</Text>
        </Animated.View>

        <View style={styles.responses}>
          {/* Scale prompts: both scores side by side — numbers with names, not a chart */}
          {hasScores && (
            <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.scoresRow} testID="score-reveal">
              <View style={styles.scoreCol}>
                <Text style={styles.scoreName}>You</Text>
                <Text style={styles.scoreValue} testID="your-score">{yourScore}</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreCol}>
                <Text style={styles.scoreName}>{partnerName}</Text>
                <Text style={styles.scoreValue} testID="partner-score">{partnerScore}</Text>
              </View>
            </Animated.View>
          )}

          {/* Your response - reveals first (scale notes are optional; hide when empty) */}
          {(!hasScores || yourResponse.length > 0) && (
            <Animated.View entering={FadeInUp.duration(500).delay(400)}>
              <ResponseCard
                label="You"
                responseText={yourResponse}
                imageUrl={yourImageUrl}
                isYours={true}
              />
            </Animated.View>
          )}
          <View style={styles.spacer} />
          {/* Partner response - reveals 500ms later for dramatic stagger */}
          {(!hasScores || partnerResponse.length > 0) && (
            <Animated.View entering={FadeInUp.duration(500).delay(900)}>
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
            <Animated.View entering={FadeIn.duration(400).delay(1100)}>
              <Text style={styles.midScaleLine}>What would move this one point higher?</Text>
            </Animated.View>
          )}

          {/* Closing text on final-step follow-up reveals */}
          {closingText ? (
            <Animated.View entering={FadeIn.duration(400).delay(1100)}>
              <Text style={styles.closingText}>{closingText}</Text>
            </Animated.View>
          ) : null}

          {/* Reaction row */}
          {onReact && (
            <Animated.View entering={FadeInUp.duration(400).delay(800)}>
              <ReactionRow
                myReaction={myReaction}
                partnerReaction={partnerReaction}
                onReact={onReact}
              />
            </Animated.View>
          )}
        </View>

        <Animated.View entering={FadeIn.duration(400).delay(1000)}>
          <View style={styles.footerRow}>
            <View style={styles.footerDot} />
            <Text style={styles.footer}>Another moment saved</Text>
            <View style={styles.footerDot} />
          </View>
        </Animated.View>
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
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  header: {
    ...typography.eyebrow,
    color: colors.text.muted,
  },
  promptText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
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
    marginBottom: 12,
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
    color: colors.text.muted,
  },
  scoreValue: {
    ...typography.display,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  midScaleLine: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  closingText: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 12,
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
});
