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
          backgroundColor: '#D4522A',
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
            <Icon name="sparkle" size="lg" color="#D4522A" weight="fill" />
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4522A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  header: {
    color: '#6B6B7A',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
  },
  promptText: {
    color: '#6B6B7A',
    fontSize: 17,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  responses: {},
  spacer: {
    height: 12,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EE',
    borderRadius: 14,
    paddingVertical: 16,
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
    backgroundColor: '#E2DED8',
  },
  scoreName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#6B6B7A',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
    letterSpacing: -0.5,
  },
  midScaleLine: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  closingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
  },
  footer: {
    color: '#B8B8C4',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
  },
});
