import * as functionsTest from 'firebase-functions-test';
import {
  evaluateFollowUpBranch,
  canScoreTriggerFollowUp,
  isRepairStepOne,
  extractScores,
  pickTemplate,
  findDueScheduledFollowUp,
  nextDayInTimezone,
  todayInTimezone,
} from '../followUps';
import { DEFAULT_SCALE_CONFIG, FollowUpTemplate } from '../shared';

const test = functionsTest.default();

// ============================================
// Branch Evaluation (locked precedence: divergence > repair > deepener)
// ============================================

describe('evaluateFollowUpBranch', () => {
  describe('divergence (gap >= 4) — highest precedence', () => {
    it('should fire divergence at exactly the gap threshold', () => {
      expect(evaluateFollowUpBranch(5, 9)).toBe('divergence');
      expect(evaluateFollowUpBranch(9, 5)).toBe('divergence');
    });

    it('should override repair when both gap and low score apply', () => {
      // min(1, 9) = 1 <= 4 would be repair, but gap 8 >= 4 wins
      expect(evaluateFollowUpBranch(1, 9)).toBe('divergence');
      expect(evaluateFollowUpBranch(2, 8)).toBe('divergence');
    });

    it('should override deepener when both gap and high scores could apply', () => {
      // 10 is >= high_threshold but gap 6 >= 4 wins over any other branch
      expect(evaluateFollowUpBranch(10, 4)).toBe('divergence');
    });
  });

  describe('repair (min <= 4) — second precedence', () => {
    it('should fire repair when min score is at the low threshold', () => {
      // gap 2 < 4, min 4 <= 4
      expect(evaluateFollowUpBranch(4, 6)).toBe('repair');
      expect(evaluateFollowUpBranch(6, 4)).toBe('repair');
    });

    it('should fire repair for low scores without divergence', () => {
      expect(evaluateFollowUpBranch(3, 5)).toBe('repair');
      expect(evaluateFollowUpBranch(2, 4)).toBe('repair');
      expect(evaluateFollowUpBranch(4, 4)).toBe('repair');
    });

    it('should fire repair when both scores are low and close', () => {
      expect(evaluateFollowUpBranch(1, 2)).toBe('repair');
    });
  });

  describe('deepener (both >= 9) — third precedence', () => {
    it('should fire deepener when both scores are at or above 9', () => {
      expect(evaluateFollowUpBranch(9, 9)).toBe('deepener');
      expect(evaluateFollowUpBranch(10, 9)).toBe('deepener');
      expect(evaluateFollowUpBranch(10, 10)).toBe('deepener');
    });

    it('should NOT fire deepener when only one score is >= 9 (9/6 case)', () => {
      // gap 3 < 4, min 6 > 4, only one score >= 9 -> nothing fires
      expect(evaluateFollowUpBranch(9, 6)).toBeNull();
      expect(evaluateFollowUpBranch(6, 9)).toBeNull();
    });

    it('should NOT fire deepener at 10/8 (one below threshold)', () => {
      expect(evaluateFollowUpBranch(10, 8)).toBeNull();
    });
  });

  describe('no branch — middle scores', () => {
    it('should fire nothing for middle scores', () => {
      expect(evaluateFollowUpBranch(6, 7)).toBeNull();
      expect(evaluateFollowUpBranch(5, 8)).toBeNull();
      expect(evaluateFollowUpBranch(7, 7)).toBeNull();
      expect(evaluateFollowUpBranch(5, 6)).toBeNull();
      expect(evaluateFollowUpBranch(8, 8)).toBeNull();
    });
  });

  describe('custom scale config', () => {
    it('should respect a custom divergence gap', () => {
      const config = { ...DEFAULT_SCALE_CONFIG, divergence_gap: 6 };
      expect(evaluateFollowUpBranch(5, 9, config)).toBeNull(); // gap 4 < 6, min 5, not both >= 9
      expect(evaluateFollowUpBranch(2, 9, config)).toBe('divergence'); // gap 7 >= 6
    });

    it('should respect custom thresholds', () => {
      const config = { ...DEFAULT_SCALE_CONFIG, low_threshold: 2, high_threshold: 7 };
      expect(evaluateFollowUpBranch(4, 6, config)).toBeNull(); // min 4 > 2
      expect(evaluateFollowUpBranch(7, 8, config)).toBe('deepener'); // both >= 7
    });
  });
});

// ============================================
// Trigger Guards
// ============================================

describe('canScoreTriggerFollowUp', () => {
  it('should allow scale-format daily assignments', () => {
    expect(canScoreTriggerFollowUp({ assignment_kind: 'daily', response_format: 'scale' })).toBe(true);
  });

  it('should treat missing assignment_kind as daily', () => {
    expect(canScoreTriggerFollowUp({ response_format: 'scale' })).toBe(true);
  });

  it('should never allow follow-up assignments to score-trigger', () => {
    expect(canScoreTriggerFollowUp({ assignment_kind: 'follow_up', response_format: 'text' })).toBe(false);
    // Even a hypothetical scale-format follow-up must not score-trigger
    expect(canScoreTriggerFollowUp({ assignment_kind: 'follow_up', response_format: 'scale' })).toBe(false);
  });

  it('should not allow text-format daily assignments', () => {
    expect(canScoreTriggerFollowUp({ assignment_kind: 'daily', response_format: 'text' })).toBe(false);
    expect(canScoreTriggerFollowUp({ assignment_kind: 'daily' })).toBe(false);
    expect(canScoreTriggerFollowUp({})).toBe(false);
  });
});

describe('isRepairStepOne (step-2 chaining exception)', () => {
  it('should identify a repair step-1 follow-up assignment', () => {
    expect(isRepairStepOne({
      assignment_kind: 'follow_up',
      follow_up: { branch: 'repair', step: 1 },
    })).toBe(true);
  });

  it('should not match repair step 2 (no further chaining)', () => {
    expect(isRepairStepOne({
      assignment_kind: 'follow_up',
      follow_up: { branch: 'repair', step: 2 },
    })).toBe(false);
  });

  it('should not match deepener or divergence follow-ups', () => {
    expect(isRepairStepOne({
      assignment_kind: 'follow_up',
      follow_up: { branch: 'deepener', step: 1 },
    })).toBe(false);
    expect(isRepairStepOne({
      assignment_kind: 'follow_up',
      follow_up: { branch: 'divergence', step: 1 },
    })).toBe(false);
  });

  it('should not match daily assignments', () => {
    expect(isRepairStepOne({ assignment_kind: 'daily' })).toBe(false);
    expect(isRepairStepOne({})).toBe(false);
  });
});

// ============================================
// Score Extraction
// ============================================

describe('extractScores', () => {
  it('should extract two numeric scores', () => {
    expect(extractScores([{ response_score: 3 }, { response_score: 8 }])).toEqual([3, 8]);
  });

  it('should return null when a score is missing', () => {
    expect(extractScores([{ response_score: 3 }, {}])).toBeNull();
    expect(extractScores([{ response_score: 3 }, { response_score: null }])).toBeNull();
  });

  it('should return null when only one response exists', () => {
    expect(extractScores([{ response_score: 5 }])).toBeNull();
  });

  it('should return null for free-text responses (no scores)', () => {
    expect(extractScores([{}, {}])).toBeNull();
    expect(extractScores([{ response_score: null }, { response_score: null }])).toBeNull();
  });
});

// ============================================
// Template Selection
// ============================================

function makeTemplate(id: string, variant: number): FollowUpTemplate {
  return {
    id,
    category: 'communication',
    branch: 'repair',
    step: 1,
    text: 'Template text',
    variant,
    active: true,
  };
}

describe('pickTemplate', () => {
  const templates = [
    makeTemplate('fu_a_v1', 1),
    makeTemplate('fu_a_v2', 2),
    makeTemplate('fu_a_v3', 3),
  ];

  it('should return null when no templates exist', () => {
    expect(pickTemplate([], [])).toBeNull();
  });

  it('should pick from all templates when none are used', () => {
    const picked = pickTemplate(templates, []);
    expect(templates).toContainEqual(picked);
  });

  it('should prefer an unused variant when the couple has prior follow-ups', () => {
    const picked = pickTemplate(templates, ['fu_a_v1', 'fu_a_v3']);
    expect(picked?.id).toBe('fu_a_v2');
  });

  it('should fall back to all templates when every variant is used', () => {
    const picked = pickTemplate(templates, ['fu_a_v1', 'fu_a_v2', 'fu_a_v3']);
    expect(templates).toContainEqual(picked);
  });

  it('should honor the preferred variant (repair step 2 keeps step-1 family)', () => {
    const picked = pickTemplate(templates, ['fu_a_v2'], 2);
    expect(picked?.variant).toBe(2);
  });

  it('should fall back to normal selection when preferred variant is missing', () => {
    const picked = pickTemplate(templates, [], 99);
    expect(templates).toContainEqual(picked);
  });
});

// ============================================
// Scheduled Follow-Up Activation (deliverDailyPrompts path)
// ============================================

describe('findDueScheduledFollowUp', () => {
  it('should activate a follow-up scheduled for today instead of a new prompt', () => {
    const scheduled = [{ id: 'fu1', assigned_date: '2026-07-06' }];
    const due = findDueScheduledFollowUp(scheduled, '2026-07-06');
    expect(due?.id).toBe('fu1');
  });

  it('should activate overdue follow-ups (missed delivery day)', () => {
    const scheduled = [{ id: 'fu1', assigned_date: '2026-07-04' }];
    const due = findDueScheduledFollowUp(scheduled, '2026-07-06');
    expect(due?.id).toBe('fu1');
  });

  it('should pick the earliest when multiple are due', () => {
    const scheduled = [
      { id: 'later', assigned_date: '2026-07-06' },
      { id: 'earlier', assigned_date: '2026-07-05' },
    ];
    const due = findDueScheduledFollowUp(scheduled, '2026-07-06');
    expect(due?.id).toBe('earlier');
  });

  it('should not activate follow-ups scheduled for a future day', () => {
    const scheduled = [{ id: 'fu1', assigned_date: '2026-07-07' }];
    expect(findDueScheduledFollowUp(scheduled, '2026-07-06')).toBeNull();
  });

  it('should return null when nothing is scheduled (daily prompt proceeds)', () => {
    expect(findDueScheduledFollowUp([], '2026-07-06')).toBeNull();
  });
});

// ============================================
// Next-Day Scheduling Dates
// ============================================

describe('scheduling dates', () => {
  it('should compute the next day in the couple timezone', () => {
    // 2026-07-05T10:00Z is 03:00 in LA on July 5 -> next day is July 6
    const now = new Date('2026-07-05T10:00:00Z');
    expect(nextDayInTimezone('America/Los_Angeles', now)).toBe('2026-07-06');
  });

  it('should roll the date forward for timezones ahead of UTC', () => {
    // 2026-07-05T20:00Z is already July 6 in Tokyo -> next day is July 7
    const now = new Date('2026-07-05T20:00:00Z');
    expect(nextDayInTimezone('Asia/Tokyo', now)).toBe('2026-07-07');
    expect(todayInTimezone('Asia/Tokyo', now)).toBe('2026-07-06');
  });

  it('should fall back to a default timezone when missing', () => {
    const now = new Date('2026-07-05T10:00:00Z');
    expect(nextDayInTimezone('', now)).toBe('2026-07-06');
  });
});

// ============================================
// End-to-End Branch Scenarios (spec examples)
// ============================================

describe('follow-up spec scenarios', () => {
  it('divergence: 2 vs 8 -> one follow-up, next day (not immediate)', () => {
    const branch = evaluateFollowUpBranch(2, 8);
    expect(branch).toBe('divergence');
    // divergence is never delivered immediately
    expect(branch === 'deepener').toBe(false);
  });

  it('repair: 3 vs 5 -> step 1 next day', () => {
    expect(evaluateFollowUpBranch(3, 5)).toBe('repair');
  });

  it('deepener: 9 vs 10 -> immediate (same session, shown at reveal)', () => {
    const branch = evaluateFollowUpBranch(9, 10);
    expect(branch).toBe('deepener');
    expect(branch === 'deepener').toBe(true);
  });

  it('nothing: 5 vs 7 -> no follow-up', () => {
    expect(evaluateFollowUpBranch(5, 7)).toBeNull();
  });

  it('follow-up completion with scores must not re-trigger', () => {
    const followUpAssignment = { assignment_kind: 'follow_up', response_format: 'text' };
    expect(canScoreTriggerFollowUp(followUpAssignment)).toBe(false);
  });

  it('repair step-1 completion chains step 2; step-2 completion ends the chain', () => {
    const stepOne = { assignment_kind: 'follow_up', follow_up: { branch: 'repair', step: 1 } };
    const stepTwo = { assignment_kind: 'follow_up', follow_up: { branch: 'repair', step: 2 } };
    expect(isRepairStepOne(stepOne)).toBe(true);
    expect(isRepairStepOne(stepTwo)).toBe(false);
    expect(canScoreTriggerFollowUp(stepOne)).toBe(false);
  });
});

afterAll(() => {
  test.cleanup();
});
