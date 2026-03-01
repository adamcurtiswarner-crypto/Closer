import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { Icon } from '@/components';
import { selectCheckInQuestions } from '@/config/checkInQuestions';
import type { CheckInQuestion } from '@/config/checkInQuestions';

interface CheckInCardProps {
  partnerName: string;
  onSubmit: (responses: { questionId: string; dimension: string; score: number }[]) => void;
  onDismiss: () => void;
}

const SCORE_LABELS = ['', 'Not at all', 'A little', 'Somewhat', 'Quite', 'Very much'];

export function CheckInCard({ partnerName, onSubmit, onDismiss }: CheckInCardProps) {
  const [questions] = useState<CheckInQuestion[]>(() => selectCheckInQuestions());
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);

  const currentQ = questions[step];
  const questionText = currentQ.text.replace('{partner}', partnerName);

  const handleScore = (score: number) => {
    hapticImpact();
    const newScores = [...scores];
    newScores[step] = score;
    setScores(newScores);
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      const responses = questions.map((q, i) => ({
        questionId: q.id,
        dimension: q.dimension,
        score: scores[i],
      }));
      onSubmit(responses);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      <View style={styles.accentBar} />

      <View style={styles.header}>
        <Icon name="heart" size="sm" color="#c97454" weight="light" />
        <Text style={styles.headerText}>Quick check-in</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Icon name="x" size="xs" color="#a8a29e" />
        </TouchableOpacity>
      </View>

      <Text style={styles.privacy}>Private — only you can see your answers</Text>

      <Animated.View key={step} entering={FadeInUp.duration(300)} style={styles.questionArea}>
        <Text style={styles.stepLabel}>Question {step + 1} of 3</Text>
        <Text style={styles.questionText}>{questionText}</Text>

        <View style={styles.scoreRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.scoreBtn, scores[step] === n && styles.scoreBtnSelected]}
              onPress={() => handleScore(n)}
              activeOpacity={0.7}
            >
              <Text style={[styles.scoreNum, scores[step] === n && styles.scoreNumSelected]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {scores[step] > 0 && (
          <Animated.Text entering={FadeIn.duration(200)} style={styles.scoreLabel}>
            {SCORE_LABELS[scores[step]]}
          </Animated.Text>
        )}
      </Animated.View>

      <TouchableOpacity
        style={[styles.nextBtn, scores[step] === 0 && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={scores[step] === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>{step < 2 ? 'Next' : 'Submit'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacy: {
    fontSize: 11,
    color: '#a8a29e',
    marginBottom: 16,
  },
  questionArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e7e5e4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnSelected: {
    borderColor: '#c97454',
    backgroundColor: '#c97454',
  },
  scoreNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78716c',
  },
  scoreNumSelected: {
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#c97454',
    fontWeight: '600',
    marginTop: 4,
  },
  nextBtn: {
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
