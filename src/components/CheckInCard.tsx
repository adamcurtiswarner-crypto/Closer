import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hapticImpact } from '@utils/haptics';
import { Icon } from './Icon';
import { selectCheckInQuestions } from '@/config/checkInQuestions';
import type { CheckInQuestion } from '@/config/checkInQuestions';
import { logEvent } from '@/services/analytics';

import { colors, spacing, typography } from '@/config/theme';
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

      <View style={styles.header}>
        <Icon name="heart" size="sm" color={colors.accent.primary} weight="light" />
        <Text style={styles.headerText}>{t('checkIn.title')}</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="x" size="xs" color={colors.text.muted} />
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
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.cardPad,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerText: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacy: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  questionArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.smd,
  },
  questionText: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.cardPad,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.smd,
    marginBottom: spacing.sm,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  scoreNum: {
    ...typography.body,
    color: colors.text.secondary,
  },
  scoreNumSelected: {
    color: colors.text.inverse,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.accent.primary,
    marginTop: spacing.xs,
  },
  nextBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    ...typography.body,
    color: colors.text.inverse,
  },
});
