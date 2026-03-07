// Test the pulse scoring algorithm (mirrors computePulseForCouple logic in functions/src/index.ts)

function computePulseScore({
  emotionPositive = 0,
  emotionNegative = 0,
  emotionTotal = 0,
  completedAssignments = 0,
  totalAssignments = 0,
  partialAssignments = 0,
  checkInScores = [] as number[],
  avgResponseLength = 0,
}: {
  emotionPositive?: number;
  emotionNegative?: number;
  emotionTotal?: number;
  completedAssignments?: number;
  totalAssignments?: number;
  partialAssignments?: number;
  checkInScores?: number[];
  avgResponseLength?: number;
}): { score: number; tier: string } {
  let score = 50;

  // Emotion signal (+/- 20 points)
  if (emotionTotal > 0) {
    const positiveRate = emotionPositive / emotionTotal;
    const negativeRate = emotionNegative / emotionTotal;
    score += (positiveRate - negativeRate) * 20;
  }

  // Completion rate (+/- 15 points)
  if (totalAssignments > 0) {
    const completionRate = completedAssignments / totalAssignments;
    score += (completionRate - 0.5) * 30;
  }

  // One-sided engagement (-10 per day)
  score -= partialAssignments * 10;

  // Check-in scores (+/- 15 points)
  if (checkInScores.length > 0) {
    const avgCheckIn =
      checkInScores.reduce((a, b) => a + b, 0) / checkInScores.length;
    score += (avgCheckIn - 3) * 7.5;
  }

  // Response length (+/- 5 points)
  if (avgResponseLength > 100) score += 5;
  else if (avgResponseLength < 30) score -= 5;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier =
    score >= 80
      ? 'thriving'
      : score >= 60
        ? 'steady'
        : score >= 40
          ? 'cooling'
          : 'needs_attention';

  return { score, tier };
}

describe('Pulse Score Computation', () => {
  describe('baseline', () => {
    it('should return 45 with no data (baseline 50, short response penalty)', () => {
      const { score, tier } = computePulseScore({});
      expect(score).toBe(45);
      expect(tier).toBe('cooling');
    });

    it('should return 50 with no data and medium response length', () => {
      const { score } = computePulseScore({ avgResponseLength: 50 });
      expect(score).toBe(50);
    });
  });

  describe('emotion signal', () => {
    it('should add 20 points for all positive emotions', () => {
      const { score } = computePulseScore({
        emotionPositive: 7,
        emotionNegative: 0,
        emotionTotal: 7,
        avgResponseLength: 50,
      });
      expect(score).toBe(70);
    });

    it('should subtract 20 points for all negative emotions', () => {
      const { score } = computePulseScore({
        emotionPositive: 0,
        emotionNegative: 7,
        emotionTotal: 7,
        avgResponseLength: 50,
      });
      expect(score).toBe(30);
    });

    it('should net zero for equal positive and negative', () => {
      const { score } = computePulseScore({
        emotionPositive: 3,
        emotionNegative: 3,
        emotionTotal: 6,
        avgResponseLength: 50,
      });
      expect(score).toBe(50);
    });
  });

  describe('completion rate', () => {
    it('should add 15 points for 100% completion', () => {
      const { score } = computePulseScore({
        completedAssignments: 7,
        totalAssignments: 7,
        avgResponseLength: 50,
      });
      expect(score).toBe(65);
    });

    it('should subtract 15 points for 0% completion', () => {
      const { score } = computePulseScore({
        completedAssignments: 0,
        totalAssignments: 7,
        avgResponseLength: 50,
      });
      expect(score).toBe(35);
    });

    it('should net zero for 50% completion', () => {
      const { score } = computePulseScore({
        completedAssignments: 3,
        totalAssignments: 6,
        avgResponseLength: 50,
      });
      expect(score).toBe(50);
    });
  });

  describe('one-sided engagement', () => {
    it('should subtract 10 per one-sided day', () => {
      const { score } = computePulseScore({
        partialAssignments: 3,
        avgResponseLength: 50,
      });
      expect(score).toBe(20);
    });

    it('should heavily penalize many one-sided days', () => {
      const { score } = computePulseScore({
        partialAssignments: 5,
        avgResponseLength: 50,
      });
      expect(score).toBe(0);
    });
  });

  describe('check-in scores', () => {
    it('should add 15 points for perfect 5/5 check-in scores', () => {
      const { score } = computePulseScore({
        checkInScores: [5, 5, 5],
        avgResponseLength: 50,
      });
      expect(score).toBe(65);
    });

    it('should subtract 15 points for 1/5 check-in scores', () => {
      const { score } = computePulseScore({
        checkInScores: [1, 1, 1],
        avgResponseLength: 50,
      });
      expect(score).toBe(35);
    });

    it('should net zero for 3/5 (neutral) check-in scores', () => {
      const { score } = computePulseScore({
        checkInScores: [3, 3, 3],
        avgResponseLength: 50,
      });
      expect(score).toBe(50);
    });

    it('should handle mixed scores from both partners', () => {
      // Partner A: [4, 3, 5], Partner B: [3, 4, 4] → avg 3.83 → +6.25
      const { score } = computePulseScore({
        checkInScores: [4, 3, 5, 3, 4, 4],
        avgResponseLength: 50,
      });
      expect(score).toBe(56);
    });
  });

  describe('response length', () => {
    it('should add 5 points for long responses', () => {
      const { score } = computePulseScore({ avgResponseLength: 150 });
      expect(score).toBe(55);
    });

    it('should subtract 5 points for very short responses', () => {
      const { score } = computePulseScore({ avgResponseLength: 20 });
      expect(score).toBe(45);
    });

    it('should not adjust for medium-length responses', () => {
      const { score } = computePulseScore({ avgResponseLength: 60 });
      expect(score).toBe(50);
    });
  });

  describe('clamping', () => {
    it('should clamp to 100 for extremely positive signals', () => {
      const { score } = computePulseScore({
        emotionPositive: 7,
        emotionTotal: 7,
        completedAssignments: 7,
        totalAssignments: 7,
        checkInScores: [5, 5, 5, 5, 5, 5],
        avgResponseLength: 150,
      });
      expect(score).toBe(100);
    });

    it('should clamp to 0 for extremely negative signals', () => {
      const { score } = computePulseScore({
        emotionNegative: 7,
        emotionTotal: 7,
        completedAssignments: 0,
        totalAssignments: 7,
        partialAssignments: 5,
        checkInScores: [1, 1, 1],
        avgResponseLength: 10,
      });
      expect(score).toBe(0);
    });
  });

  describe('tier assignment', () => {
    it('should assign thriving for score >= 80', () => {
      const { tier } = computePulseScore({
        emotionPositive: 7,
        emotionTotal: 7,
        completedAssignments: 7,
        totalAssignments: 7,
        checkInScores: [5, 5, 5],
        avgResponseLength: 150,
      });
      expect(tier).toBe('thriving');
    });

    it('should assign steady for score 60-79', () => {
      const { tier } = computePulseScore({
        emotionPositive: 5,
        emotionTotal: 7,
        completedAssignments: 5,
        totalAssignments: 7,
        avgResponseLength: 50,
      });
      expect(tier).toBe('steady');
    });

    it('should assign cooling for score 40-59', () => {
      const { tier } = computePulseScore({ avgResponseLength: 50 });
      expect(tier).toBe('cooling');
    });

    it('should assign needs_attention for score < 40', () => {
      const { tier } = computePulseScore({
        emotionNegative: 5,
        emotionTotal: 5,
        partialAssignments: 2,
        avgResponseLength: 10,
      });
      expect(tier).toBe('needs_attention');
    });
  });

  describe('combined signals', () => {
    it('should compute realistic thriving couple score', () => {
      // Both partners active, positive emotions, good check-ins, engaged responses
      const { score, tier } = computePulseScore({
        emotionPositive: 5,
        emotionNegative: 0,
        emotionTotal: 6,
        completedAssignments: 6,
        totalAssignments: 7,
        partialAssignments: 1,
        checkInScores: [4, 4, 5, 4, 5, 4],
        avgResponseLength: 120,
      });
      // 50 + 16.67 + 7.14 - 10 + 9.58 + 5 = 78.39 → 78
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(85);
      expect(['thriving', 'steady']).toContain(tier);
    });

    it('should compute realistic struggling couple score', () => {
      // Low engagement, negative emotions, poor check-ins
      const { score, tier } = computePulseScore({
        emotionPositive: 1,
        emotionNegative: 3,
        emotionTotal: 5,
        completedAssignments: 2,
        totalAssignments: 7,
        partialAssignments: 3,
        checkInScores: [2, 2, 3],
        avgResponseLength: 25,
      });
      expect(score).toBeLessThanOrEqual(30);
      expect(tier).toBe('needs_attention');
    });
  });
});
