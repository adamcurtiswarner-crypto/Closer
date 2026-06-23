import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hapticImpact } from '@utils/haptics';
import { Icon } from './Icon';
import { selectCheckInQuestions } from '@/config/checkInQuestions';
import type { CheckInQuestion } from '@/config/checkInQuestions';
import { logEvent } from '@/services/analytics';

interface CheckInCardProps {
  partnerName: string;
  onSubmit: (responses: { questionId: string; dimension: string; score: number }[]) => void;
  onDismiss: () => void;
}

export function CheckInCard({ partnerName, onSubmit, onDismiss }: CheckInCardProps) {
  const { t } = useTranslation();
  const [questions] = useState<CheckInQuestion[]>(() => selectCheckInQuestions());
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);

  useEffect(() => {
    logEvent('checkin_viewed');
  }, []);

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
        <Icon name="heart" size="sm" color="#D4522A" weight="light" />
        <Text style={styles.headerText}>{t('checkIn.title')}</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="x" size="xs" color="#B8B8C4" />
        </TouchableOpacity>
      </View>

      <Text style={styles.privacy}>{t('checkIn.privacy')}</Text>

      <Animated.View key={step} entering={FadeInUp.duration(300)} style={styles.questionArea}>
        <Text style={styles.stepLabel}>{t('checkIn.questionOf', { current: step + 1, total: 3 })}</Text>
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
            {t(`checkIn.scoreLabels.${scores[step]}`)}
          </Animated.Text>
        )}
      </Animated.View>

      <TouchableOpacity
        style={[styles.nextBtn, scores[step] === 0 && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={scores[step] === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>{step < 2 ? t('checkIn.next') : t('checkIn.submit')}</Text>
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
    shadowColor: '#1E1E2E',
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
    backgroundColor: '#D4522A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Nunito-Black',
    color: '#292524',
    letterSpacing: -0.3,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F2EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacy: {
    fontSize: 11,
    color: '#B8B8C4',
    marginBottom: 16,
  },
  questionArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
    color: '#B8B8C4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#1E1E2E',
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
    borderColor: '#E2DED8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnSelected: {
    borderColor: '#D4522A',
    backgroundColor: '#D4522A',
  },
  scoreNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B6B7A',
  },
  scoreNumSelected: {
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#D4522A',
    fontWeight: '600',
    marginTop: 4,
  },
  nextBtn: {
    backgroundColor: '#D4522A',
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
