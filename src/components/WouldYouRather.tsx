import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { wouldYouRather, getRandomQuestions } from '@/config/gameQuestions';
import { PassPhone } from './PassPhone';
import { GameComplete } from './GameComplete';

const ROUND_COUNT = 10;

type Phase = 'p1_pick' | 'pass_to_p2' | 'p2_pick' | 'reveal' | 'complete';

interface WouldYouRatherProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function WouldYouRather({ userName, partnerName, onExit }: WouldYouRatherProps) {
  const questions = useMemo(() => getRandomQuestions(wouldYouRather, ROUND_COUNT), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('p1_pick');
  const [p1Choice, setP1Choice] = useState<'A' | 'B' | null>(null);
  const [p2Choice, setP2Choice] = useState<'A' | 'B' | null>(null);
  const [matches, setMatches] = useState(0);

  const currentQ = questions[round];

  const handleP1Pick = (choice: 'A' | 'B') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setP1Choice(choice);
    setPhase('pass_to_p2');
  };

  const handleP2Pick = (choice: 'A' | 'B') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setP2Choice(choice);
    if (choice === p1Choice) setMatches((m) => m + 1);
    setPhase('reveal');
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setRound((r) => r + 1);
      setP1Choice(null);
      setP2Choice(null);
      setPhase('p1_pick');
    }
  };

  const handlePlayAgain = () => {
    setRound(0);
    setP1Choice(null);
    setP2Choice(null);
    setMatches(0);
    setPhase('p1_pick');
  };

  const handleExit = () => {
    if (phase !== 'complete') {
      Alert.alert('End game?', 'Progress won\'t be saved.', [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'End game', style: 'destructive', onPress: onExit },
      ]);
    } else {
      onExit();
    }
  };

  if (phase === 'pass_to_p2') {
    return (
      <PassPhone
        partnerName={partnerName}
        instruction="Don't peek at their answer"
        onReady={() => setPhase('p2_pick')}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <GameComplete
        title="Great minds"
        subtitle={matches === ROUND_COUNT
          ? 'You matched on every single one. You two really are in sync.'
          : `You matched on ${matches} out of ${ROUND_COUNT}. Every difference is something new to learn.`
        }
        rounds={ROUND_COUNT}
        score={matches}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  if (phase === 'reveal') {
    return (
      <View style={styles.container}>
        <ExitButton onPress={handleExit} />
        <RoundCounter round={round + 1} total={ROUND_COUNT} />

        <Animated.View entering={FadeInUp.duration(400)} style={styles.revealRow}>
          <View style={[styles.revealCard, p1Choice === p2Choice && styles.revealCardMatch]}>
            <Text style={styles.revealName}>{userName}</Text>
            <Text style={styles.revealChoice}>
              {p1Choice === 'A' ? currentQ.optionA : currentQ.optionB}
            </Text>
          </View>
          <View style={[styles.revealCard, p1Choice === p2Choice && styles.revealCardMatch]}>
            <Text style={styles.revealName}>{partnerName}</Text>
            <Text style={styles.revealChoice}>
              {p2Choice === 'A' ? currentQ.optionA : currentQ.optionB}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(200)}>
          <Text style={styles.matchLabel}>
            {p1Choice === p2Choice ? 'You matched' : 'Different picks'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {round + 1 >= ROUND_COUNT ? 'See results' : 'Next question'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // p1_pick or p2_pick
  const currentPicker = phase === 'p1_pick' ? userName : partnerName;

  return (
    <View style={styles.container}>
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.pickerLabel}>
        <Text style={styles.pickerName}>{currentPicker}'s turn</Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.duration(400)} style={styles.questionLabel}>
        Would you rather...
      </Animated.Text>

      <View style={styles.optionsColumn}>
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => phase === 'p1_pick' ? handleP1Pick('A') : handleP2Pick('A')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{currentQ.optionA}</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.orText}>or</Text>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => phase === 'p1_pick' ? handleP1Pick('B') : handleP2Pick('B')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{currentQ.optionB}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

function RoundCounter({ round, total }: { round: number; total: number }) {
  return (
    <View style={styles.roundCounter}>
      <Text style={styles.roundText}>Question {round} of {total}</Text>
    </View>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.exitText}>{'\u2715'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exitText: {
    fontSize: 16,
    color: '#78716c',
  },
  roundCounter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  roundText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  pickerLabel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  questionLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  optionsColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#292524',
    textAlign: 'center',
    lineHeight: 24,
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a8a29e',
    textAlign: 'center',
  },
  // ─── Reveal ───
  revealRow: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 40,
  },
  revealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  revealCardMatch: {
    borderWidth: 2,
    borderColor: '#c97454',
  },
  revealName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  revealChoice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#292524',
    lineHeight: 22,
  },
  matchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c97454',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
