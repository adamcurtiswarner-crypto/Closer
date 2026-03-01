import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { truthOrDare, getRandomQuestions, type TruthOrDarePrompt } from '@/config/gameQuestions';
import { GameComplete } from './GameComplete';
import { Icon } from '@/components';

const ROUND_COUNT = 10;

type Phase = 'choose' | 'prompt' | 'complete';

interface TruthOrDareProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function TruthOrDare({ userName, partnerName, onExit }: TruthOrDareProps) {
  const truths = useMemo(() => getRandomQuestions(
    truthOrDare.filter((q) => q.type === 'truth'),
    ROUND_COUNT,
  ), []);
  const dares = useMemo(() => getRandomQuestions(
    truthOrDare.filter((q) => q.type === 'dare'),
    ROUND_COUNT,
  ), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('choose');
  const [currentPrompt, setCurrentPrompt] = useState<TruthOrDarePrompt | null>(null);
  const [truthIndex, setTruthIndex] = useState(0);
  const [dareIndex, setDareIndex] = useState(0);

  const isUserTurn = round % 2 === 0;
  const currentPlayer = isUserTurn ? userName : partnerName;

  const handleChoose = (type: 'truth' | 'dare') => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    if (type === 'truth') {
      setCurrentPrompt(truths[truthIndex % truths.length]);
      setTruthIndex((i) => i + 1);
    } else {
      setCurrentPrompt(dares[dareIndex % dares.length]);
      setDareIndex((i) => i + 1);
    }
    setPhase('prompt');
  };

  const handleDone = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setRound((r) => r + 1);
      setCurrentPrompt(null);
      setPhase('choose');
    }
  };

  const handlePlayAgain = () => {
    setRound(0);
    setPhase('choose');
    setCurrentPrompt(null);
    setTruthIndex(0);
    setDareIndex(0);
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

  if (phase === 'complete') {
    return (
      <GameComplete
        title="That was bold"
        subtitle={`${ROUND_COUNT} rounds of truths and dares. What a night.`}
        rounds={ROUND_COUNT}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  if (phase === 'prompt' && currentPrompt) {
    return (
      <View style={styles.container}>
        <ExitButton onPress={handleExit} />
        <RoundCounter round={round + 1} total={ROUND_COUNT} />

        <View style={styles.promptContent}>
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={[
              styles.typeBadge,
              currentPrompt.type === 'dare' && styles.typeBadgeDare,
            ]}>
              <Text style={[
                styles.typeBadgeText,
                currentPrompt.type === 'dare' && styles.typeBadgeTextDare,
              ]}>
                {currentPrompt.type === 'truth' ? 'Truth' : 'Dare'}
              </Text>
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInUp.duration(400).delay(100)} style={styles.promptText}>
            {currentPrompt.prompt}
          </Animated.Text>

          <Animated.View entering={FadeIn.duration(300).delay(100)}>
            <Text style={styles.forLabel}>for {currentPlayer}</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // choose phase
  return (
    <View style={styles.container}>
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <View style={styles.chooseContent}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.turnLabel}>
          <Text style={styles.turnName}>{currentPlayer}'s turn</Text>
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(400)} style={styles.chooseTitle}>
          Truth or Dare?
        </Animated.Text>

        <View style={styles.chooseRow}>
          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.chooseButtonWrap}>
            <TouchableOpacity
              style={[styles.chooseButton, styles.chooseButtonTruth]}
              onPress={() => handleChoose('truth')}
              activeOpacity={0.8}
            >
              <Icon name="chat-circle" size="md" color="#c97454" />
              <Text style={styles.chooseButtonText}>Truth</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.chooseButtonWrap}>
            <TouchableOpacity
              style={[styles.chooseButton, styles.chooseButtonDare]}
              onPress={() => handleChoose('dare')}
              activeOpacity={0.8}
            >
              <Icon name="flame" size="md" color="#c97454" weight="fill" />
              <Text style={styles.chooseButtonText}>Dare</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function RoundCounter({ round, total }: { round: number; total: number }) {
  return (
    <View style={styles.roundCounter}>
      <Text style={styles.roundText}>Round {round} of {total}</Text>
    </View>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onPress} activeOpacity={0.7}>
      <Icon name="x" size="md" color="#78716c" />
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
  // ─── Choose Phase ───
  chooseContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  turnLabel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  turnName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  chooseTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 36,
  },
  chooseRow: {
    flexDirection: 'row',
    gap: 16,
  },
  chooseButtonWrap: {
    flex: 1,
  },
  chooseButton: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  chooseButtonTruth: {
    backgroundColor: '#fef7f4',
  },
  chooseButtonDare: {
    backgroundColor: '#fff7ed',
  },
  chooseEmoji: {
    fontSize: 36,
  },
  chooseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#292524',
  },
  // ─── Prompt Phase ───
  promptContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  typeBadge: {
    backgroundColor: '#fef7f4',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  typeBadgeDare: {
    backgroundColor: '#fff7ed',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c97454',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadgeTextDare: {
    color: '#c2410c',
  },
  promptText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  forLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a8a29e',
  },
  doneButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
