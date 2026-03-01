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
import * as Haptics from 'expo-haptics';
import { ResponseCard } from './ResponseCard';
import { Icon } from '@/components';

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
          backgroundColor: '#c97454',
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
}

export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName = 'Partner',
  yourImageUrl,
  partnerImageUrl,
}: CompletionMomentProps) {
  const cardScale = useSharedValue(0.95);

  useEffect(() => {
    cardScale.value = withSpring(1.0, { damping: 14, stiffness: 150 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            <Icon name="sparkle" size="lg" color="#c97454" weight="fill" />
            <Text style={styles.header}>You both answered</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <Text style={styles.promptText}>{'\u201C'}{promptText}{'\u201D'}</Text>
        </Animated.View>

        <View style={styles.responses}>
          {/* Your response - reveals first */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <ResponseCard
              label="You"
              responseText={yourResponse}
              imageUrl={yourImageUrl}
              isYours={true}
            />
          </Animated.View>
          <View style={styles.spacer} />
          {/* Partner response - reveals 200ms later */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)}>
            <ResponseCard
              label={partnerName}
              responseText={partnerResponse}
              imageUrl={partnerImageUrl}
              isYours={false}
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(400).delay(600)}>
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
    shadowColor: '#1c1917',
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
    backgroundColor: '#c97454',
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
    color: '#57534e',
    fontSize: 15,
    fontWeight: '600',
  },
  promptText: {
    color: '#57534e',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  responses: {},
  spacer: {
    height: 12,
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
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '500',
  },
});
