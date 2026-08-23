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

  describe('denormalized prompt text (2026-08-23)', () => {
    /*
     * The join that supplied prompt text was a `documentId() in` query, which
     * Firestore denies outright if ANY id in the list has no document or
     * belongs to another couple — and it caps out around 20 ids while the
     * client chunked at 30. Both founders had 74 assignment ids spanning a
     * dissolved couple, so the join failed every time and the journal showed
     * answers with no questions. The response now carries its own copy.
     */
    it('prefers the copy stored on the response itself', () => {
      const entry = mapYourWordsEntry(
        'resp-1',
        {
          assignment_id: 'asg-1',
          prompt_text: 'What made you laugh today?',
          category: 'play',
          response_text: 'the dog',
        },
        undefined
      );

      expect(entry.promptText).toBe('What made you laugh today?');
      expect(entry.category).toBe('play');
    });

    it('falls back to the assignment for answers written before the change', () => {
      const entry = mapYourWordsEntry(
        'resp-1',
        { assignment_id: 'asg-1', response_text: 'the dog' },
        { prompt_text: 'What made you laugh today?', category: 'play' }
      );

      expect(entry.promptText).toBe('What made you laugh today?');
      expect(entry.category).toBe('play');
    });

    it('degrades to date + answer when neither is available', () => {
      // An ex-couple's assignment is unreadable by design. The words survive.
      const entry = mapYourWordsEntry(
        'resp-1',
        { assignment_id: 'asg-1', response_text: 'the dog' },
        undefined
      );

      expect(entry.promptText).toBe('');
      expect(entry.responseText).toBe('the dog');
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
