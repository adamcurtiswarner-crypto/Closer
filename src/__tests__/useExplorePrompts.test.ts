/**
 * Tests for src/hooks/useExplorePrompts.ts — the "send your partner a
 * question" data layer.
 *
 * Contracts under test:
 *  - useStartExplorePrompt reuses a live existing assignment (no duplicates;
 *    this is also the "answer their question" path) and writes BOTH
 *    category and prompt_type on create.
 *  - useExploreResponses enforces the seal: while the assignment is partial,
 *    only the current user's own response is exposed.
 *  - mapExploreAssignment / pendingPartnerQuestions pure helpers.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ __collection: name })),
  doc: jest.fn((_db: unknown, name: string, id: string) => ({ __doc: `${name}/${id}` })),
  query: jest.fn((ref: unknown, ...filters: unknown[]) => ({ ref, filters })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@/config/firebase', () => ({ db: {} }));

const mockUser: { id: string; coupleId: string | null } = {
  id: 'user-1',
  coupleId: 'couple-1',
};
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mapExploreAssignment,
  isLiveExploreAssignment,
  pendingPartnerQuestions,
  useCompletionReactions,
  useStartExplorePrompt,
  useExploreResponses,
  NoCoupleLinkedError,
  type ExploreAssignment,
} from '../hooks/useExplorePrompts';
import { logEvent } from '@/services/analytics';

const firestore = require('firebase/firestore');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const PROMPT = {
  id: 'prompt-1',
  text: 'What made you smile today?',
  hint: null,
  type: 'daily_connection',
  emotionalDepth: 'surface',
};

function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.coupleId = 'couple-1';
});

describe('mapExploreAssignment', () => {
  it('maps snake_case fields and falls back category <- prompt_type for legacy docs', () => {
    const mapped = mapExploreAssignment('a-1', {
      prompt_id: 'prompt-1',
      prompt_text: 'Q?',
      prompt_hint: null,
      prompt_type: 'daily_connection',
      status: 'partial',
      first_responder_id: 'user-2',
      response_count: 1,
      created_at: { toDate: () => new Date('2026-07-08T10:00:00') },
    });
    expect(mapped).toEqual({
      id: 'a-1',
      promptId: 'prompt-1',
      promptText: 'Q?',
      promptHint: null,
      category: 'daily_connection',
      status: 'partial',
      firstResponderId: 'user-2',
      responseCount: 1,
      createdAt: new Date('2026-07-08T10:00:00'),
    });
  });

  it('prefers an explicit category over prompt_type', () => {
    const mapped = mapExploreAssignment('a-2', {
      prompt_id: 'p',
      category: 'future_dreams',
      prompt_type: 'daily_connection',
    });
    expect(mapped.category).toBe('future_dreams');
  });

  it('isLiveExploreAssignment treats only expired as dead', () => {
    expect(isLiveExploreAssignment({ status: 'delivered' })).toBe(true);
    expect(isLiveExploreAssignment({ status: 'partial' })).toBe(true);
    expect(isLiveExploreAssignment({ status: 'completed' })).toBe(true);
    expect(isLiveExploreAssignment({ status: 'expired' })).toBe(false);
  });
});

describe('pendingPartnerQuestions', () => {
  const base: Omit<ExploreAssignment, 'id' | 'status' | 'firstResponderId'> = {
    promptId: 'p',
    promptText: 'Q?',
    promptHint: null,
    category: 'daily_connection',
    responseCount: 1,
    createdAt: null,
  };

  it('returns only partials the PARTNER answered, newest first', () => {
    const questions = pendingPartnerQuestions(
      [
        { ...base, id: 'mine', status: 'partial', firstResponderId: 'user-1' },
        {
          ...base,
          id: 'older',
          status: 'partial',
          firstResponderId: 'user-2',
          createdAt: new Date('2026-07-01'),
        },
        { ...base, id: 'done', status: 'completed', firstResponderId: 'user-2' },
        {
          ...base,
          id: 'newer',
          status: 'partial',
          firstResponderId: 'user-2',
          createdAt: new Date('2026-07-08'),
        },
        { ...base, id: 'fresh', status: 'delivered', firstResponderId: null },
      ],
      'user-1'
    );
    expect(questions.map((q) => q.id)).toEqual(['newer', 'older']);
  });

  it('is empty without data or a user', () => {
    expect(pendingPartnerQuestions(undefined, 'user-1')).toEqual([]);
    expect(pendingPartnerQuestions([], undefined)).toEqual([]);
  });
});

describe('useStartExplorePrompt', () => {
  it('throws NoCoupleLinkedError without a couple', async () => {
    mockUser.coupleId = null;
    const { result } = renderHook(() => useStartExplorePrompt(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(PROMPT)).rejects.toBeInstanceOf(
        NoCoupleLinkedError
      );
    });
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it('REUSES a live existing assignment instead of creating a duplicate', async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        fakeDoc('assign-existing', {
          prompt_id: 'prompt-1',
          status: 'partial',
          first_responder_id: 'user-2',
          response_count: 1,
        }),
      ],
    });

    const { result } = renderHook(() => useStartExplorePrompt(), {
      wrapper: createWrapper(),
    });

    let outcome: any;
    await act(async () => {
      outcome = await result.current.mutateAsync(PROMPT);
    });

    expect(outcome).toEqual({ assignmentId: 'assign-existing', prompt: PROMPT, reused: true });
    expect(firestore.addDoc).not.toHaveBeenCalled();
    // Reuse is not a new start — no duplicate analytics event
    expect(logEvent).not.toHaveBeenCalledWith('explore_prompt_started', expect.anything());
  });

  it('ignores expired assignments and creates a fresh one with BOTH category and prompt_type', async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [fakeDoc('assign-old', { prompt_id: 'prompt-1', status: 'expired' })],
    });
    firestore.addDoc.mockResolvedValue({ id: 'assign-new' });

    const { result } = renderHook(() => useStartExplorePrompt(), {
      wrapper: createWrapper(),
    });

    let outcome: any;
    await act(async () => {
      outcome = await result.current.mutateAsync(PROMPT);
    });

    expect(outcome.assignmentId).toBe('assign-new');
    expect(outcome.reused).toBe(false);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        couple_id: 'couple-1',
        prompt_id: 'prompt-1',
        prompt_type: 'daily_connection',
        category: 'daily_connection',
        source: 'explore',
        status: 'delivered',
        response_count: 0,
      })
    );
    expect(logEvent).toHaveBeenCalledWith('explore_prompt_started', {
      prompt_id: 'prompt-1',
      category: 'daily_connection',
    });
  });

  it('queries by couple, prompt, and explore source before creating', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [] });
    firestore.addDoc.mockResolvedValue({ id: 'assign-new' });

    const { result } = renderHook(() => useStartExplorePrompt(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(PROMPT);
    });

    expect(firestore.where).toHaveBeenCalledWith('couple_id', '==', 'couple-1');
    expect(firestore.where).toHaveBeenCalledWith('prompt_id', '==', 'prompt-1');
    expect(firestore.where).toHaveBeenCalledWith('source', '==', 'explore');
  });
});

describe('useCompletionReactions — live listener on the completion doc', () => {
  type SnapshotHandler = (snap: {
    exists: () => boolean;
    data: () => Record<string, unknown>;
  }) => void;
  type ErrorHandler = (error: Error) => void;

  function captureListener() {
    const handlers: { next?: SnapshotHandler; error?: ErrorHandler } = {};
    const unsubscribe = jest.fn();
    firestore.onSnapshot.mockImplementation(
      (_ref: unknown, onNext: SnapshotHandler, onError: ErrorHandler) => {
        handlers.next = onNext;
        handlers.error = onError;
        return unsubscribe;
      }
    );
    return { handlers, unsubscribe };
  }

  it('feeds the partner reaction into an OPEN reveal live — snapshot, not one-shot fetch', async () => {
    const { handlers, unsubscribe } = captureListener();

    const { result, unmount } = renderHook(() => useCompletionReactions('assign-1'), {
      wrapper: createWrapper(),
    });

    // Listens on the completion doc, whose id IS the assignment id.
    expect(firestore.doc).toHaveBeenCalledWith({}, 'prompt_completions', 'assign-1');

    // Let the initial (empty-cache) query settle before the first snapshot
    // arrives — in production the snapshot is always the later event.
    await waitFor(() => expect(result.current.data).toBeNull());

    // First snapshot: only my reaction exists.
    act(() => {
      handlers.next!({
        exists: () => true,
        data: () => ({ reactions: { 'user-1': 'love' } }),
      });
    });
    await waitFor(() => expect(result.current.data).toEqual({ 'user-1': 'love' }));

    // The partner reacts while the sheet is still up — it lands with no
    // refetch and no reopen.
    act(() => {
      handlers.next!({
        exists: () => true,
        data: () => ({ reactions: { 'user-1': 'love', 'user-2': 'spark' } }),
      });
    });
    await waitFor(() =>
      expect(result.current.data).toEqual({ 'user-1': 'love', 'user-2': 'spark' })
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not listen without an assignment id (sheet closed)', () => {
    firestore.onSnapshot.mockClear();
    renderHook(() => useCompletionReactions(null), { wrapper: createWrapper() });
    expect(firestore.onSnapshot).not.toHaveBeenCalled();
  });

  it('swaps the listener when the reveal moves to another assignment', async () => {
    const { unsubscribe } = captureListener();

    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useCompletionReactions(id),
      { wrapper: createWrapper(), initialProps: { id: 'assign-1' as string | null } }
    );
    expect(firestore.doc).toHaveBeenCalledWith({}, 'prompt_completions', 'assign-1');

    rerender({ id: 'assign-2' });

    // Old listener torn down, new one up on the new doc.
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(firestore.doc).toHaveBeenCalledWith({}, 'prompt_completions', 'assign-2');
  });

  it('a missing completion doc resolves to null reactions', async () => {
    const { handlers } = captureListener();

    const { result } = renderHook(() => useCompletionReactions('assign-1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      handlers.next!({ exists: () => false, data: () => ({}) });
    });
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it('a listener error settles to null — reactions are non-critical, the reveal still renders', async () => {
    const { handlers } = captureListener();

    const { result } = renderHook(() => useCompletionReactions('assign-1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      handlers.error!(new Error('permission-denied'));
    });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe('useExploreResponses — the seal', () => {
  const bothResponses = [
    fakeDoc('r1', {
      user_id: 'user-1',
      response_text: 'Mine',
      submitted_at: { toDate: () => new Date('2026-07-08T10:00:00') },
    }),
    fakeDoc('r2', {
      user_id: 'user-2',
      response_text: 'Theirs',
      submitted_at: { toDate: () => new Date('2026-07-08T11:00:00') },
    }),
  ];

  it('exposes ONLY my response while the assignment is partial', async () => {
    firestore.getDocs.mockResolvedValue({ docs: bothResponses });

    const { result } = renderHook(() => useExploreResponses('assign-1', 'partial'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).not.toBeUndefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toEqual(
      expect.objectContaining({ userId: 'user-1', text: 'Mine', isCurrentUser: true })
    );
  });

  it('exposes both responses once completed', async () => {
    firestore.getDocs.mockResolvedValue({ docs: bothResponses });

    const { result } = renderHook(() => useExploreResponses('assign-1', 'completed'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).not.toBeUndefined());
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.map((r) => r.text)).toEqual(['Mine', 'Theirs']);
  });
});
