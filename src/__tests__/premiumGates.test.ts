import {
  premiumGates,
  currentMonthOnly,
  isSameCalendarMonth,
  shouldShowPairingPaywall,
  FREE_FOLLOW_UP_TASTE,
  FREE_EXPLORE_SENDS_PER_MONTH,
} from '@/utils/premiumGates';

describe('premiumGates', () => {
  describe('flag off (premiumGates: false)', () => {
    it('leaves every surface open — the app behaves exactly as before', () => {
      const gates = premiumGates({ gatesEnabled: false, isPremium: false });
      expect(gates.dailyPromptLocked).toBe(false);
      expect(gates.exploreAnswerLocked).toBe(false);
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.hearthHistoryLocked).toBe(false);
      expect(gates.usViewLocked).toBe(false);
    });
  });

  describe('flag on, couple free, no usage', () => {
    const gates = premiumGates({
      gatesEnabled: true,
      isPremium: false,
      followUpsCompleted: 0,
      exploreSendsThisMonth: 0,
    });

    it('allows the first follow-up taste (not locked)', () => {
      expect(gates.followUpLocked).toBe(false);
      expect(gates.freeFollowUpsRemaining).toBe(FREE_FOLLOW_UP_TASTE);
    });

    it('allows the first explore sends (not locked)', () => {
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.freeExploreSendsRemaining).toBe(FREE_EXPLORE_SENDS_PER_MONTH);
    });

    it('locks hearth history and us view', () => {
      expect(gates.hearthHistoryLocked).toBe(true);
      expect(gates.usViewLocked).toBe(true);
    });

    it('never locks the daily prompt loop', () => {
      expect(gates.dailyPromptLocked).toBe(false);
    });

    it('never locks answering a question the partner sent', () => {
      expect(gates.exploreAnswerLocked).toBe(false);
    });
  });

  describe('flag on, couple free, follow-up taste exhausted', () => {
    it('locks follow-ups after FREE_FOLLOW_UP_TASTE completions', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        followUpsCompleted: FREE_FOLLOW_UP_TASTE,
      });
      expect(gates.followUpLocked).toBe(true);
      expect(gates.freeFollowUpsRemaining).toBe(0);
    });

    it('locks follow-ups when well past the threshold', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        followUpsCompleted: 10,
      });
      expect(gates.followUpLocked).toBe(true);
      expect(gates.freeFollowUpsRemaining).toBe(0);
    });
  });

  describe('flag on, couple free, explore sends exhausted', () => {
    it('locks explore sends after FREE_EXPLORE_SENDS_PER_MONTH', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        exploreSendsThisMonth: FREE_EXPLORE_SENDS_PER_MONTH,
      });
      expect(gates.exploreSendLocked).toBe(true);
      expect(gates.freeExploreSendsRemaining).toBe(0);
    });

    it('allows explore sends below the threshold', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        exploreSendsThisMonth: 2,
      });
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.freeExploreSendsRemaining).toBe(1);
    });
  });

  describe('flag on, couple premium', () => {
    it('leaves everything open with infinite remaining', () => {
      const gates = premiumGates({ gatesEnabled: true, isPremium: true });
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.hearthHistoryLocked).toBe(false);
      expect(gates.usViewLocked).toBe(false);
      expect(gates.dailyPromptLocked).toBe(false);
      expect(gates.exploreAnswerLocked).toBe(false);
      expect(gates.freeFollowUpsRemaining).toBe(Infinity);
      expect(gates.freeExploreSendsRemaining).toBe(Infinity);
    });
  });

  describe('entitlement still loading', () => {
    it('keeps everything open so premium couples never see a flash of locks', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        isPremiumLoading: true,
        followUpsCompleted: 100,
        exploreSendsThisMonth: 100,
      });
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.hearthHistoryLocked).toBe(false);
    });
  });

  describe('backward compatibility (no usage counts provided)', () => {
    it('defaults to zero usage — first taste available', () => {
      const gates = premiumGates({ gatesEnabled: true, isPremium: false });
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.freeFollowUpsRemaining).toBe(FREE_FOLLOW_UP_TASTE);
      expect(gates.freeExploreSendsRemaining).toBe(FREE_EXPLORE_SENDS_PER_MONTH);
    });
  });

  describe('gate map keys', () => {
    it('includes the new remaining counters', () => {
      const gates = premiumGates({ gatesEnabled: true, isPremium: false });
      expect(Object.keys(gates).sort()).toEqual([
        'dailyPromptLocked',
        'exploreAnswerLocked',
        'exploreSendLocked',
        'followUpLocked',
        'freeExploreSendsRemaining',
        'freeFollowUpsRemaining',
        'hearthHistoryLocked',
        'usViewLocked',
      ]);
    });
  });
});

describe('isSameCalendarMonth', () => {
  const now = new Date(2026, 6, 9); // July 9, 2026

  it('is true within the same month', () => {
    expect(isSameCalendarMonth(new Date(2026, 6, 1), now)).toBe(true);
    expect(isSameCalendarMonth(new Date(2026, 6, 31), now)).toBe(true);
  });

  it('is false for other months, other years, and null', () => {
    expect(isSameCalendarMonth(new Date(2026, 5, 30), now)).toBe(false);
    expect(isSameCalendarMonth(new Date(2025, 6, 9), now)).toBe(false);
    expect(isSameCalendarMonth(null, now)).toBe(false);
  });
});

describe('currentMonthOnly', () => {
  const now = new Date(2026, 6, 9);
  const thisMonth = { id: 'a', completedAt: new Date(2026, 6, 2) };
  const lastMonth = { id: 'b', completedAt: new Date(2026, 5, 28) };
  const undated = { id: 'c', completedAt: null };

  it('keeps only completions from the current calendar month', () => {
    const result = currentMonthOnly([thisMonth, lastMonth, undated], now);
    expect(result).toEqual([thisMonth]);
  });

  it('does not mutate the input', () => {
    const input = [thisMonth, lastMonth];
    currentMonthOnly(input, now);
    expect(input).toHaveLength(2);
  });
});

describe('shouldShowPairingPaywall', () => {
  const base = {
    gatesEnabled: true,
    isPremium: false,
    isPremiumLoading: false,
    alreadySeen: false,
  };

  it('shows once after pairing for a free couple', () => {
    expect(shouldShowPairingPaywall(base)).toBe(true);
  });

  it('never shows when the flag is off', () => {
    expect(shouldShowPairingPaywall({ ...base, gatesEnabled: false })).toBe(false);
  });

  it('never shows to an already-premium couple', () => {
    expect(shouldShowPairingPaywall({ ...base, isPremium: true })).toBe(false);
  });

  it('never blocks the flow while entitlement is loading', () => {
    expect(shouldShowPairingPaywall({ ...base, isPremiumLoading: true })).toBe(false);
  });

  it('shows exactly once — never again after it was seen', () => {
    expect(shouldShowPairingPaywall({ ...base, alreadySeen: true })).toBe(false);
  });
});
