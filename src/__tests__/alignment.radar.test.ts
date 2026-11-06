import {
  deriveRadarData,
  type AlignmentInput,
  type RadarCategoryPoint,
} from '../utils/alignment';

const USER_A = 'user-a';
const USER_B = 'user-b';
const CATEGORIES = [
  'communication',
  'intimacy',
  'affection',
  'money',
  'family',
  'friends',
  'fun_play',
  'future_dreams',
  'everyday_life',
  'conflict_repair',
  'appreciation_trust',
  'growth_independence',
];

function makeCompletion(
  category: string,
  scoreA: number,
  scoreB: number,
  daysAgo: number = 0
): AlignmentInput {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    category,
    completedAt: date,
    responses: [
      { userId: USER_A, responseScore: scoreA },
      { userId: USER_B, responseScore: scoreB },
    ],
  };
}

describe('deriveRadarData', () => {
  it('returns empty array for empty completions', () => {
    const result = deriveRadarData([], USER_A, CATEGORIES);
    expect(result).toEqual([]);
  });

  it('returns one point per category with data', () => {
    const completions = [
      makeCompletion('communication', 8, 6),
      makeCompletion('intimacy', 7, 9),
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('communication');
    expect(result[1].category).toBe('intimacy');
  });

  it('preserves category order from the provided array', () => {
    const completions = [
      makeCompletion('money', 5, 6),
      makeCompletion('communication', 8, 7),
      makeCompletion('family', 9, 8),
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    const cats = result.map((r) => r.category);
    // communication comes before money comes before family in CATEGORIES
    expect(cats).toEqual(['communication', 'money', 'family']);
  });

  it('calculates per-partner averages correctly', () => {
    const completions = [
      makeCompletion('communication', 8, 6),
      makeCompletion('communication', 6, 4),
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(1);
    expect(result[0].myAvg).toBe(7); // (8+6)/2
    expect(result[0].partnerAvg).toBe(5); // (6+4)/2
    expect(result[0].count).toBe(2);
  });

  it('excludes completions outside the 90-day window', () => {
    const completions = [
      makeCompletion('communication', 8, 6, 10), // within window
      makeCompletion('communication', 2, 2, 100), // outside window
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result[0].myAvg).toBe(8); // only the recent one counts
    expect(result[0].partnerAvg).toBe(6);
    expect(result[0].count).toBe(1);
  });

  it('skips entries with only one score', () => {
    const completions: AlignmentInput[] = [
      {
        category: 'communication',
        completedAt: new Date(),
        responses: [{ userId: USER_A, responseScore: 8 }],
      },
      makeCompletion('communication', 7, 5),
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result[0].count).toBe(1);
    expect(result[0].myAvg).toBe(7);
  });

  it('skips entries with null scores', () => {
    const completions: AlignmentInput[] = [
      {
        category: 'communication',
        completedAt: new Date(),
        responses: [
          { userId: USER_A, responseScore: null },
          { userId: USER_B, responseScore: null },
        ],
      },
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(0);
  });

  it('skips entries with no completedAt', () => {
    const completions: AlignmentInput[] = [
      {
        category: 'communication',
        completedAt: null,
        responses: [
          { userId: USER_A, responseScore: 8 },
          { userId: USER_B, responseScore: 6 },
        ],
      },
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(0);
  });

  it('skips categories not in the provided order array', () => {
    const completions = [
      makeCompletion('unknown_category', 8, 6),
      makeCompletion('communication', 7, 5),
    ];
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('communication');
  });

  it('handles all 12 categories', () => {
    const completions = CATEGORIES.map((cat, i) =>
      makeCompletion(cat, 5 + (i % 5), 4 + (i % 6))
    );
    const result = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(result).toHaveLength(12);
    result.forEach((r) => {
      expect(r.myAvg).toBeGreaterThanOrEqual(1);
      expect(r.myAvg).toBeLessThanOrEqual(10);
      expect(r.partnerAvg).toBeGreaterThanOrEqual(1);
      expect(r.partnerAvg).toBeLessThanOrEqual(10);
      expect(r.count).toBe(1);
    });
  });

  it('correctly identifies my scores vs partner scores', () => {
    const completions = [
      makeCompletion('communication', 10, 1),
    ];
    // When USER_A is "me", myAvg=10, partnerAvg=1
    const asA = deriveRadarData(completions, USER_A, CATEGORIES);
    expect(asA[0].myAvg).toBe(10);
    expect(asA[0].partnerAvg).toBe(1);

    // When USER_B is "me", myAvg=1, partnerAvg=10
    const asB = deriveRadarData(completions, USER_B, CATEGORIES);
    expect(asB[0].myAvg).toBe(1);
    expect(asB[0].partnerAvg).toBe(10);
  });
});
