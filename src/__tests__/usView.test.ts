/**
 * Tests for the Us view derivation.
 *
 * Written against the founders' own shape of data (14 answers spread thin
 * across 12 categories, nothing more than ~1.5 apart), because that is the
 * case the November tile grid handled worst: it printed 5.9 vs 7.4 to one
 * decimal from one or two completions and graded each category green.
 */
import { deriveUsView, US_LEAD_MIN_GAP } from '@/utils/usView';
import type { CategoryAlignment, RadarCategoryPoint } from '@/utils/alignment';

function alignment(
  category: string,
  overrides: Partial<CategoryAlignment> = {}
): CategoryAlignment {
  return {
    category,
    count: 4,
    avgGap: 1,
    avgLevel: 7,
    state: 'close_strong',
    movement: 'steady',
    movementDelta: 0,
    gapSeries: [],
    ...overrides,
  };
}

function radar(category: string, myAvg: number, partnerAvg: number): RadarCategoryPoint {
  return { category, myAvg, partnerAvg, count: 4 };
}

describe('deriveUsView', () => {
  it('leads with the widest gap and sorts the rest behind it', () => {
    const view = deriveUsView(
      [alignment('communication'), alignment('intimacy'), alignment('affection')],
      [
        radar('communication', 5.9, 7.4), // 1.5
        radar('intimacy', 7.7, 7.0), // 0.7
        radar('affection', 7.3, 7.0), // 0.3
      ]
    );

    expect(view.lead?.category).toBe('communication');
    expect(view.lead?.gap).toBeCloseTo(1.5);
    expect(view.rows.map((r) => r.category)).toEqual([
      'communication',
      'intimacy',
      'affection',
    ]);
  });

  it('moves categories without enough answers into still forming', () => {
    const view = deriveUsView(
      [
        alignment('communication'),
        alignment('money', { state: 'early', count: 1 }),
        alignment('family', { state: 'early', count: 2 }),
      ],
      [radar('communication', 5.9, 7.4), radar('money', 8, 8), radar('family', 6, 6)]
    );

    expect(view.rows.map((r) => r.category)).toEqual(['communication']);
    // Most answers first, so the nearest-to-ready is on top.
    expect(view.stillForming.map((s) => s.category)).toEqual(['family', 'money']);
    expect(view.stillForming[0]).toMatchObject({ count: 2, needed: 3 });
  });

  it('treats a missing radar point as still forming rather than guessing', () => {
    const view = deriveUsView([alignment('communication')], []);

    expect(view.rows).toHaveLength(0);
    expect(view.stillForming.map((s) => s.category)).toEqual(['communication']);
  });

  it('leads with nothing when every category is effectively level', () => {
    const view = deriveUsView(
      [alignment('everyday_life'), alignment('conflict_repair')],
      [radar('everyday_life', 6.6, 6.6), radar('conflict_repair', 7.1, 7.3)]
    );

    expect(view.lead).toBeNull();
    expect(view.closeCount).toBe(2);
  });

  it('still leads when a couple is close everywhere but one gap stands out', () => {
    // The founders' real case: nothing is "apart" by the 2.5 threshold, and
    // a screen that led with nothing would be useless to them.
    const view = deriveUsView(
      [alignment('communication'), alignment('affection')],
      [radar('communication', 5.9, 7.4), radar('affection', 7.3, 7.0)]
    );

    expect(view.lead?.category).toBe('communication');
    expect(view.lead!.gap).toBeGreaterThan(US_LEAD_MIN_GAP);
  });

  it('surfaces movement from a different category than the lead', () => {
    const view = deriveUsView(
      [
        alignment('communication', { movement: 'opening' }),
        alignment('appreciation_trust', { movement: 'closing' }),
      ],
      [radar('communication', 5.9, 7.4), radar('appreciation_trust', 9.1, 8.0)]
    );

    expect(view.lead?.category).toBe('communication');
    // Never the same category twice — that would say one thing in two cards.
    expect(view.movement?.category).toBe('appreciation_trust');
    expect(view.movement?.movement).toBe('closing');
  });

  it('reports no movement when nothing is closing or opening', () => {
    const view = deriveUsView(
      [alignment('communication', { movement: 'steady' }), alignment('intimacy', { movement: null })],
      [radar('communication', 5.9, 7.4), radar('intimacy', 7.7, 7.0)]
    );

    expect(view.movement).toBeNull();
  });

  it('handles an empty relationship history without throwing', () => {
    const view = deriveUsView([], []);

    expect(view).toEqual({
      lead: null,
      movement: null,
      rows: [],
      stillForming: [],
      closeCount: 0,
    });
  });

  it('breaks a gap tie by how much data stands behind each row', () => {
    const view = deriveUsView(
      [alignment('a', { count: 2 }), alignment('b', { count: 9 })],
      [radar('a', 6, 8), radar('b', 6, 8)]
    );

    expect(view.rows[0].category).toBe('b');
  });
});
