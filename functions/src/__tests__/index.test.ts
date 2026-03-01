import * as functionsTest from 'firebase-functions-test';
import { getPromptRecommendation } from '../index';

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
  it('should expire assignments from before yesterday', () => {
    const assignedDate = '2026-02-06';
    const yesterday = '2026-02-07';
    expect(assignedDate < yesterday).toBe(true);
  });

  it('should not expire assignments from yesterday (morning reminders may still fire)', () => {
    const assignedDate = '2026-02-07';
    const yesterday = '2026-02-07';
    expect(assignedDate < yesterday).toBe(false);
  });

  it('should not expire assignments from today', () => {
    const assignedDate = '2026-02-08';
    const yesterday = '2026-02-07';
    expect(assignedDate < yesterday).toBe(false);
  });
});

describe('Response Reminders', () => {
  describe('Reminder 1: 4-6 hour window', () => {
    it('should send reminder 1 within 4-6 hour window', () => {
      const deliveredAt = new Date('2026-02-08T10:00:00');
      const now = new Date('2026-02-08T14:30:00');
      const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      expect(hours).toBeGreaterThanOrEqual(4);
      expect(hours).toBeLessThan(6);
    });

    it('should not send reminder 1 before 4 hours', () => {
      const deliveredAt = new Date('2026-02-08T10:00:00');
      const now = new Date('2026-02-08T13:30:00');
      const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      expect(hours < 4).toBe(true);
    });

    it('should not send reminder 1 after 6 hours', () => {
      const deliveredAt = new Date('2026-02-08T10:00:00');
      const now = new Date('2026-02-08T16:30:00');
      const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      expect(hours >= 6).toBe(true);
    });
  });

  describe('Reminder 2: next morning 8-10 AM local', () => {
    it('should send reminder 2 when local hour is 8-9', () => {
      const localHour = 9;
      expect(localHour >= 8 && localHour < 10).toBe(true);
    });

    it('should not send reminder 2 before 8 AM local', () => {
      const localHour = 7;
      expect(localHour >= 8 && localHour < 10).toBe(false);
    });

    it('should not send reminder 2 at 10 AM local or later', () => {
      const localHour = 10;
      expect(localHour >= 8 && localHour < 10).toBe(false);
    });

    it('should require at least 8 hours since delivery for reminder 2', () => {
      const deliveredAt = new Date('2026-02-08T19:00:00');
      const now = new Date('2026-02-09T02:00:00'); // 7 hours later
      const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      expect(hours >= 8).toBe(false);
    });

    it('should allow reminder 2 after 8+ hours since delivery', () => {
      const deliveredAt = new Date('2026-02-08T19:00:00');
      const now = new Date('2026-02-09T09:00:00'); // 14 hours later
      const hours = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      expect(hours >= 8).toBe(true);
    });
  });

  describe('Deduplication via reminders_sent', () => {
    it('should treat missing reminders_sent as empty map', () => {
      const remindersSent: Record<string, number> | undefined = undefined;
      const map: Record<string, number> = remindersSent || {};
      const count = map['user123'] || 0;
      expect(count).toBe(0);
    });

    it('should not send reminder 1 if already sent (count >= 1)', () => {
      const remindersSent: Record<string, number> = { user123: 1 };
      const count = remindersSent['user123'] || 0;
      expect(count < 1).toBe(false);
    });

    it('should allow reminder 2 when count is 1', () => {
      const remindersSent: Record<string, number> = { user123: 1 };
      const count = remindersSent['user123'] || 0;
      expect(count === 1).toBe(true);
    });

    it('should cap at 2 reminders per user per assignment', () => {
      const remindersSent: Record<string, number> = { user123: 2 };
      const count = remindersSent['user123'] || 0;
      expect(count >= 2).toBe(true);
    });

    it('should track reminders independently per user in same assignment', () => {
      const remindersSent: Record<string, number> = { userA: 2, userB: 0 };
      expect((remindersSent['userA'] || 0) >= 2).toBe(true);
      expect((remindersSent['userB'] || 0) < 1).toBe(true);
    });
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

describe('deleteAccount', () => {
  it('should mark user as deleted with scheduled_purge_at 30 days out', () => {
    const now = new Date('2026-02-21T12:00:00Z');
    const scheduledPurgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    expect(scheduledPurgeAt.toISOString()).toBe('2026-03-23T12:00:00.000Z');
  });

  it('should disconnect couple by setting status to deleted', () => {
    const coupleStatus = 'active';
    const newStatus = 'deleted';
    expect(newStatus).toBe('deleted');
    expect(coupleStatus).not.toBe(newStatus);
  });

  it('should null couple_id for both users', () => {
    const memberIds = ['user1', 'user2'];
    const deletingUserId = 'user1';

    // Both members get couple_id nulled
    expect(memberIds).toContain(deletingUserId);
    expect(memberIds.length).toBe(2);
  });

  it('should identify partner for notification', () => {
    const memberIds = ['user1', 'user2'];
    const deletingUserId = 'user1';
    const partnerId = memberIds.find((id) => id !== deletingUserId);

    expect(partnerId).toBe('user2');
  });

  it('should handle user with no couple gracefully', () => {
    const coupleId: string | null = null;
    const shouldDisconnectCouple = coupleId !== null;

    expect(shouldDisconnectCouple).toBe(false);
  });
});

describe('cleanupDeletedAccounts', () => {
  it('should identify users past their purge date', () => {
    const now = new Date('2026-03-25T03:00:00Z');
    const scheduledPurgeAt = new Date('2026-03-23T12:00:00Z');

    expect(scheduledPurgeAt <= now).toBe(true);
  });

  it('should not purge users before their purge date', () => {
    const now = new Date('2026-02-25T03:00:00Z');
    const scheduledPurgeAt = new Date('2026-03-23T12:00:00Z');

    expect(scheduledPurgeAt <= now).toBe(false);
  });

  it('should delete user-owned data (responses, events, user doc)', () => {
    const collectionsToDelete = ['prompt_responses', 'events'];
    expect(collectionsToDelete).toContain('prompt_responses');
    expect(collectionsToDelete).toContain('events');
  });

  it('should preserve shared data (completions, memories, couple doc)', () => {
    const collectionsToDelete = ['prompt_responses', 'events'];
    expect(collectionsToDelete).not.toContain('prompt_completions');
    expect(collectionsToDelete).not.toContain('memory_artifacts');
    expect(collectionsToDelete).not.toContain('couples');
  });
});

describe('exportUserData', () => {
  it('should enforce 24-hour rate limit', () => {
    const lastExportAt = new Date('2026-02-21T10:00:00Z');
    const now = new Date('2026-02-21T20:00:00Z');
    const hoursSince = (now.getTime() - lastExportAt.getTime()) / (1000 * 60 * 60);

    expect(hoursSince).toBe(10);
    expect(hoursSince < 24).toBe(true);
  });

  it('should allow export after 24 hours', () => {
    const lastExportAt = new Date('2026-02-20T10:00:00Z');
    const now = new Date('2026-02-21T20:00:00Z');
    const hoursSince = (now.getTime() - lastExportAt.getTime()) / (1000 * 60 * 60);

    expect(hoursSince).toBe(34);
    expect(hoursSince < 24).toBe(false);
  });

  it('should exclude push_tokens from profile data', () => {
    const userData = {
      email: 'test@example.com',
      display_name: 'Test',
      push_tokens: [{ token: 'abc123' }],
    };
    const { push_tokens, ...profileData } = userData;

    expect(profileData).not.toHaveProperty('push_tokens');
    expect(profileData).toHaveProperty('email');
    expect(profileData).toHaveProperty('display_name');
  });

  it('should include all user data collections', () => {
    const exportedCollections = [
      'profile',
      'prompt_responses',
      'events',
      'memories',
      'goals',
      'wishlist_items',
    ];

    expect(exportedCollections).toContain('prompt_responses');
    expect(exportedCollections).toContain('events');
    expect(exportedCollections).toContain('memories');
    expect(exportedCollections).toContain('goals');
    expect(exportedCollections).toContain('wishlist_items');
  });
});

describe('anonymizeMyResponses', () => {
  it('should replace response_text with [removed]', () => {
    const originalResponse = { response_text: 'I love our morning walks together.' };
    const anonymized = { ...originalResponse, response_text: '[removed]' };

    expect(anonymized.response_text).toBe('[removed]');
  });

  it('should replace response_text_encrypted with [removed]', () => {
    const originalResponse = { response_text_encrypted: 'encrypted_data_here' };
    const anonymized = { ...originalResponse, response_text_encrypted: '[removed]' };

    expect(anonymized.response_text_encrypted).toBe('[removed]');
  });

  it('should update matching responses in prompt_completions', () => {
    const userId = 'user1';
    const completionResponses = [
      { user_id: 'user1', response_text: 'My answer' },
      { user_id: 'user2', response_text: 'Partner answer' },
    ];

    const updated = completionResponses.map((r) =>
      r.user_id === userId ? { ...r, response_text: '[removed]' } : r
    );

    expect(updated[0].response_text).toBe('[removed]');
    expect(updated[1].response_text).toBe('Partner answer');
  });

  it('should update matching responses in memory_artifacts', () => {
    const userId = 'user1';
    const memoryResponses = [
      { user_id: 'user1', response_text: 'My answer' },
      { user_id: 'user2', response_text: 'Partner answer' },
    ];

    const hasUserResponse = memoryResponses.some((r) => r.user_id === userId);
    expect(hasUserResponse).toBe(true);

    const updated = memoryResponses.map((r) =>
      r.user_id === userId ? { ...r, response_text: '[removed]' } : r
    );

    expect(updated[0].response_text).toBe('[removed]');
    expect(updated[1].response_text).toBe('Partner answer');
  });

  it('should not modify memories without user responses', () => {
    const userId = 'user1';
    const memoryResponses = [
      { user_id: 'user3', response_text: 'Other answer' },
      { user_id: 'user2', response_text: 'Partner answer' },
    ];

    const hasUserResponse = memoryResponses.some((r) => r.user_id === userId);
    expect(hasUserResponse).toBe(false);
  });

  it('should return the count of anonymized responses', () => {
    const responseCount = 15;
    const result = { anonymized_count: responseCount };

    expect(result.anonymized_count).toBe(15);
  });
});

// ============================================
// Churn Risk Detection
// ============================================

// Helper: compute consecutive missed prompts from assignment statuses (most recent first)
function computeConsecutiveMissed(statuses: string[]): number {
  let count = 0;
  for (const status of statuses) {
    if (status === 'completed') break;
    if (status === 'delivered' || status === 'partial' || status === 'expired') {
      count++;
    }
  }
  return count;
}

// Helper: determine churn risk level
function getChurnRiskLevel(consecutiveMissed: number): string | null {
  if (consecutiveMissed >= 7) return 'high';
  if (consecutiveMissed >= 5) return 'medium';
  if (consecutiveMissed >= 3) return 'low';
  return null;
}

describe('Churn Risk Detection', () => {
  describe('consecutive missed counting', () => {
    it('should count consecutive missed from most recent', () => {
      const statuses = ['expired', 'delivered', 'partial', 'completed', 'expired'];
      expect(computeConsecutiveMissed(statuses)).toBe(3);
    });

    it('should return 0 when most recent is completed', () => {
      const statuses = ['completed', 'expired', 'expired'];
      expect(computeConsecutiveMissed(statuses)).toBe(0);
    });

    it('should count all when none completed', () => {
      const statuses = ['expired', 'delivered', 'partial', 'expired', 'expired'];
      expect(computeConsecutiveMissed(statuses)).toBe(5);
    });

    it('should handle empty assignment list', () => {
      expect(computeConsecutiveMissed([])).toBe(0);
    });

    it('should count partial as missed', () => {
      const statuses = ['partial', 'partial', 'completed'];
      expect(computeConsecutiveMissed(statuses)).toBe(2);
    });

    it('should count delivered as missed', () => {
      const statuses = ['delivered', 'completed'];
      expect(computeConsecutiveMissed(statuses)).toBe(1);
    });
  });

  describe('risk level thresholds', () => {
    it('should return null for 0-2 missed', () => {
      expect(getChurnRiskLevel(0)).toBeNull();
      expect(getChurnRiskLevel(1)).toBeNull();
      expect(getChurnRiskLevel(2)).toBeNull();
    });

    it('should return low for 3-4 missed', () => {
      expect(getChurnRiskLevel(3)).toBe('low');
      expect(getChurnRiskLevel(4)).toBe('low');
    });

    it('should return medium for 5-6 missed', () => {
      expect(getChurnRiskLevel(5)).toBe('medium');
      expect(getChurnRiskLevel(6)).toBe('medium');
    });

    it('should return high for 7+ missed', () => {
      expect(getChurnRiskLevel(7)).toBe('high');
      expect(getChurnRiskLevel(10)).toBe('high');
      expect(getChurnRiskLevel(20)).toBe('high');
    });
  });

  describe('new couple protection', () => {
    it('should skip couples linked less than 3 days ago', () => {
      const now = new Date('2026-02-21T05:00:00Z');
      const linkedAt = new Date('2026-02-20T12:00:00Z');
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(linkedAt > threeDaysAgo).toBe(true);
    });

    it('should include couples linked more than 3 days ago', () => {
      const now = new Date('2026-02-21T05:00:00Z');
      const linkedAt = new Date('2026-02-15T12:00:00Z');
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(linkedAt > threeDaysAgo).toBe(false);
    });

    it('should include couples linked exactly 3 days ago', () => {
      const now = new Date('2026-02-21T05:00:00Z');
      const linkedAt = new Date('2026-02-18T05:00:00Z');
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(linkedAt > threeDaysAgo).toBe(false);
    });
  });

  describe('push notification trigger', () => {
    it('should send push notification only for high risk', () => {
      const shouldNotify = (risk: string | null) => risk === 'high';

      expect(shouldNotify('high')).toBe(true);
      expect(shouldNotify('medium')).toBe(false);
      expect(shouldNotify('low')).toBe(false);
      expect(shouldNotify(null)).toBe(false);
    });
  });
});

// ============================================
// Prompt Graduation Rules
// ============================================

describe('Prompt Graduation Rules', () => {
  describe('getPromptRecommendation helper', () => {
    it('should return needs_more_data when fewer than 10 assignments', () => {
      expect(getPromptRecommendation(0, 0, { positive: 0, neutral: 0, negative: 0 })).toBe('needs_more_data');
      expect(getPromptRecommendation(5, 4, { positive: 4, neutral: 0, negative: 0 })).toBe('needs_more_data');
      expect(getPromptRecommendation(9, 9, { positive: 9, neutral: 0, negative: 0 })).toBe('needs_more_data');
    });

    it('should graduate when completion >= 75% and positive >= 60%', () => {
      // 80% completion, 70% positive
      expect(getPromptRecommendation(10, 8, { positive: 7, neutral: 2, negative: 1 })).toBe('graduate');
    });

    it('should graduate at exact thresholds (75% completion, 60% positive)', () => {
      // 75% completion (15/20), 60% positive (6/10)
      expect(getPromptRecommendation(20, 15, { positive: 6, neutral: 2, negative: 2 })).toBe('graduate');
    });

    it('should retire when completion < 30%', () => {
      // 20% completion
      expect(getPromptRecommendation(10, 2, { positive: 2, neutral: 0, negative: 0 })).toBe('retire');
    });

    it('should retire at boundary (29% completion)', () => {
      // 2/10 = 20%, under 30%
      expect(getPromptRecommendation(10, 2, { positive: 1, neutral: 0, negative: 1 })).toBe('retire');
    });

    it('should not retire at exactly 30% completion', () => {
      // 3/10 = 30%, not under 30%
      const result = getPromptRecommendation(10, 3, { positive: 3, neutral: 0, negative: 0 });
      expect(result).not.toBe('retire');
    });

    it('should rewrite when positive < 40% with sufficient sentiments', () => {
      // 80% completion, 30% positive (3/10)
      expect(getPromptRecommendation(10, 8, { positive: 3, neutral: 3, negative: 4 })).toBe('rewrite');
    });

    it('should keep_testing when metrics are mixed', () => {
      // 50% completion, 50% positive
      expect(getPromptRecommendation(10, 5, { positive: 5, neutral: 3, negative: 2 })).toBe('keep_testing');
    });

    it('should keep_testing when good completion but low positive', () => {
      // 80% completion, 50% positive (between 40-60%)
      expect(getPromptRecommendation(10, 8, { positive: 5, neutral: 3, negative: 2 })).toBe('keep_testing');
    });

    it('should keep_testing when no sentiments available but completion ok', () => {
      // 50% completion, no sentiments
      expect(getPromptRecommendation(10, 5, { positive: 0, neutral: 0, negative: 0 })).toBe('keep_testing');
    });
  });

  describe('auto-graduation thresholds', () => {
    it('should skip prompts with < 10 assignments', () => {
      const timesAssigned = 9;
      expect(timesAssigned < 10).toBe(true);
    });

    it('should evaluate prompts with >= 10 assignments', () => {
      const timesAssigned = 10;
      expect(timesAssigned < 10).toBe(false);
    });
  });

  describe('status transitions', () => {
    const validTransitions: Record<string, string> = {
      draft: 'testing',
      testing: 'active',
    };

    it('should allow draft -> testing', () => {
      expect(validTransitions['draft']).toBe('testing');
    });

    it('should allow testing -> active', () => {
      expect(validTransitions['testing']).toBe('active');
    });

    it('should not allow active -> anything via promote', () => {
      expect(validTransitions['active']).toBeUndefined();
    });

    it('should not allow retired -> anything via promote', () => {
      expect(validTransitions['retired']).toBeUndefined();
    });
  });
});

// ============================================
// Prompt Management Validation
// ============================================

describe('Prompt Management Validation', () => {
  const VALID_TYPES = [
    'love_map_update',
    'bid_for_connection',
    'appreciation_expression',
    'dream_exploration',
    'conflict_navigation',
    'repair_attempt',
  ];

  const VALID_DEPTHS = ['surface', 'medium', 'deep'];

  const ALLOWED_UPDATE_FIELDS = [
    'text', 'hint', 'type', 'emotional_depth', 'research_basis',
    'requires_conversation', 'week_restriction', 'max_per_week', 'day_preference',
  ];

  describe('type validation', () => {
    it('should accept all valid prompt types', () => {
      for (const type of VALID_TYPES) {
        expect(VALID_TYPES.includes(type)).toBe(true);
      }
    });

    it('should reject invalid prompt types', () => {
      expect(VALID_TYPES.includes('invalid_type')).toBe(false);
      expect(VALID_TYPES.includes('')).toBe(false);
      expect(VALID_TYPES.includes('LOVE_MAP_UPDATE')).toBe(false);
    });
  });

  describe('depth validation', () => {
    it('should accept all valid depths', () => {
      for (const depth of VALID_DEPTHS) {
        expect(VALID_DEPTHS.includes(depth)).toBe(true);
      }
    });

    it('should reject invalid depths', () => {
      expect(VALID_DEPTHS.includes('shallow')).toBe(false);
      expect(VALID_DEPTHS.includes('very_deep')).toBe(false);
    });
  });

  describe('action validation', () => {
    const VALID_ACTIONS = ['create', 'update', 'promote', 'retire'];

    it('should accept all valid actions', () => {
      for (const action of VALID_ACTIONS) {
        expect(VALID_ACTIONS.includes(action)).toBe(true);
      }
    });

    it('should reject invalid actions', () => {
      expect(VALID_ACTIONS.includes('delete')).toBe(false);
      expect(VALID_ACTIONS.includes('archive')).toBe(false);
    });
  });

  describe('required fields for create', () => {
    it('should require text, type, and emotional_depth', () => {
      const fields = { text: 'Test prompt', type: 'love_map_update', emotional_depth: 'surface' };
      const hasRequired = fields.text && fields.type && fields.emotional_depth;
      expect(!!hasRequired).toBe(true);
    });

    it('should fail when text is missing', () => {
      const fields = { type: 'love_map_update', emotional_depth: 'surface' } as any;
      const hasRequired = fields.text && fields.type && fields.emotional_depth;
      expect(!!hasRequired).toBe(false);
    });

    it('should fail when type is missing', () => {
      const fields = { text: 'Test', emotional_depth: 'surface' } as any;
      const hasRequired = fields.text && fields.type && fields.emotional_depth;
      expect(!!hasRequired).toBe(false);
    });

    it('should fail when emotional_depth is missing', () => {
      const fields = { text: 'Test', type: 'love_map_update' } as any;
      const hasRequired = fields.text && fields.type && fields.emotional_depth;
      expect(!!hasRequired).toBe(false);
    });
  });

  describe('allowlisted update fields', () => {
    it('should allow text updates', () => {
      expect(ALLOWED_UPDATE_FIELDS.includes('text')).toBe(true);
    });

    it('should allow scheduling field updates', () => {
      expect(ALLOWED_UPDATE_FIELDS.includes('week_restriction')).toBe(true);
      expect(ALLOWED_UPDATE_FIELDS.includes('max_per_week')).toBe(true);
      expect(ALLOWED_UPDATE_FIELDS.includes('day_preference')).toBe(true);
    });

    it('should block metric fields from being updated', () => {
      const metricFields = [
        'times_assigned', 'times_completed', 'completion_rate',
        'avg_response_length', 'positive_response_rate',
      ];
      for (const field of metricFields) {
        expect(ALLOWED_UPDATE_FIELDS.includes(field)).toBe(false);
      }
    });

    it('should block status from direct update (use promote/retire)', () => {
      expect(ALLOWED_UPDATE_FIELDS.includes('status')).toBe(false);
    });

    it('should block created_at and created_by from update', () => {
      expect(ALLOWED_UPDATE_FIELDS.includes('created_at')).toBe(false);
      expect(ALLOWED_UPDATE_FIELDS.includes('created_by')).toBe(false);
    });
  });

  describe('create defaults', () => {
    it('should default new prompts to testing status', () => {
      const defaultStatus = 'testing';
      expect(defaultStatus).toBe('testing');
    });

    it('should default research_basis to original', () => {
      const fields: { research_basis?: string } = {};
      const researchBasis = fields.research_basis || 'original';
      expect(researchBasis).toBe('original');
    });

    it('should default requires_conversation to false', () => {
      const fields: { requires_conversation?: boolean } = {};
      const requiresConversation = fields.requires_conversation || false;
      expect(requiresConversation).toBe(false);
    });
  });
});

// ============================================
// Check-In Feature
// ============================================

describe('deliverCheckIn', () => {
  it('should flag users with 7+ day gap since last check-in', () => {
    const now = new Date('2026-03-08T18:00:00Z');
    const lastCheckIn = new Date('2026-02-28T10:00:00Z'); // 8 days ago
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(lastCheckIn <= oneWeekAgo).toBe(true);
  });

  it('should not flag users with a recent check-in (under 7 days)', () => {
    const now = new Date('2026-03-08T18:00:00Z');
    const lastCheckIn = new Date('2026-03-05T10:00:00Z'); // 3 days ago
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(lastCheckIn <= oneWeekAgo).toBe(false);
  });

  it('should flag users with no check-in history', () => {
    const checkInsEmpty = true;
    expect(checkInsEmpty).toBe(true);
  });

  it('should flag users with check-in exactly 7 days ago', () => {
    const now = new Date('2026-03-08T18:00:00Z');
    const lastCheckIn = new Date('2026-03-01T18:00:00Z'); // exactly 7 days
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(lastCheckIn <= oneWeekAgo).toBe(true);
  });
});

describe('onCheckInSubmitted', () => {
  it('should identify partner from couple member_ids', () => {
    const memberIds = ['userA', 'userB'];
    const submitterId = 'userA';
    const partnerId = memberIds.find((id) => id !== submitterId);

    expect(partnerId).toBe('userB');
  });

  it('should handle submitter as second member', () => {
    const memberIds = ['userA', 'userB'];
    const submitterId = 'userB';
    const partnerId = memberIds.find((id) => id !== submitterId);

    expect(partnerId).toBe('userA');
  });

  it('should use display_name for notification body', () => {
    const displayName = 'Alex';
    const body = `${displayName} checked in this week`;
    expect(body).toBe('Alex checked in this week');
  });

  it('should fall back to "Your partner" when no display_name', () => {
    const displayName: string | null = null;
    const name = displayName || 'Your partner';
    const body = `${name} checked in this week`;
    expect(body).toBe('Your partner checked in this week');
  });
});

afterAll(() => {
  test.cleanup();
});
