import { pickSmallMove } from '../utils/smallMoves';

describe('pickSmallMove', () => {
  it('returns null when no love language is set', () => {
    expect(pickSmallMove(null, 'communication')).toBeNull();
  });

  it('returns null for an unknown love language', () => {
    expect(pickSmallMove('telepathy', 'communication')).toBeNull();
  });

  it('returns a move for words_of_affirmation + communication', () => {
    const move = pickSmallMove('words_of_affirmation', 'communication');
    expect(move).not.toBeNull();
    expect(move!.text.length).toBeGreaterThan(0);
    expect(move!.kind).toBe('say');
  });

  it('returns a move for quality_time + everyday_life', () => {
    const move = pickSmallMove('quality_time', 'everyday_life');
    expect(move).not.toBeNull();
    expect(move!.kind).toBe('do');
  });

  it('returns a move for physical_touch + affection', () => {
    const move = pickSmallMove('physical_touch', 'affection');
    expect(move).not.toBeNull();
    expect(move!.kind).toBe('notice');
  });

  it('falls back to _default when category has no specific move', () => {
    // receiving_gifts has no specific communication entry
    const move = pickSmallMove('receiving_gifts', 'communication');
    expect(move).not.toBeNull();
    expect(move!.text.length).toBeGreaterThan(0);
  });

  it('falls back to _default for null category', () => {
    const move = pickSmallMove('words_of_affirmation', null);
    expect(move).not.toBeNull();
  });

  it('falls back to _default for unknown category', () => {
    const move = pickSmallMove('acts_of_service', 'unknown_category');
    expect(move).not.toBeNull();
  });

  it('is deterministic for the same inputs', () => {
    const a = pickSmallMove('quality_time', 'intimacy', 5);
    const b = pickSmallMove('quality_time', 'intimacy', 5);
    expect(a).toEqual(b);
  });

  it('covers all five love languages with a default move', () => {
    const languages = [
      'words_of_affirmation',
      'quality_time',
      'receiving_gifts',
      'acts_of_service',
      'physical_touch',
    ];
    for (const lang of languages) {
      const move = pickSmallMove(lang, null);
      expect(move).not.toBeNull();
      expect(move!.text.length).toBeGreaterThan(10);
    }
  });

  it('covers all 12 v1 categories for words_of_affirmation', () => {
    const categories = [
      'communication', 'intimacy', 'affection', 'money', 'family',
      'friends', 'fun_play', 'future_dreams', 'everyday_life',
      'conflict_repair', 'appreciation_trust', 'growth_independence',
    ];
    for (const cat of categories) {
      const move = pickSmallMove('words_of_affirmation', cat);
      expect(move).not.toBeNull();
    }
  });
});
