import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface GameCompleteProps {
  title: string;
  subtitle: string;
  rounds: number;
  score?: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameComplete({
  title,
  subtitle,
  rounds,
  score,
  onPlayAgain,
  onExit,
}: GameCompleteProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <Text style={styles.emoji}>{'\u2728'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rounds}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          {score !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPlayAgain();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Play again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExit();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Back to games</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 28,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    paddingHorizontal: 28,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#c97454',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a8a29e',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
  },
});
