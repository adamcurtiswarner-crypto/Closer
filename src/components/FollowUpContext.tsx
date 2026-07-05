import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { FollowUpBranch } from '@/types';

const BRANCH_CONTEXT: Record<FollowUpBranch, string> = {
  deepener: 'You both scored this high. One more question.',
  repair: 'About yesterday’s answer. Take it slow.',
  divergence: 'You two saw this one differently. That’s information, not a problem.',
};

/** The quiet context line for a follow-up branch (for screens that render plain text). */
export function getFollowUpContextLine(branch: FollowUpBranch): string {
  return BRANCH_CONTEXT[branch];
}

/** Quiet context line rendered above a follow-up prompt. */
export function FollowUpContextLine({ branch }: { branch: FollowUpBranch }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.contextWrap} testID="follow-up-context">
      <Text style={styles.contextText}>{BRANCH_CONTEXT[branch]}</Text>
    </Animated.View>
  );
}

interface FollowUpSkipProps {
  onSkip: () => void;
  disabled?: boolean;
}

/** Quiet skip affordance below a follow-up prompt. No nagging, no penalty. */
export function FollowUpSkip({ onSkip, disabled = false }: FollowUpSkipProps) {
  return (
    <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.skipWrap}>
      <TouchableOpacity
        onPress={onSkip}
        disabled={disabled}
        style={styles.skipButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID="follow-up-skip"
      >
        <Text style={styles.skipText}>Skip this one</Text>
      </TouchableOpacity>
      <Text style={styles.skipHint}>It’ll keep.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contextWrap: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  skipWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  skipButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#6B6B7A',
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
  },
  skipHint: {
    fontSize: 12,
    color: '#B8B8C4',
    fontFamily: 'Nunito-Regular',
    marginTop: 2,
  },
});
