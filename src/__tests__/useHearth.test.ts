jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', coupleId: 'couple-1', partnerName: 'Sam' },
  }),
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  categoryEntries,
  categoryTileState,
  couchQueue,
  mapCompletion,
  monthlyStats,
  needsCouch,
  perCategoryTileState,
  scoresFor,
  tileTally,
  trendSeries,
  useHearth,
  useMarkDiscussed,
  type HearthCompletion,
} from '../hooks/useHearth';
import { computeSignal } from '@/utils/hearthSignal';
import { logEvent } from '@/services/analytics';

const NOW = new Date('2026-07-07T12:00:00Z');

function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

function makeCompletion(overrides: Partial<HearthCompletion> = {}): HearthCompletion {
  return {
    id: 'c1',
    category: 'money',
    promptText: 'How fair does the money feel right now?',
    isScale: true,
    responses: [
      {
        userId: 'user-1',
        responseText: 'Mine',
        responseScore: 3,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
      {
        userId: 'user-2',
        responseText: 'Theirs',
        responseScore: 8,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
    ],
    reactions: {},
    signal: 'divergence',
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    completedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

function createClientAndWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useHearth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapCompletion (read boundary)', () => {
    it('maps snake_case fields and keeps the server signal', () => {
      const mapped = mapCompletion('abc', {
        category: 'intimacy',
        prompt_text: 'A question',
        is_scale: true,
        responses: [
          {
            user_id: 'user-1',
            response_text: 'hello',
            response_score: 9,
            image_url: null,
            submitted_at: ts('2026-07-01T00:00:00Z'),
          },
          {
            user_id: 'user-2',
            response_text: 'world',
            response_score: 9,
            image_url: 'https://img',
            submitted_at: ts('2026-07-01T00:00:00Z'),
          },
        ],
        signal: 'deepener',
        discussed: { 'user-1': ts('2026-07-02T00:00:00Z') },
        discussed_at: null,
        completed_at: ts('2026-07-01T00:00:00Z'),
      });

      expect(mapped.id).toBe('abc');
      expect(mapped.category).toBe('intimacy');
      expect(mapped.promptText).toBe('A question');
      expect(mapped.isScale).toBe(true);
      expect(mapped.signal).toBe('deepener');
      expect(mapped.responses[1].imageUrl).toBe('https://img');
      expect(mapped.discussed['user-1']).toBeInstanceOf(Date);
      expect(mapped.discussedAt).toBeNull();
      expect(mapped.completedAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    });

    it('computes the fallback signal when the field is missing but scores exist', () => {
      const mapped = mapCompletion('abc', {
        category: 'money',
        prompt_text: 'Q',
        is_scale: true,
        responses: [
          { user_id: 'a', response_text: '', response_score: 2 },
          { user_id: 'b', response_text: '', response_score: 8 },
        ],
        completed_at: ts('2026-07-01T00:00:00Z'),
      });
      expect(mapped.signal).toBe('divergence');
    });

    it('tolerates old/text completions with no scores, no signal, no discussed', () => {
      const mapped = mapCompletion('old', {
        prompt_text: 'Legacy text prompt',
        responses: [{ user_id: 'a', response_text: 'just words' }],
      });
      expect(mapped.signal).toBeNull();
      expect(mapped.isScale).toBe(false);
      expect(mapped.discussed).toEqual({});
      expect(mapped.discussedAt).toBeNull();
      expect(mapped.couchFlagged).toBe(false);
      expect(mapped.couchFlaggedBy).toBeNull();
      expect(mapped.completedAt).toBeNull();
      expect(mapped.responses[0].responseScore).toBeNull();
    });

    it('maps reactions at the read boundary, dropping null (un-reacted) values', () => {
      const mapped = mapCompletion('abc', {
        category: 'money',
        prompt_text: 'Q',
        reactions: { 'user-1': 'heart', 'user-2': null },
      });
      expect(mapped.reactions).toEqual({ 'user-1': 'heart' });
    });

    it('tolerates docs with no reactions field', () => {
      const mapped = mapCompletion('abc', { category: 'money', prompt_text: 'Q' });
      expect(mapped.reactions).toEqual({});
    });

    it('maps the couch flag fields at the read boundary', () => {
      const mapped = mapCompletion('flagged', {
        category: 'money',
        prompt_text: 'Q',
        couch_flagged: true,
        couch_flagged_by: 'user-2',
      });
      expect(mapped.couchFlagged).toBe(true);
      expect(mapped.couchFlaggedBy).toBe('user-2');
    });

    it('tolerates a completely empty doc', () => {
      const mapped = mapCompletion('empty', {});
      expect(mapped.category).toBe('');
      expect(mapped.responses).toEqual([]);
      expect(mapped.signal).toBeNull();
    });
  });

  describe('couchQueue', () => {
    it('keeps only un-tended repair and divergence entries', () => {
      const list = [
        makeCompletion({ id: 'r1', signal: 'repair' }),
        makeCompletion({ id: 'd1', signal: 'divergence' }),
        makeCompletion({
          id: 'r2',
          signal: 'repair',
          discussedAt: new Date('2026-07-02'),
        }),
        makeCompletion({ id: 's1', signal: 'steady' }),
        makeCompletion({ id: 'g1', signal: 'deepener' }),
        makeCompletion({ id: 'n1', signal: null }),
      ];
      expect(couchQueue(list).map((c) => c.id)).toEqual(['r1', 'd1']);
    });

    it('a one-sided discussed mark does not remove the entry from the queue', () => {
      const list = [
        makeCompletion({
          id: 'r1',
          signal: 'repair',
          discussed: { 'user-1': new Date('2026-07-02') },
          discussedAt: null,
        }),
      ];
      expect(couchQueue(list)).toHaveLength(1);
    });

    it('includes couch-flagged entries regardless of signal (steady stays gray, still queues)', () => {
      const list = [
        makeCompletion({ id: 's1', signal: 'steady', couchFlagged: true }),
        makeCompletion({ id: 'n1', signal: null, couchFlagged: true }),
        makeCompletion({ id: 'g1', signal: 'deepener', couchFlagged: true }),
        makeCompletion({ id: 's2', signal: 'steady', couchFlagged: false }),
      ];
      expect(couchQueue(list).map((c) => c.id)).toEqual(['s1', 'n1', 'g1']);
    });

    it('the mutual "we talked" ritual retires flagged entries too', () => {
      const list = [
        makeCompletion({
          id: 's1',
          signal: 'steady',
          couchFlagged: true,
          discussedAt: new Date('2026-07-02'),
        }),
      ];
      expect(couchQueue(list)).toHaveLength(0);
    });

    it('a flagged entry with only one "we talked" mark stays in the queue', () => {
      const list = [
        makeCompletion({
          id: 's1',
          signal: 'steady',
          couchFlagged: true,
          discussed: { 'user-1': new Date('2026-07-02') },
          discussedAt: null,
        }),
      ];
      expect(couchQueue(list)).toHaveLength(1);
    });
  });

  describe('categoryTileState precedence (accumulated tile state)', () => {
    // A scored completion the way production produces it: signal computed
    // from the two scores with the same thresholds the backend uses.
    function scoredEntry(
      id: string,
      scoreA: number,
      scoreB: number,
      completedAt: string,
      overrides: Partial<HearthCompletion> = {}
    ): HearthCompletion {
      return makeCompletion({
        id,
        signal: computeSignal(scoreA, scoreB),
        responses: [
          {
            userId: 'user-1',
            responseText: '',
            responseScore: scoreA,
            imageUrl: null,
            submittedAt: null,
          },
          {
            userId: 'user-2',
            responseText: '',
            responseScore: scoreB,
            imageUrl: null,
            submittedAt: null,
          },
        ],
        completedAt: new Date(completedAt),
        ...overrides,
      });
    }

    it('zero completions is unlit, not steady', () => {
      expect(categoryTileState([], NOW)).toBe('unlit');
    });

    it("the founder's case: a single 8/8 day lights the tile glowing", () => {
      const entries = [scoredEntry('one', 8, 8, '2026-07-06T00:00:00Z')];
      expect(entries[0].signal).toBe('steady'); // not a deepener — still glows
      expect(categoryTileState(entries, NOW)).toBe('glowing');
    });

    it('the contradiction case: a couch-flagged steady entry says talk on BOTH the tile and the queue', () => {
      const flagged = scoredEntry('f1', 6, 6, '2026-07-05T00:00:00Z', {
        couchFlagged: true,
        couchFlaggedBy: 'user-2',
      });
      expect(flagged.signal).toBe('steady');
      // Same predicate drives both surfaces — they can never disagree.
      expect(needsCouch(flagged)).toBe(true);
      expect(couchQueue([flagged]).map((c) => c.id)).toEqual(['f1']);
      expect(categoryTileState([flagged], NOW)).toBe('talk');
    });

    it('an un-tended repair entry is talk, and outranks everything below it', () => {
      const entries = [
        scoredEntry('repair', 2, 3, '2026-07-01T00:00:00Z'),
        scoredEntry('diverge', 3, 9, '2026-07-02T00:00:00Z'),
        scoredEntry('glow', 9, 9, '2026-07-06T00:00:00Z'),
      ];
      expect(categoryTileState(entries, NOW)).toBe('talk');
    });

    it('an un-tended divergence entry is compare, and outranks glow', () => {
      const entries = [
        scoredEntry('diverge', 3, 9, '2026-07-02T00:00:00Z'),
        scoredEntry('glow', 9, 9, '2026-07-06T00:00:00Z'),
      ];
      expect(categoryTileState(entries, NOW)).toBe('compare');
    });

    it('a strength with an open conversation still needs the couch first', () => {
      // 8/8 today AND a couch-flagged entry: the flag wins the tile.
      const entries = [
        scoredEntry('glow', 8, 8, '2026-07-06T00:00:00Z'),
        scoredEntry('kept', 6, 7, '2026-07-04T00:00:00Z', { couchFlagged: true }),
      ];
      expect(categoryTileState(entries, NOW)).toBe('talk');
    });

    it('glowing averages the 3 most recent scored completions — an old low day falls out of the window', () => {
      const entries = [
        scoredEntry('old-low', 5, 5, '2026-06-01T00:00:00Z', {
          discussedAt: new Date('2026-06-02T00:00:00Z'),
        }),
        scoredEntry('a', 8, 8, '2026-07-03T00:00:00Z'),
        scoredEntry('b', 8, 7, '2026-07-04T00:00:00Z'),
        scoredEntry('c', 8, 8, '2026-07-05T00:00:00Z'),
      ];
      // window = (8 + 7.5 + 8) / 3 ≈ 7.83 ≥ 7.5
      expect(categoryTileState(entries, NOW)).toBe('glowing');
    });

    it('a recent mid-range day inside the window can dim the glow', () => {
      const entries = [
        scoredEntry('a', 9, 9, '2026-06-01T00:00:00Z'),
        scoredEntry('b', 6, 6, '2026-07-03T00:00:00Z'),
        scoredEntry('c', 7, 7, '2026-07-04T00:00:00Z'),
        scoredEntry('d', 7, 6, '2026-07-05T00:00:00Z'),
      ];
      // window = (6 + 7 + 6.5) / 3 = 6.5 < 7.5 — the old 9/9 is outside it
      expect(categoryTileState(entries, NOW)).toBe('steady');
    });

    it('the 7.5 threshold is inclusive', () => {
      expect(
        categoryTileState([scoredEntry('edge', 7, 8, '2026-07-06T00:00:00Z')], NOW)
      ).toBe('glowing');
      expect(
        categoryTileState([scoredEntry('under', 7, 7, '2026-07-06T00:00:00Z')], NOW)
      ).toBe('steady');
    });

    it('a repair tended within 7 days shows tended; older settles to steady', () => {
      const recent = [
        scoredEntry('r', 2, 3, '2026-07-01T00:00:00Z', {
          discussedAt: new Date('2026-07-04T00:00:00Z'),
        }),
      ];
      const stale = [
        scoredEntry('r', 2, 3, '2026-06-20T00:00:00Z', {
          discussedAt: new Date('2026-06-25T00:00:00Z'),
        }),
      ];
      expect(categoryTileState(recent, NOW)).toBe('tended');
      expect(categoryTileState(stale, NOW)).toBe('steady');
    });

    it('a tended couch-flagged entry counts for tended too', () => {
      const entries = [
        scoredEntry('kept', 6, 6, '2026-07-02T00:00:00Z', {
          couchFlagged: true,
          discussedAt: new Date('2026-07-05T00:00:00Z'),
        }),
      ];
      expect(categoryTileState(entries, NOW)).toBe('tended');
    });

    it('glowing outranks tended — a fresh strength shows over a settled repair', () => {
      const entries = [
        scoredEntry('r', 2, 3, '2026-07-01T00:00:00Z', {
          discussedAt: new Date('2026-07-05T00:00:00Z'),
        }),
        scoredEntry('glow', 9, 9, '2026-07-06T00:00:00Z'),
      ];
      // window average = (2.5 + 9) / 2 = 5.75 < 7.5 — no glow; tended wins
      expect(categoryTileState(entries, NOW)).toBe('tended');

      const glowier = [
        scoredEntry('r', 6, 7, '2026-07-01T00:00:00Z', {
          couchFlagged: true,
          discussedAt: new Date('2026-07-05T00:00:00Z'),
        }),
        scoredEntry('g1', 9, 9, '2026-07-05T00:00:00Z'),
        scoredEntry('g2', 9, 9, '2026-07-06T00:00:00Z'),
      ];
      // window average = (6.5 + 9 + 9) / 3 ≈ 8.17 ≥ 7.5 — glow outranks tended
      expect(categoryTileState(glowier, NOW)).toBe('glowing');
    });

    it('text-only completions with no scores read as answered but steady', () => {
      const textOnly = makeCompletion({
        id: 'text',
        signal: null,
        responses: [
          {
            userId: 'user-1',
            responseText: 'just words',
            responseScore: null,
            imageUrl: null,
            submittedAt: null,
          },
        ],
        completedAt: new Date('2026-07-05T00:00:00Z'),
      });
      expect(categoryTileState([textOnly], NOW)).toBe('steady');
    });

    it('perCategoryTileState covers all 12 v1 categories, unlit where nothing happened', () => {
      const states = perCategoryTileState(
        [scoredEntry('r', 2, 3, '2026-07-01T00:00:00Z', { category: 'money' })],
        NOW
      );
      expect(Object.keys(states)).toHaveLength(12);
      expect(states.money).toBe('talk');
      expect(states.intimacy).toBe('unlit');
    });
  });

  describe('tileTally', () => {
    function scoredAt(id: string, avgPair: [number, number], completedAt: string) {
      return makeCompletion({
        id,
        responses: [
          {
            userId: 'user-1',
            responseText: '',
            responseScore: avgPair[0],
            imageUrl: null,
            submittedAt: null,
          },
          {
            userId: 'user-2',
            responseText: '',
            responseScore: avgPair[1],
            imageUrl: null,
            submittedAt: null,
          },
        ],
        completedAt: new Date(completedAt),
      });
    }

    it('counts every completion as answered — text and scored alike', () => {
      const textOnly = makeCompletion({
        id: 'text',
        responses: [
          {
            userId: 'user-1',
            responseText: 'words',
            responseScore: null,
            imageUrl: null,
            submittedAt: null,
          },
        ],
        completedAt: new Date('2026-07-01T00:00:00Z'),
      });
      const tally = tileTally([textOnly, scoredAt('s', [6, 6], '2026-07-02T00:00:00Z')]);
      expect(tally.answered).toBe(2);
      expect(tally.trend).toBeNull(); // only one scored completion
    });

    it('rising latest average reads warming', () => {
      const tally = tileTally([
        scoredAt('a', [5, 5], '2026-07-01T00:00:00Z'),
        scoredAt('b', [7, 8], '2026-07-03T00:00:00Z'),
      ]);
      expect(tally).toEqual({ answered: 2, trend: 'warming' });
    });

    it('falling latest average reads settling — never negative language', () => {
      const tally = tileTally([
        scoredAt('a', [8, 8], '2026-07-01T00:00:00Z'),
        scoredAt('b', [5, 6], '2026-07-03T00:00:00Z'),
      ]);
      expect(tally).toEqual({ answered: 2, trend: 'settling' });
    });

    it('a flat pair carries no trend word', () => {
      const tally = tileTally([
        scoredAt('a', [6, 8], '2026-07-01T00:00:00Z'),
        scoredAt('b', [7, 7], '2026-07-03T00:00:00Z'),
      ]);
      expect(tally).toEqual({ answered: 2, trend: null });
    });

    it('compares by completion date, not array order', () => {
      const tally = tileTally([
        scoredAt('later', [9, 9], '2026-07-05T00:00:00Z'),
        scoredAt('earlier', [4, 4], '2026-07-01T00:00:00Z'),
      ]);
      expect(tally.trend).toBe('warming');
    });

    it('an empty category tallies zero with no trend', () => {
      expect(tileTally([])).toEqual({ answered: 0, trend: null });
    });
  });

  describe('monthlyStats', () => {
    it('counts completions and tended conversations in the current month only', () => {
      // Local-time constructors — monthlyStats compares calendar months in
      // the device's timezone.
      const now = new Date(2026, 6, 7, 12, 0, 0);
      const list = [
        makeCompletion({ id: '1', completedAt: new Date(2026, 6, 1) }),
        makeCompletion({
          id: '2',
          completedAt: new Date(2026, 6, 3),
          discussedAt: new Date(2026, 6, 4),
        }),
        makeCompletion({ id: '3', completedAt: new Date(2026, 5, 28) }),
        makeCompletion({
          id: '4',
          completedAt: new Date(2026, 5, 20),
          discussedAt: new Date(2026, 5, 21),
        }),
        makeCompletion({ id: '5', completedAt: null }),
      ];
      expect(monthlyStats(list, now)).toEqual({ answered: 2, tended: 1 });
    });
  });

  describe('trendSeries', () => {
    it('averages the two scores per completion, chronologically ascending', () => {
      const list = [
        makeCompletion({ id: 'b', completedAt: new Date('2026-07-02') }),
        makeCompletion({
          id: 'a',
          completedAt: new Date('2026-07-01'),
          responses: [
            { userId: 'u1', responseText: '', responseScore: 6, imageUrl: null, submittedAt: null },
            { userId: 'u2', responseText: '', responseScore: 7, imageUrl: null, submittedAt: null },
          ],
        }),
      ];
      const series = trendSeries(list, 'money');
      expect(series.map((p) => p.value)).toEqual([6.5, 5.5]);
      expect(series[0].date.getTime()).toBeLessThan(series[1].date.getTime());
    });

    it('skips entries without both scores and caps at the last 10', () => {
      const scored = Array.from({ length: 12 }, (_, i) =>
        makeCompletion({
          id: `s${i}`,
          completedAt: new Date(Date.UTC(2026, 5, i + 1)),
        })
      );
      const textOnly = makeCompletion({
        id: 'text',
        completedAt: new Date('2026-06-20'),
        responses: [
          { userId: 'u1', responseText: 'words', responseScore: null, imageUrl: null, submittedAt: null },
        ],
      });
      const series = trendSeries([...scored, textOnly], 'money');
      expect(series).toHaveLength(10);
      expect(series[series.length - 1].date.getUTCDate()).toBe(12);
    });

    it('ignores other categories', () => {
      expect(trendSeries([makeCompletion({ category: 'intimacy' })], 'money')).toEqual([]);
    });
  });

  describe('scoresFor', () => {
    it('splits my score from my partner’s', () => {
      expect(scoresFor(makeCompletion(), 'user-1')).toEqual({ mine: 3, theirs: 8 });
      expect(scoresFor(makeCompletion(), 'user-2')).toEqual({ mine: 8, theirs: 3 });
    });
  });

  describe('useHearth (snapshot-driven cache)', () => {
    it('maps snapshot docs into the query cache', async () => {
      const { onSnapshot } = require('firebase/firestore');
      let snapshotCallback: ((snap: any) => void) | undefined;
      onSnapshot.mockImplementation((_q: any, cb: any) => {
        snapshotCallback = cb;
        return jest.fn();
      });

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useHearth(), { wrapper });

      expect(onSnapshot).toHaveBeenCalledTimes(1);

      // Let the initial cache-read fetch settle before the listener fires
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      await act(async () => {
        snapshotCallback?.({
          docs: [
            {
              id: 'c9',
              data: () => ({
                category: 'family',
                prompt_text: 'The people you came with',
                is_scale: true,
                responses: [
                  { user_id: 'user-1', response_text: '', response_score: 2 },
                  { user_id: 'user-2', response_text: '', response_score: 8 },
                ],
                completed_at: ts('2026-07-05T00:00:00Z'),
              }),
            },
          ],
        });
        // React Query batches observer notifications via setTimeout —
        // flush them under the globally-enabled fake timers.
        jest.runOnlyPendingTimers();
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].id).toBe('c9');
      expect(result.current.data?.[0].signal).toBe('divergence');
    });

    it('unsubscribes on unmount', () => {
      const { onSnapshot } = require('firebase/firestore');
      const unsubscribe = jest.fn();
      onSnapshot.mockReturnValue(unsubscribe);
      const { wrapper } = createClientAndWrapper();
      const { unmount } = renderHook(() => useHearth(), { wrapper });
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('useMarkDiscussed', () => {
    it('writes only my own discussed key and logs the event', async () => {
      const { updateDoc, doc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      updateDoc.mockResolvedValue(undefined);

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useMarkDiscussed(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ completionId: 'c1' });
      });

      expect(updateDoc).toHaveBeenCalledWith('completion-ref', {
        'discussed.user-1': 'server-timestamp',
      });
      expect(logEvent).toHaveBeenCalledWith('marked_discussed', { completion_id: 'c1' });
    });

    it('optimistically adds my mark to the cached completion', async () => {
      const { updateDoc, doc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      let resolveUpdate: (() => void) | undefined;
      updateDoc.mockReturnValue(new Promise<void>((res) => { resolveUpdate = res; }));

      const { queryClient, wrapper } = createClientAndWrapper();
      queryClient.setQueryData(['hearth', 'couple-1'], [makeCompletion({ id: 'c1' })]);

      const { result } = renderHook(() => useMarkDiscussed(), { wrapper });
      act(() => {
        result.current.mutate({ completionId: 'c1' });
      });
      await act(async () => {});

      const cached = queryClient.getQueryData<HearthCompletion[]>(['hearth', 'couple-1']);
      expect(cached?.[0].discussed['user-1']).toBeInstanceOf(Date);

      resolveUpdate?.();
      await act(async () => {});
    });

    it('rolls back and alerts quietly on failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { updateDoc, doc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      updateDoc.mockRejectedValue(new Error('offline'));

      const { queryClient, wrapper } = createClientAndWrapper();
      const original = [makeCompletion({ id: 'c1' })];
      queryClient.setQueryData(['hearth', 'couple-1'], original);

      const { result } = renderHook(() => useMarkDiscussed(), { wrapper });
      await act(async () => {
        await expect(
          result.current.mutateAsync({ completionId: 'c1' })
        ).rejects.toThrow('offline');
      });

      const cached = queryClient.getQueryData<HearthCompletion[]>(['hearth', 'couple-1']);
      expect(cached?.[0].discussed).toEqual({});
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not mark it',
        'Something went wrong. Please try again.'
      );
      alertSpy.mockRestore();
    });
  });
});
