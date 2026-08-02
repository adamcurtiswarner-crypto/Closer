jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  documentId: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', coupleId: 'couple-1' },
  }),
}));

import { chunk, mapYourWordsEntry } from '../hooks/useYourWords';

function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

describe('useYourWords helpers', () => {
  describe('mapYourWordsEntry', () => {
    it('joins the response to its assignment for prompt text and category', () => {
      const entry = mapYourWordsEntry(
        'r1',
        {
          assignment_id: 'a1',
          response_text: 'My honest answer',
          response_score: 7,
          submitted_at: ts('2026-07-30T14:00:00Z'),
        },
        { prompt_text: 'How seen do you feel?', category: 'intimacy' }
      );
      expect(entry).toEqual({
        id: 'r1',
        assignmentId: 'a1',
        promptText: 'How seen do you feel?',
        category: 'intimacy',
        responseText: 'My honest answer',
        responseScore: 7,
        submittedAt: new Date('2026-07-30T14:00:00Z'),
      });
    });

    it('tolerates a missing assignment — the answer still shows', () => {
      const entry = mapYourWordsEntry(
        'r2',
        {
          assignment_id: 'gone',
          response_text: 'Still my words',
          submitted_at: ts('2026-07-01T00:00:00Z'),
        },
        undefined
      );
      expect(entry.promptText).toBe('');
      expect(entry.category).toBeNull();
      expect(entry.responseText).toBe('Still my words');
    });

    it('tolerates an empty response doc', () => {
      const entry = mapYourWordsEntry('r3', {}, undefined);
      expect(entry.assignmentId).toBe('');
      expect(entry.responseText).toBe('');
      expect(entry.responseScore).toBeNull();
      expect(entry.submittedAt).toBeNull();
    });
  });

  describe('chunk (Firestore in-query limit)', () => {
    it('splits into chunks of the given size', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('a list under the limit is a single chunk', () => {
      expect(chunk(['a'], 30)).toEqual([['a']]);
    });

    it('an empty list produces no chunks (no empty in-query)', () => {
      expect(chunk([], 30)).toEqual([]);
    });
  });
});
