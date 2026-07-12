import {
  premiumGates,
  currentMonthOnly,
  isSameCalendarMonth,
  shouldShowPairingPaywall,
} from '@/utils/premiumGates';

describe('premiumGates', () => {
  describe('flag off (premiumGates: false)', () => {
    it('leaves every surface open — the app behaves exactly as before', () => {
      const gates = premiumGates({ gatesEnabled: false, isPremium: false });
      expect(gates).toEqual({
        dailyPromptLocked: false,
        exploreAnswerLocked: false,
        followUpLocked: false,
        exploreSendLocked: false,
        hearthHistoryLocked: false,
      });
    });
  });

  describe('flag on, couple free', () => {
    const gates = premiumGates({ gatesEnabled: true, isPremium: false });

    it('locks follow-ups, explore sends, and hearth history (past months + trends)', () => {
      expect(gates.followUpLocked).toBe(true);
      expect(gates.exploreSendLocked).toBe(true);
      expect(gates.hearthHistoryLocked).toBe(true);
    });

    it('never locks the daily prompt loop', () => {
      expect(gates.dailyPromptLocked).toBe(false);
    });

    it('never locks answering a question the partner sent', () => {
      expect(gates.exploreAnswerLocked).toBe(false);
    });

    it('exposes NO couch-queue lock — the current-month queue is free (the talk ritual is the hook)', () => {
      // hearthHistoryLocked covers pre-current-month entries and trends only.
      // Consumers derive the free queue from the currentMonthOnly() slice;
      // there is deliberately no key that could lock the visible queue.
      expect(Object.keys(gates).sort()).toEqual([
        'dailyPromptLocked',
        'exploreAnswerLocked',
        'exploreSendLocked',
        'followUpLocked',
        'hearthHistoryLocked',
      ]);
    });
  });

  describe('flag on, couple premium', () => {
    it('leaves everything open', () => {
      const gates = premiumGates({ gatesEnabled: true, isPremium: true });
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.hearthHistoryLocked).toBe(false);
      expect(gates.dailyPromptLocked).toBe(false);
      expect(gates.exploreAnswerLocked).toBe(false);
    });
  });

  describe('entitlement still loading', () => {
    it('keeps everything open so premium couples never see a flash of locks', () => {
      const gates = premiumGates({
        gatesEnabled: true,
        isPremium: false,
        isPremiumLoading: true,
      });
      expect(gates.followUpLocked).toBe(false);
      expect(gates.exploreSendLocked).toBe(false);
      expect(gates.hearthHistoryLocked).toBe(false);
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
