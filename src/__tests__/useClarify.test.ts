jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', coupleId: 'couple-1' } }),
}));
jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

import { mapClarify, splitClarify } from '../hooks/useClarify';

const ts = { toDate: () => new Date('2026-08-01T12:00:00Z') };

describe('mapClarify (read boundary)', () => {
  it('maps entries keyed by asker', () => {
    const [entry] = mapClarify({
      'user-2': { question: 'Why calmer?', asked_at: ts, answer: null, answered_at: null },
    });
    expect(entry.askerId).toBe('user-2');
    expect(entry.question).toBe('Why calmer?');
    expect(entry.askedAt).toBeInstanceOf(Date);
    expect(entry.answer).toBeNull();
  });

  it('drops malformed entries and tolerates missing field', () => {
    expect(mapClarify(undefined)).toEqual([]);
    expect(mapClarify(null)).toEqual([]);
    expect(mapClarify({ 'user-2': { question: 7 } })).toEqual([]);
    expect(mapClarify({ 'user-2': 'nonsense' })).toEqual([]);
  });

  it('empty answer strings read as unanswered', () => {
    const [entry] = mapClarify({
      'user-2': { question: 'Q', asked_at: ts, answer: '', answered_at: null },
    });
    expect(entry.answer).toBeNull();
  });
});

describe('splitClarify', () => {
  const mine = { askerId: 'user-1', question: 'mine', askedAt: null, askedAtRaw: null, answer: null, answeredAt: null };
  const theirsOpen = { askerId: 'user-2', question: 'theirs', askedAt: null, askedAtRaw: null, answer: null, answeredAt: null };
  const theirsAnswered = { ...theirsOpen, answer: 'done' };

  it('splits my exchange from the one pending on me', () => {
    expect(splitClarify([mine, theirsOpen], 'user-1')).toEqual({
      mine,
      pendingForMe: theirsOpen,
    });
  });

  it('an answered partner exchange is not pending', () => {
    expect(splitClarify([theirsAnswered], 'user-1').pendingForMe).toBeNull();
  });

  it('empty exchanges split to nulls', () => {
    expect(splitClarify([], 'user-1')).toEqual({ mine: null, pendingForMe: null });
  });
});
