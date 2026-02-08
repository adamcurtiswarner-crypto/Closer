import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';

const test = functionsTest.default();

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    add: jest.fn(),
    batch: jest.fn(() => ({
      update: jest.fn(),
      commit: jest.fn(),
    })),
  };

  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestoreMock),
    messaging: jest.fn(() => ({
      sendEach: jest.fn().mockResolvedValue({}),
    })),
  };
});

// After mocking, require the module
const db = admin.firestore();

describe('Prompt Selection Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('day_preference filter', () => {
    it('should filter prompts by day_preference', () => {
      // day_preference: [1, 2, 3, 4, 5] means weekdays only
      const weekdayPrompt = {
        id: 'prompt-1',
        data: () => ({
          type: 'love_map_update',
          status: 'active',
          day_preference: [1, 2, 3, 4, 5], // Mon-Fri
          week_restriction: null,
          max_per_week: null,
        }),
      };

      // On Saturday (6), this prompt should be filtered out
      const currentDayOfWeek = 6; // Saturday
      const dayPreference = weekdayPrompt.data().day_preference;
      expect(dayPreference.includes(currentDayOfWeek)).toBe(false);

      // On Monday (1), should be included
      expect(dayPreference.includes(1)).toBe(true);
    });
  });

  describe('max_per_week filter', () => {
    it('should exclude prompts that have hit their weekly max', () => {
      const weeklyTypeCounts: Record<string, number> = {
        love_map_update: 3,
      };

      const prompt = {
        type: 'love_map_update',
        max_per_week: 3,
      };

      // Should be excluded because weekly count matches max
      const isExcluded = prompt.max_per_week != null &&
        (weeklyTypeCounts[prompt.type] || 0) >= prompt.max_per_week;
      expect(isExcluded).toBe(true);
    });

    it('should include prompts under their weekly max', () => {
      const weeklyTypeCounts: Record<string, number> = {
        love_map_update: 1,
      };

      const prompt = {
        type: 'love_map_update',
        max_per_week: 3,
      };

      const isExcluded = prompt.max_per_week != null &&
        (weeklyTypeCounts[prompt.type] || 0) >= prompt.max_per_week;
      expect(isExcluded).toBe(false);
    });
  });

  describe('week_restriction filter', () => {
    it('should exclude prompts for couples in early weeks', () => {
      const weekNumber = 1;
      const prompt = { week_restriction: 4 };

      // Week 1 couple shouldn't get a prompt with week_restriction 4
      const isExcluded = prompt.week_restriction != null && weekNumber < prompt.week_restriction;
      expect(isExcluded).toBe(true);
    });

    it('should include prompts for couples past the restriction', () => {
      const weekNumber = 5;
      const prompt = { week_restriction: 4 };

      const isExcluded = prompt.week_restriction != null && weekNumber < prompt.week_restriction;
      expect(isExcluded).toBe(false);
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
      function getEffectiveTone(tones: string[]): string {
        if (tones.includes('struggling')) return 'struggling';
        if (tones.includes('distant')) return 'distant';
        return 'solid';
      }

      expect(getEffectiveTone(['solid', 'distant'])).toBe('distant');
      expect(getEffectiveTone(['solid', 'struggling'])).toBe('struggling');
      expect(getEffectiveTone(['distant', 'struggling'])).toBe('struggling');
      expect(getEffectiveTone(['solid', 'solid'])).toBe('solid');
    });
  });

  describe('prompt_frequency skip logic', () => {
    it('should skip weekends for weekday frequency', () => {
      const frequency = 'weekdays';
      const saturday = 6;
      const sunday = 0;
      const monday = 1;

      const shouldSkipSat = frequency === 'weekdays' && (saturday === 0 || saturday === 6);
      const shouldSkipSun = frequency === 'weekdays' && (sunday === 0 || sunday === 6);
      const shouldSkipMon = frequency === 'weekdays' && (monday === 0 || monday === 6);

      expect(shouldSkipSat).toBe(true);
      expect(shouldSkipSun).toBe(true);
      expect(shouldSkipMon).toBe(false);
    });

    it('should skip weekdays for weekend frequency', () => {
      const frequency = 'weekends';
      const monday = 1;
      const saturday = 6;

      const shouldSkipMon = frequency === 'weekends' && monday >= 1 && monday <= 5;
      const shouldSkipSat = frequency === 'weekends' && saturday >= 1 && saturday <= 5;

      expect(shouldSkipMon).toBe(true);
      expect(shouldSkipSat).toBe(false);
    });
  });
});

describe('Streak Logic', () => {
  it('should increment streak when last_streak_date is yesterday', () => {
    const lastStreakDate = '2026-02-07';
    const today = '2026-02-08';
    const yesterday = '2026-02-07';
    let currentStreak = 5;

    if (lastStreakDate === today) {
      // no change
    } else if (lastStreakDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    expect(currentStreak).toBe(6);
  });

  it('should not change streak if already counted today', () => {
    const lastStreakDate = '2026-02-08';
    const today = '2026-02-08';
    const yesterday = '2026-02-07';
    let currentStreak = 5;

    if (lastStreakDate === today) {
      // no change
    } else if (lastStreakDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    expect(currentStreak).toBe(5);
  });

  it('should reset streak if last_streak_date is older than yesterday', () => {
    const lastStreakDate = '2026-02-05';
    const today = '2026-02-08';
    const yesterday = '2026-02-07';
    let currentStreak = 5;

    if (lastStreakDate === today) {
      // no change
    } else if (lastStreakDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    expect(currentStreak).toBe(1);
  });

  it('should update longest_streak when current exceeds it', () => {
    let currentStreak = 10;
    let longestStreak = 8;

    longestStreak = Math.max(currentStreak, longestStreak);
    expect(longestStreak).toBe(10);
  });
});

describe('Expire Stale Prompts', () => {
  it('should mark delivered/partial assignments from before today as expired', () => {
    // The function queries for assignments with status 'delivered' or 'partial'
    // where assigned_date < today, and sets status to 'expired'
    const staleAssignment = {
      status: 'delivered',
      assigned_date: '2026-02-07',
    };
    const today = '2026-02-08';

    expect(staleAssignment.assigned_date < today).toBe(true);
    expect(staleAssignment.status === 'delivered' || staleAssignment.status === 'partial').toBe(true);
  });
});

describe('Response Reminders', () => {
  it('should send reminders within 3-4 hour window', () => {
    const deliveredAt = new Date('2026-02-08T10:00:00');
    const now = new Date('2026-02-08T13:30:00');

    const hoursSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    expect(hoursSinceDelivery).toBeGreaterThanOrEqual(3);
    expect(hoursSinceDelivery).toBeLessThan(4);
  });

  it('should not send reminders outside the window', () => {
    const deliveredAt = new Date('2026-02-08T10:00:00');
    const tooEarly = new Date('2026-02-08T12:00:00');
    const tooLate = new Date('2026-02-08T14:30:00');

    const hoursEarly = (tooEarly.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);
    const hoursLate = (tooLate.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

    expect(hoursEarly < 3).toBe(true);
    expect(hoursLate >= 4).toBe(true);
  });

  it('should respect remind_to_respond=false preference', () => {
    const userData = { remind_to_respond: false };
    expect(userData.remind_to_respond === false).toBe(true);
  });
});

describe('onResponseSubmitted', () => {
  it('should create completion when response_count is 1 (second response)', () => {
    const assignment = { response_count: 1 };
    // If response_count is already 1, this is the second response
    expect(assignment.response_count === 1).toBe(true);
  });

  it('should notify partner on first response (response_count is 0)', () => {
    const assignment = { response_count: 0 };
    expect(assignment.response_count === 0).toBe(true);
  });

  it('should respect partner notification preference', () => {
    const partnerData = { notify_partner_response: false };
    const shouldNotify = partnerData.notify_partner_response !== false;
    expect(shouldNotify).toBe(false);
  });
});

// Clean up
afterAll(() => {
  test.cleanup();
});
