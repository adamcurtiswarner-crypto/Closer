import {
  ALIGNMENT_APART_GAP,
  ALIGNMENT_MIN_HALF,
  ALIGNMENT_MIN_SCORED,
  deriveAlignment,
  movementPicks,
  type AlignmentInput,
} from '@/utils/alignment';

const NOW = new Date('2026-07-20T12:00:00Z');

function completion(
  category: string,
  daysAgo: number,
  scoreA: number | null,
  scoreB: number | null
): AlignmentInput {
  return {
    category,
    completedAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    responses: [{ responseScore: scoreA }, { responseScore: scoreB }],
  };
}

describe('deriveAlignment', () => {
  it('computes avg gap and level from two-score completions', () => {
    const [result] = deriveAlignment(
      [
        completion('intimacy', 1, 8, 6), // gap 2, level 7
        completion('intimacy', 2, 9, 9), // gap 0, level 9
        completion('intimacy', 3, 7, 5), // gap 2, level 6
      ],
      NOW
    );
    expect(result.category).toBe('intimacy');
    expect(result.count).toBe(3);
    expect(result.avgGap).toBeCloseTo(4 / 3);
    expect(result.avgLevel).toBeCloseTo(22 / 3);
  });

  it('skips text completions, single-score entries, and undated entries', () => {
    const results = deriveAlignment(
      [
        completion('money', 1, null, null), // text follow-up — no scores
        completion('money', 2, 5, null), // partner has not scored
        { ...completion('money', 3, 5, 5), completedAt: null },
      ],
      NOW
    );
    expect(results).toHaveLength(0);
  });

  it('ignores completions older than the 90-day window', () => {
    const results = deriveAlignment(
      [completion('fun', 91, 2, 9), completion('fun', 5, 8, 8)],
      NOW
    );
    expect(results[0].count).toBe(1);
    expect(results[0].avgGap).toBe(0);
  });

  it('marks categories below the scored threshold as early', () => {
    const results = deriveAlignment(
      Array.from({ length: ALIGNMENT_MIN_SCORED - 1 }, (_, i) =>
        completion('family', i + 1, 8, 8)
      ),
      NOW
    );
    expect(results[0].state).toBe('early');
  });

  it('classifies the gap × level quadrant', () => {
    const apart = deriveAlignment(
      [
        completion('money', 1, 2, 9),
        completion('money', 2, 3, 8),
        completion('money', 3, 2, 8),
      ],
      NOW
    );
    expect(apart[0].avgGap).toBeGreaterThanOrEqual(ALIGNMENT_APART_GAP);
    expect(apart[0].state).toBe('apart');

    const strong = deriveAlignment(
      [
        completion('affection', 1, 8, 9),
        completion('affection', 2, 9, 9),
        completion('affection', 3, 8, 8),
      ],
      NOW
    );
    expect(strong[0].state).toBe('close_strong');

    const tender = deriveAlignment(
      [
        completion('conflict_repair', 1, 4, 5),
        completion('conflict_repair', 2, 5, 5),
        completion('conflict_repair', 3, 4, 4),
      ],
      NOW
    );
    expect(tender[0].state).toBe('close_tender');
  });

  it('withholds movement until both halves reach the threshold', () => {
    // 5 points → halves of 2 and 3: below ALIGNMENT_MIN_HALF on one side.
    const results = deriveAlignment(
      Array.from({ length: ALIGNMENT_MIN_HALF * 2 - 1 }, (_, i) =>
        completion('future_dreams', i + 1, 8, 4)
      ),
      NOW
    );
    expect(results[0].movement).toBeNull();
  });

  it('reads a narrowing gap as closing (positive delta)', () => {
    const results = deriveAlignment(
      [
        // Older half: gap 4 each. Newer half: gap 0 each.
        completion('communication', 30, 8, 4),
        completion('communication', 25, 8, 4),
        completion('communication', 20, 8, 4),
        completion('communication', 10, 7, 7),
        completion('communication', 5, 8, 8),
        completion('communication', 1, 6, 6),
      ],
      NOW
    );
    expect(results[0].movement).toBe('closing');
    expect(results[0].movementDelta).toBeCloseTo(4);
  });

  it('reads a widening gap as opening and a small change as steady', () => {
    const opening = deriveAlignment(
      [
        completion('everyday_life', 30, 7, 7),
        completion('everyday_life', 25, 8, 8),
        completion('everyday_life', 20, 6, 6),
        completion('everyday_life', 10, 8, 4),
        completion('everyday_life', 5, 9, 5),
        completion('everyday_life', 1, 8, 4),
      ],
      NOW
    );
    expect(opening[0].movement).toBe('opening');

    const steady = deriveAlignment(
      Array.from({ length: 6 }, (_, i) =>
        completion('friends', 30 - i * 5, 7, 6)
      ),
      NOW
    );
    expect(steady[0].movement).toBe('steady');
  });

  it('orders by attention: apart, tender, strong, early', () => {
    const results = deriveAlignment(
      [
        ...[1, 2, 3].map((d) => completion('affection', d, 9, 9)), // strong
        ...[1, 2, 3].map((d) => completion('money', d, 2, 9)), // apart
        ...[1, 2, 3].map((d) => completion('family', d, 5, 5)), // tender
        completion('fun', 1, 8, 8), // early
      ],
      NOW
    );
    expect(results.map((r) => r.state)).toEqual([
      'apart',
      'close_tender',
      'close_strong',
      'early',
    ]);
  });

  it('builds a chronological gap series', () => {
    const [result] = deriveAlignment(
      [
        completion('intimacy', 1, 9, 9),
        completion('intimacy', 10, 3, 8),
        completion('intimacy', 5, 6, 8),
      ],
      NOW
    );
    expect(result.gapSeries.map((p) => p.value)).toEqual([5, 2, 0]);
    const times = result.gapSeries.map((p) => p.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('movementPicks', () => {
  it('returns only moving categories, biggest change first, capped', () => {
    const base = {
      count: 6,
      avgGap: 2,
      avgLevel: 6,
      state: 'close_tender' as const,
      gapSeries: [],
    };
    const picks = movementPicks(
      [
        { ...base, category: 'a', movement: 'steady', movementDelta: 0.2 },
        { ...base, category: 'b', movement: 'closing', movementDelta: 1.2 },
        { ...base, category: 'c', movement: 'opening', movementDelta: -3 },
        { ...base, category: 'd', movement: null, movementDelta: 0 },
        { ...base, category: 'e', movement: 'closing', movementDelta: 2 },
      ],
      2
    );
    expect(picks.map((p) => p.category)).toEqual(['c', 'e']);
  });
});
