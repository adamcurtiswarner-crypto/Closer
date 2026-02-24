import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { howWellDoYouKnowMe, getRandomQuestions } from '@/config/gameQuestions';
import { PassPhone } from './PassPhone';
import { GameComplete } from './GameComplete';

const ROUND_COUNT = 10;

type Phase = 'answer' | 'pass_to_guesser' | 'guess' | 'reveal' | 'pass_to_answerer' | 'complete';

interface HowWellDoYouKnowMeProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function HowWellDoYouKnowMe({ userName, partnerName, onExit }: HowWellDoYouKnowMeProps) {
  const questions = useMemo(() => getRandomQuestions(howWellDoYouKnowMe, ROUND_COUNT), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [realAnswer, setRealAnswer] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  // Alternate who answers: even rounds = user, odd rounds = partner
  const isUserAnswerer = round % 2 === 0;
  const answerer = isUserAnswerer ? userName : partnerName;
  const guesser = isUserAnswerer ? partnerName : userName;

  const currentQ = questions[round];

  const handleSubmitAnswer = () => {
    if (!realAnswer.trim()) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('pass_to_guesser');
  };

  const handleSubmitGuess = () => {
    if (!guess.trim()) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('reveal');
  };

  const handleScore = (correct: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (correct) setScore((s) => s + 1);

    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setPhase('pass_to_answerer');
    }
  };

  const handleNextRound = () => {
    setRound((r) => r + 1);
    setRealAnswer('');
    setGuess('');
    setPhase('answer');
  };

  const handlePlayAgain = () => {
    setRound(0);
    setRealAnswer('');
    setGuess('');
    setScore(0);
    setPhase('answer');
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

  if (phase === 'pass_to_guesser') {
    return (
      <PassPhone
        partnerName={guesser}
        instruction="Time to guess the answer"
        onReady={() => setPhase('guess')}
      />
    );
  }

  if (phase === 'pass_to_answerer') {
    const nextAnswerer = round % 2 === 0 ? partnerName : userName;
    return (
      <PassPhone
        partnerName={nextAnswerer}
        instruction="Your turn to answer about yourself"
        onReady={handleNextRound}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <GameComplete
        title="Well played"
        subtitle={score >= ROUND_COUNT * 0.7
          ? `${score} out of ${ROUND_COUNT} correct. You really know each other.`
          : `${score} out of ${ROUND_COUNT} correct. Plenty of new things to discover.`
        }
        rounds={ROUND_COUNT}
        score={score}
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

        <Animated.View entering={FadeInUp.duration(400)} style={styles.revealContent}>
          <Text style={styles.revealQuestion}>{currentQ.question}</Text>

          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>{answerer}'s answer</Text>
            <Text style={styles.revealText}>{realAnswer}</Text>
          </View>

          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>{guesser}'s guess</Text>
            <Text style={styles.revealText}>{guess}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(300)} style={styles.scorePrompt}>
          <Text style={styles.scoreQuestion}>Did {guesser} get it right?</Text>
          <View style={styles.scoreRow}>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonYes]}
              onPress={() => handleScore(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.scoreButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonNo]}
              onPress={() => handleScore(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.scoreButtonText, styles.scoreButtonNoText]}>Not quite</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // answer or guess phase
  const isAnswerPhase = phase === 'answer';
  const currentPlayer = isAnswerPhase ? answerer : guesser;
  const inputValue = isAnswerPhase ? realAnswer : guess;
  const setInputValue = isAnswerPhase ? setRealAnswer : setGuess;
  const handleSubmit = isAnswerPhase ? handleSubmitAnswer : handleSubmitGuess;
  const placeholder = isAnswerPhase ? 'Type your real answer...' : 'Type your guess...';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.pickerLabel}>
        <Text style={styles.pickerName}>
          {isAnswerPhase ? `${currentPlayer}, answer honestly` : `${currentPlayer}, take a guess`}
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.duration(400)} style={styles.questionText}>
        {currentQ.question}
      </Animated.Text>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#a8a29e"
          value={inputValue}
          onChangeText={setInputValue}
          multiline
          maxLength={200}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.submitButton, !inputValue.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!inputValue.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 32,
    lineHeight: 30,
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 16,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#292524',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  // ─── Reveal ───
  revealContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  revealQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  revealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  revealLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  revealText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#292524',
    lineHeight: 22,
  },
  scorePrompt: {
    paddingBottom: 40,
  },
  scoreQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  scoreButtonYes: {
    backgroundColor: '#c97454',
  },
  scoreButtonNo: {
    backgroundColor: '#f5f5f4',
  },
  scoreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  scoreButtonNoText: {
    color: '#78716c',
  },
});
