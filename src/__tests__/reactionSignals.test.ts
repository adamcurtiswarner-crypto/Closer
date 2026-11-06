import { deriveReactionSignals } from '../utils/reactionSignals';

// Minimal shape matching HearthCompletion without importing Firebase
function makeCompletion(
  category: string,
  reactions: Record<string, string> = {}
): any {
  return {
    id: `test-${Math.random()}`,
    category,
    promptText: 'test',
    isScale: true,
    responses: [],
    reactions,
    signal: 'steady',
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    clarify: [],
    completedAt: new Date(),
  };
}

describe('deriveReactionSignals', () => {
  it('returns empty signals for empty completions', () => {
    const result = deriveReactionSignals([]);
    expect(result.categories).toEqual([]);
    expect(result.overallDominant).toBeNull();
    expect(result.overallReactionRate).toBe(0);
    expect(result.outliers).toEqual([]);
  });

  it('counts curated reactions correctly', () => {
    const completions = [
      makeCompletion('communication', { u1: 'heart', u2: 'fire' }),
      makeCompletion('communication', { u1: 'heart' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.categories).toHaveLength(1);
    const comm = result.categories[0];
    expect(comm.curated.heart).toBe(2);
    expect(comm.curated.fire).toBe(1);
    expect(comm.dominant).toBe('heart');
    expect(comm.total).toBe(3);
  });

  it('tracks custom emoji separately', () => {
    const completions = [
      makeCompletion('intimacy', { u1: '🙃', u2: 'heart' }),
    ];
    const result = deriveReactionSignals(completions);
    const cat = result.categories[0];
    expect(cat.customCount).toBe(1);
    expect(cat.curated.heart).toBe(1);
    expect(cat.total).toBe(2);
  });

  it('calculates reaction rate correctly', () => {
    const completions = [
      makeCompletion('money', { u1: 'teary' }),
      makeCompletion('money', {}),
      makeCompletion('money', { u1: 'heart', u2: 'teary' }),
    ];
    const result = deriveReactionSignals(completions);
    const cat = result.categories[0];
    expect(cat.reactionRate).toBeCloseTo(2 / 3);
    expect(cat.completionCount).toBe(3);
  });

  it('identifies the overall dominant reaction', () => {
    const completions = [
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('intimacy', { u1: 'heart' }),
      makeCompletion('money', { u1: 'teary' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.overallDominant).toBe('heart');
  });

  it('identifies outlier categories where dominant differs from overall', () => {
    const completions = [
      // Heart dominates overall
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('intimacy', { u1: 'heart' }),
      makeCompletion('intimacy', { u1: 'heart' }),
      makeCompletion('intimacy', { u1: 'heart' }),
      // But teary dominates in money (outlier)
      makeCompletion('money', { u1: 'teary' }),
      makeCompletion('money', { u1: 'teary' }),
      makeCompletion('money', { u1: 'teary' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.overallDominant).toBe('heart');
    expect(result.outliers).toHaveLength(1);
    expect(result.outliers[0].category).toBe('money');
    expect(result.outliers[0].dominant).toBe('teary');
  });

  it('requires minimum 3 reactions to be an outlier', () => {
    const completions = [
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('communication', { u1: 'heart' }),
      // Only 2 teary in money — below threshold
      makeCompletion('money', { u1: 'teary' }),
      makeCompletion('money', { u1: 'teary' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.outliers).toHaveLength(0);
  });

  it('sorts categories by total reaction count descending', () => {
    const completions = [
      makeCompletion('money', { u1: 'teary' }),
      makeCompletion('communication', { u1: 'heart', u2: 'fire' }),
      makeCompletion('communication', { u1: 'heart' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.categories[0].category).toBe('communication');
    expect(result.categories[1].category).toBe('money');
  });

  it('calculates overall reaction rate', () => {
    const completions = [
      makeCompletion('communication', { u1: 'heart' }),
      makeCompletion('communication', {}),
      makeCompletion('money', {}),
      makeCompletion('money', { u1: 'teary' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.overallReactionRate).toBe(0.5);
  });

  it('skips completions with no category', () => {
    const completions = [
      makeCompletion('', { u1: 'heart' }),
      makeCompletion('communication', { u1: 'fire' }),
    ];
    const result = deriveReactionSignals(completions);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].category).toBe('communication');
  });
});
