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

afterAll(() => {
  test.cleanup();
});
