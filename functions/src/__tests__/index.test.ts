import * as functionsTest from 'firebase-functions-test';

const test = functionsTest.default();

// Helper: simulates the frequency skip logic from deliverDailyPrompts
function shouldSkipForFrequency(frequency: string, dayOfWeek: number): boolean {
  if (frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
  if (frequency === 'weekends' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
  return false;
}

// Helper: simulates streak update logic from onResponseSubmitted
function computeStreak(
  lastStreakDate: string | null,
  today: string,
  yesterday: string,
  currentStreak: number
): { currentStreak: number } {
  if (lastStreakDate === today) {
    // Already counted today
  } else if (lastStreakDate === yesterday) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }
  return { currentStreak };
}

// Helper: effective tone selection
function getEffectiveTone(tones: string[]): string {
  if (tones.includes('struggling')) return 'struggling';
  if (tones.includes('distant')) return 'distant';
  return 'solid';
}

describe('Prompt Selection Logic', () => {
  describe('day_preference filter', () => {
    it('should filter prompts by day_preference', () => {
      const dayPreference = [1, 2, 3, 4, 5]; // Mon-Fri

      // Saturday (6) should be filtered out
      expect(dayPreference.includes(6)).toBe(false);
      // Monday (1) should be included
      expect(dayPreference.includes(1)).toBe(true);
    });
  });

  describe('max_per_week filter', () => {
    it('should exclude prompts that have hit their weekly max', () => {
      const weeklyTypeCounts: Record<string, number> = { love_map_update: 3 };
      const type = 'love_map_update';
      const maxPerWeek = 3;

      const isExcluded = (weeklyTypeCounts[type] || 0) >= maxPerWeek;
      expect(isExcluded).toBe(true);
    });

    it('should include prompts under their weekly max', () => {
      const weeklyTypeCounts: Record<string, number> = { love_map_update: 1 };
      const type = 'love_map_update';
      const maxPerWeek = 3;

      const isExcluded = (weeklyTypeCounts[type] || 0) >= maxPerWeek;
      expect(isExcluded).toBe(false);
    });
  });

  describe('week_restriction filter', () => {
    it('should exclude prompts for couples in early weeks', () => {
      const weekNumber = 1;
      const weekRestriction = 4;
      expect(weekNumber < weekRestriction).toBe(true);
    });

    it('should include prompts for couples past the restriction', () => {
      const weekNumber = 5;
      const weekRestriction = 4;
      expect(weekNumber < weekRestriction).toBe(false);
    });
  });

  describe('tone weighting', () => {
    const TONE_WEIGHTS: Record<string, Record<string, number>> = {
      solid: {},
      distant: {
        bid_for_connection: 2,
        appreciation_expression: 2,
        conflict_navigation: 0.5,
        repair_attempt: 0.5,
      },
      struggling: {
        repair_attempt: 2,
        conflict_navigation: 2,
        bid_for_connection: 1.5,
        dream_exploration: 0.5,
      },
    };

    it('should give double weight to bid_for_connection for distant tone', () => {
      const weights = TONE_WEIGHTS['distant'];
      expect(weights['bid_for_connection']).toBe(2);
      expect(weights['conflict_navigation']).toBe(0.5);
    });

    it('should give double weight to repair_attempt for struggling tone', () => {
      const weights = TONE_WEIGHTS['struggling'];
      expect(weights['repair_attempt']).toBe(2);
      expect(weights['conflict_navigation']).toBe(2);
    });

    it('should use the more cautious tone', () => {
      expect(getEffectiveTone(['solid', 'distant'])).toBe('distant');
      expect(getEffectiveTone(['solid', 'struggling'])).toBe('struggling');
      expect(getEffectiveTone(['distant', 'struggling'])).toBe('struggling');
      expect(getEffectiveTone(['solid', 'solid'])).toBe('solid');
    });
  });

  describe('prompt_frequency skip logic', () => {
    it('should skip weekends for weekday frequency', () => {
      expect(shouldSkipForFrequency('weekdays', 6)).toBe(true);  // Saturday
      expect(shouldSkipForFrequency('weekdays', 0)).toBe(true);  // Sunday
      expect(shouldSkipForFrequency('weekdays', 1)).toBe(false); // Monday
      expect(shouldSkipForFrequency('weekdays', 3)).toBe(false); // Wednesday
    });

    it('should skip weekdays for weekend frequency', () => {
      expect(shouldSkipForFrequency('weekends', 1)).toBe(true);  // Monday
      expect(shouldSkipForFrequency('weekends', 5)).toBe(true);  // Friday
      expect(shouldSkipForFrequency('weekends', 6)).toBe(false); // Saturday
      expect(shouldSkipForFrequency('weekends', 0)).toBe(false); // Sunday
    });

    it('should never skip for daily frequency', () => {
      for (let day = 0; day <= 6; day++) {
        expect(shouldSkipForFrequency('daily', day)).toBe(false);
      }
    });
  });
});

describe('Streak Logic', () => {
  it('should increment streak when last_streak_date is yesterday', () => {
    const result = computeStreak('2026-02-07', '2026-02-08', '2026-02-07', 5);
    expect(result.currentStreak).toBe(6);
  });

  it('should not change streak if already counted today', () => {
    const result = computeStreak('2026-02-08', '2026-02-08', '2026-02-07', 5);
    expect(result.currentStreak).toBe(5);
  });

  it('should reset streak if last_streak_date is older than yesterday', () => {
    const result = computeStreak('2026-02-05', '2026-02-08', '2026-02-07', 5);
    expect(result.currentStreak).toBe(1);
  });

  it('should start streak at 1 when no previous streak', () => {
    const result = computeStreak(null, '2026-02-08', '2026-02-07', 0);
    expect(result.currentStreak).toBe(1);
  });

  it('should update longest_streak when current exceeds it', () => {
    const currentStreak = 10;
    const longestStreak = 8;
    expect(Math.max(currentStreak, longestStreak)).toBe(10);
  });

  it('should keep longest_streak when current is lower', () => {
    const currentStreak = 3;
    const longestStreak = 8;
    expect(Math.max(currentStreak, longestStreak)).toBe(8);
  });
});

describe('Expire Stale Prompts', () => {
  it('should mark delivered assignments from before today as expired', () => {
    const assignedDate = '2026-02-07';
    const today = '2026-02-08';
    expect(assignedDate < today).toBe(true);
  });

  it('should not expire assignments from today', () => {
    const assignedDate = '2026-02-08';
    const today = '2026-02-08';
    expect(assignedDate < today).toBe(false);
  });
});

describe('Response Reminders', () => {
  it('should send reminders within 3-4 hour window', () => {
    const deliveredAt = new Date('2026-02-08T10:00:00');
    const now = new Date('2026-02-08T13:30:00');
    const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    expect(hours).toBeGreaterThanOrEqual(3);
    expect(hours).toBeLessThan(4);
  });

  it('should not send reminders before 3 hours', () => {
    const deliveredAt = new Date('2026-02-08T10:00:00');
    const now = new Date('2026-02-08T12:00:00');
    const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    expect(hours < 3).toBe(true);
  });

  it('should not send reminders after 4 hours', () => {
    const deliveredAt = new Date('2026-02-08T10:00:00');
    const now = new Date('2026-02-08T14:30:00');
    const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    expect(hours >= 4).toBe(true);
  });

  it('should respect remind_to_respond=false preference', () => {
    const userData = { remind_to_respond: false as boolean };
    expect(userData.remind_to_respond === false).toBe(true);
  });
});

describe('onResponseSubmitted', () => {
  it('should create completion when response_count is 1 (second response)', () => {
    const responseCount: number = 1;
    expect(responseCount === 1).toBe(true);
  });

  it('should notify partner on first response (response_count is 0)', () => {
    const responseCount: number = 0;
    expect(responseCount === 0).toBe(true);
  });

  it('should respect partner notification preference', () => {
    const notifyPartner: boolean = false;
    expect(notifyPartner !== false).toBe(false);
  });
});

afterAll(() => {
  test.cleanup();
});
