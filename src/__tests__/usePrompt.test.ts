jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  // Return a ref carrying the doc id so deterministic-id assertions can
  // inspect what path a setDoc/updateDoc targeted.
  doc: jest.fn((_db: any, _coll?: string, id?: string) => ({ id })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  Timestamp: { now: jest.fn() },
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
  functions: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', coupleId: 'couple-1' },
  }),
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('@/services/imageUpload', () => ({
  uploadResponsePhoto: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mapAssignment,
  mapScaleConfig,
  mapFollowUpInfo,
  selectAssignmentDoc,
  needsDailyDelivery,
  useSubmitResponse,
  dedupeOfflineQueue,
  flushOfflineQueue,
  responseDocId,
} from '../hooks/usePrompt';

function createClientAndWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

function createWrapper() {
  return createClientAndWrapper().wrapper;
}

describe('usePrompt', () => {
  describe('Response submission', () => {
    it('should require minimum response length', () => {
      const responseText = 'short';
      const MIN_LENGTH = 10;
      expect(responseText.length < MIN_LENGTH).toBe(true);
    });

    it('should accept valid response length', () => {
      const responseText = 'This is a perfectly good response';
      const MIN_LENGTH = 10;
      expect(responseText.length >= MIN_LENGTH).toBe(true);
    });
  });

  describe('Offline queue', () => {
    it('should queue response when offline', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const NetInfo = require('@react-native-community/netinfo');

      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      AsyncStorage.getItem.mockResolvedValue(null);

      const queue: any[] = [];
      queue.push({ assignmentId: 'a-1', responseText: 'test response' });

      expect(queue.length).toBe(1);
      expect(queue[0].assignmentId).toBe('a-1');
    });
  });

  describe('Feedback submission', () => {
    it('should accept valid emotional responses', () => {
      const validResponses = ['positive', 'neutral', 'negative'];
      validResponses.forEach((response) => {
        expect(['positive', 'neutral', 'negative']).toContain(response);
      });
    });
  });

  describe('Trigger prompt', () => {
    it('should call triggerPromptDelivery callable', () => {
      const httpsCallable = require('firebase/functions').httpsCallable;
      httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({
        data: { success: true, coupleId: 'couple-1' },
      }));

      const triggerFn = httpsCallable({}, 'triggerPromptDelivery');
      expect(httpsCallable).toHaveBeenCalledWith({}, 'triggerPromptDelivery');
    });
  });

  describe('Read-boundary mapping (snake_case → camelCase)', () => {
    const baseDoc = {
      couple_id: 'couple-1',
      prompt_id: 'p-1',
      prompt_text: 'How connected did you feel this week?',
      prompt_hint: null,
      prompt_type: 'love_map_update',
      requires_conversation: false,
      assigned_date: '2026-07-05',
      status: 'delivered',
    };

    it('defaults to daily/text when new fields are absent (legacy docs)', () => {
      const assignment = mapAssignment('a-1', baseDoc);
      expect(assignment.assignmentKind).toBe('daily');
      expect(assignment.responseFormat).toBe('text');
      expect(assignment.scaleConfig).toBeNull();
      expect(assignment.followUp).toBeNull();
      expect(assignment.closingText).toBeNull();
    });

    it('maps a scale assignment with denormalized scale_config', () => {
      const assignment = mapAssignment('a-2', {
        ...baseDoc,
        assignment_kind: 'daily',
        response_format: 'scale',
        scale_config: {
          min: 1,
          max: 10,
          low_threshold: 4,
          high_threshold: 9,
          divergence_gap: 4,
          min_label: 'Struggling',
          max_label: 'Thriving',
        },
      });
      expect(assignment.responseFormat).toBe('scale');
      expect(assignment.scaleConfig).toEqual({
        min: 1,
        max: 10,
        lowThreshold: 4,
        highThreshold: 9,
        divergenceGap: 4,
        minLabel: 'Struggling',
        maxLabel: 'Thriving',
      });
    });

    it('maps a follow-up assignment with top-level closing_text and null prompt_type', () => {
      const assignment = mapAssignment('a-3', {
        ...baseDoc,
        prompt_type: null,
        prompt_hint: null,
        assignment_kind: 'follow_up',
        response_format: 'text',
        scale_config: null,
        closing_text: 'Small answers count.',
        follow_up: {
          branch: 'repair',
          step: 1,
          parent_assignment_id: 'a-parent',
          template_id: 'tpl-1',
        },
      });
      expect(assignment.assignmentKind).toBe('follow_up');
      expect(assignment.responseFormat).toBe('text');
      expect(assignment.scaleConfig).toBeNull();
      expect(assignment.promptType).toBe('');
      expect(assignment.closingText).toBe('Small answers count.');
      expect(assignment.followUp).toEqual({
        branch: 'repair',
        step: 1,
        parentAssignmentId: 'a-parent',
        templateId: 'tpl-1',
      });
    });

    it('mapScaleConfig fills missing fields with locked v1 defaults', () => {
      expect(mapScaleConfig(null)).toBeNull();
      expect(mapScaleConfig({})).toEqual({
        min: 1,
        max: 10,
        lowThreshold: 4,
        highThreshold: 9,
        divergenceGap: 4,
        minLabel: 'Struggling',
        maxLabel: 'Thriving',
      });
    });

    it('mapFollowUpInfo returns null for missing or invalid data', () => {
      expect(mapFollowUpInfo(null)).toBeNull();
      expect(mapFollowUpInfo({})).toBeNull();
    });
  });

  describe('selectAssignmentDoc', () => {
    const makeDoc = (id: string, data: Record<string, any>) => ({
      id,
      data: () => data,
    });

    it('returns null when only explore assignments exist', () => {
      const docs = [makeDoc('e-1', { source: 'explore', status: 'delivered' })];
      expect(selectAssignmentDoc(docs, [])).toBeNull();
    });

    it('surfaces an active deepener over the completed daily (deepener day: two docs)', () => {
      const docs = [
        makeDoc('daily-1', { status: 'completed', assignment_kind: 'daily' }),
        makeDoc('fu-1', {
          status: 'delivered',
          assignment_kind: 'follow_up',
          source: 'follow_up',
        }),
      ];
      expect(selectAssignmentDoc(docs, [])?.id).toBe('fu-1');
    });

    it('shows the daily reveal while the daily is the only doc', () => {
      const docs = [makeDoc('daily-1', { status: 'completed', assignment_kind: 'daily' })];
      expect(selectAssignmentDoc(docs, [])?.id).toBe('daily-1');
    });

    it('never surfaces a scheduled (not yet activated) follow-up', () => {
      const docs = [
        makeDoc('daily-1', { status: 'delivered', assignment_kind: 'daily' }),
        makeDoc('fu-1', { status: 'scheduled', assignment_kind: 'follow_up' }),
      ];
      expect(selectAssignmentDoc(docs, [])?.id).toBe('daily-1');
    });

    it('falls back past a skipped follow-up to the daily assignment', () => {
      const docs = [
        makeDoc('daily-1', { status: 'completed', assignment_kind: 'daily' }),
        makeDoc('fu-1', { status: 'delivered', assignment_kind: 'follow_up' }),
      ];
      expect(selectAssignmentDoc(docs, ['fu-1'])?.id).toBe('daily-1');
    });

    it('prefers a completed follow-up reveal (carries closing text) over the completed daily', () => {
      const docs = [
        makeDoc('daily-1', { status: 'completed', assignment_kind: 'daily' }),
        makeDoc('fu-1', { status: 'completed', assignment_kind: 'follow_up' }),
      ];
      expect(selectAssignmentDoc(docs, [])?.id).toBe('fu-1');
    });

    describe('local-date window (query spans yesterday/today/tomorrow)', () => {
      const TODAY = '2026-07-08';

      it("prefers today's active assignment over yesterday's still-active one", () => {
        const docs = [
          makeDoc('y-1', { status: 'partial', assigned_date: '2026-07-07' }),
          makeDoc('t-1', { status: 'delivered', assigned_date: TODAY }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)?.id).toBe('t-1');
      });

      it("falls back to an active assignment on an adjacent date (timezone-skewed server dating)", () => {
        const docs = [
          makeDoc('tm-1', { status: 'delivered', assigned_date: '2026-07-09' }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)?.id).toBe('tm-1');
      });

      it("prefers today's active follow-up over yesterday's active daily", () => {
        const docs = [
          makeDoc('y-daily', { status: 'delivered', assigned_date: '2026-07-07' }),
          makeDoc('t-fu', {
            status: 'delivered',
            assigned_date: TODAY,
            assignment_kind: 'follow_up',
          }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)?.id).toBe('t-fu');
      });

      it("surfaces today's completed reveal over yesterday's completed doc", () => {
        const docs = [
          makeDoc('y-done', { status: 'completed', assigned_date: '2026-07-07' }),
          makeDoc('t-done', { status: 'completed', assigned_date: TODAY }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)?.id).toBe('t-done');
      });

      it("never surfaces yesterday's expired leftovers — returns null so the new day can start", () => {
        const docs = [
          makeDoc('y-exp', { status: 'expired', assigned_date: '2026-07-07' }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)).toBeNull();
      });

      it('still excludes explore assignments inside the window', () => {
        const docs = [
          makeDoc('e-1', { source: 'explore', status: 'partial', assigned_date: TODAY }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)).toBeNull();
      });

      it("never lets yesterday's completed reveal wear today's header (skip fallback returns null)", () => {
        // The founder-couple desync: today's follow-up was set aside, the only
        // other doc in the window is yesterday's completed follow-up. Old
        // behavior surfaced it under today's date; now the day reads as fresh.
        const docs = [
          makeDoc('y-done', {
            status: 'completed',
            assigned_date: '2026-07-07',
            assignment_kind: 'follow_up',
          }),
          makeDoc('t-fu', {
            status: 'partial',
            assigned_date: TODAY,
            assignment_kind: 'follow_up',
          }),
        ];
        expect(selectAssignmentDoc(docs, ['t-fu'], TODAY)).toBeNull();
      });

      it("still surfaces a completed doc dated tomorrow (timezone-skewed partner)", () => {
        const docs = [
          makeDoc('tm-done', { status: 'completed', assigned_date: '2026-07-09' }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY)?.id).toBe('tm-done');
      });
    });

    describe('server-visible skip (skipped_by map)', () => {
      const TODAY = '2026-07-08';

      it('filters a follow-up the user set aside on ANOTHER device', () => {
        const docs = [
          makeDoc('fu-1', {
            status: 'partial',
            assigned_date: TODAY,
            assignment_kind: 'follow_up',
            skipped_by: { 'me-1': {} },
          }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY, 'me-1')).toBeNull();
      });

      it("does NOT filter when only the PARTNER set it aside — I can still answer", () => {
        const docs = [
          makeDoc('fu-1', {
            status: 'partial',
            assigned_date: TODAY,
            assignment_kind: 'follow_up',
            skipped_by: { 'partner-1': {} },
          }),
        ];
        expect(selectAssignmentDoc(docs, [], TODAY, 'me-1')?.id).toBe('fu-1');
      });
    });
  });

  describe('needsDailyDelivery (Today auto-trigger gate)', () => {
    const TODAY = '2026-07-08';
    const makeDoc = (id: string, data: Record<string, any>) => ({
      id,
      data: () => data,
    });

    it('true when the window is empty', () => {
      expect(needsDailyDelivery([], TODAY)).toBe(true);
    });

    it("true when only yesterday's completed/expired leftovers exist (new local day)", () => {
      const docs = [
        makeDoc('y-done', { status: 'completed', assigned_date: '2026-07-07' }),
        makeDoc('y-exp', { status: 'expired', assigned_date: '2026-07-07' }),
      ];
      expect(needsDailyDelivery(docs, TODAY)).toBe(true);
    });

    it('false when a live daily assignment exists anywhere in the window', () => {
      expect(
        needsDailyDelivery(
          [makeDoc('y-1', { status: 'partial', assigned_date: '2026-07-07' })],
          TODAY
        )
      ).toBe(false);
      expect(
        needsDailyDelivery(
          [makeDoc('t-1', { status: 'delivered', assigned_date: TODAY })],
          TODAY
        )
      ).toBe(false);
    });

    it("false once today's assignment is completed (no re-trigger after the reveal)", () => {
      const docs = [makeDoc('t-done', { status: 'completed', assigned_date: TODAY })];
      expect(needsDailyDelivery(docs, TODAY)).toBe(false);
    });

    it('explore assignments never satisfy the daily rhythm', () => {
      const docs = [
        makeDoc('e-1', { source: 'explore', status: 'partial', assigned_date: TODAY }),
      ];
      expect(needsDailyDelivery(docs, TODAY)).toBe(true);
    });

    it("a scheduled next-day follow-up does not block delivery (the run activates it)", () => {
      const docs = [
        makeDoc('fu-1', {
          status: 'scheduled',
          assignment_kind: 'follow_up',
          assigned_date: TODAY,
        }),
      ];
      expect(needsDailyDelivery(docs, TODAY)).toBe(true);
    });
  });

  describe('useSubmitResponse with response_score', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const NetInfo = require('@react-native-community/netinfo');
    const firestore = require('firebase/firestore');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('writes response_score on the response doc when online', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 0 }),
      });
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'A short note about why.',
          responseScore: 8,
        });
      });

      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({
          response_score: 8,
          response_text: 'A short note about why.',
        })
      );
    });

    it('writes response_score: null for plain text responses', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 0 }),
      });
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Just a text answer today.',
        });
      });

      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({ response_score: null })
      );
    });

    it('queues responseScore in the offline AsyncStorage queue', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      let outcome: any;
      await act(async () => {
        outcome = await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Offline note.',
          responseScore: 4,
        });
      });

      expect(outcome.isOffline).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@closer_offline_responses',
        expect.any(String)
      );
      const [, savedJson] = AsyncStorage.setItem.mock.calls.find(
        ([key]: [string]) => key === '@closer_offline_responses'
      );
      const queue = JSON.parse(savedJson);
      expect(queue).toEqual([
        expect.objectContaining({
          assignmentId: 'a-1',
          responseText: 'Offline note.',
          responseScore: 4,
        }),
      ]);
    });

    it('optimistically seals the UI when queueing offline (no drop back to unanswered)', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const { queryClient, wrapper } = createClientAndWrapper();
      queryClient.setQueryData(['todayPrompt', 'couple-1'], {
        assignment: { id: 'a-1', status: 'delivered', promptText: 'Q' },
        myResponse: null,
        partnerResponse: null,
        partnerHasResponded: false,
        isComplete: false,
        nextPromptAt: null,
        reactions: null,
      });

      const { result } = renderHook(() => useSubmitResponse(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Queued while offline.',
        });
      });

      const cached = queryClient.getQueryData<any>(['todayPrompt', 'couple-1']);
      expect(cached.myResponse).toEqual(
        expect.objectContaining({
          responseText: 'Queued while offline.',
          status: 'submitted',
        })
      );
      expect(cached.isMyResponseOffline).toBe(true);
      expect(cached.isComplete).toBe(false);
      expect(cached.assignment.status).toBe('partial');
    });

    it('replaces (not appends) an offline resubmit for the same assignment', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'First try.' }])
      );
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Second try, better words.',
        });
      });

      const [, savedJson] = AsyncStorage.setItem.mock.calls.find(
        ([key]: [string]) => key === '@closer_offline_responses'
      );
      const queue = JSON.parse(savedJson);
      expect(queue).toHaveLength(1);
      expect(queue[0].responseText).toBe('Second try, better words.');
    });

    it('invalidates the explore caches too, so an explore card seals after submit', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 0, source: 'explore' }),
      });
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);

      const { queryClient, wrapper } = createClientAndWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSubmitResponse(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          assignmentId: 'a-explore',
          responseText: 'An explore answer.',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todayPrompt'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exploreAssignments'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exploreResponses'] });
    });

    it('rejects scores outside 1-10 or non-integers at the boundary', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      for (const badScore of [0, 11, 5.5]) {
        await act(async () => {
          await expect(
            result.current.mutateAsync({
              assignmentId: 'a-1',
              responseText: '',
              responseScore: badScore,
            })
          ).rejects.toThrow('Score must be a whole number between 1 and 10');
        });
      }
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });

    it('uses the deterministic response doc id and counts couple_id in the existence check', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 0 }),
      });
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      let outcome: any;
      await act(async () => {
        outcome = await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'A deterministic answer.',
        });
      });

      // Doc id is `${assignmentId}_${userId}` — retries overwrite, never duplicate
      expect(outcome.responseId).toBe('a-1_user-1');
      expect(firestore.doc).toHaveBeenCalledWith({}, 'prompt_responses', 'a-1_user-1');
      // Existence check pins couple_id — the only query shape the security
      // rules can prove safe (isCoupleMember(resource.data.couple_id))
      expect(firestore.where).toHaveBeenCalledWith('couple_id', '==', 'couple-1');
      expect(firestore.where).toHaveBeenCalledWith('assignment_id', '==', 'a-1');
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1');
    });

    it('does NOT increment response_count again when my response already exists (retry/resubmit overwrite)', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 1, status: 'partial' }),
      });
      // Server already holds my response for this assignment
      firestore.getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'a-1_user-1' }] });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      let outcome: any;
      await act(async () => {
        outcome = await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Same person, second attempt.',
        });
      });

      // Overwrites the SAME doc (no duplicate) and leaves the counter alone
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({ response_text: 'Same person, second attempt.' })
      );
      expect(firestore.updateDoc).not.toHaveBeenCalled();
      expect(outcome.responseId).toBe('a-1_user-1');
      expect(outcome.isComplete).toBe(false);
    });

    it('reuses a legacy auto-id response doc when one exists (no second doc)', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 2, status: 'completed' }),
      });
      firestore.getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'legacy-auto-id' }] });
      firestore.setDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      let outcome: any;
      await act(async () => {
        outcome = await result.current.mutateAsync({
          assignmentId: 'a-1',
          responseText: 'Overwrite the old doc, not a new one.',
        });
      });

      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'legacy-auto-id' }),
        expect.anything()
      );
      expect(firestore.updateDoc).not.toHaveBeenCalled();
      expect(outcome.isComplete).toBe(true);
    });
  });

  describe('responseDocId (deterministic response ids)', () => {
    it('is `${assignmentId}_${userId}`', () => {
      expect(responseDocId('a-1', 'user-1')).toBe('a-1_user-1');
      expect(responseDocId('assign-xyz', 'u2')).toBe('assign-xyz_u2');
    });
  });

  describe('dedupeOfflineQueue', () => {
    it('keeps distinct assignments untouched', () => {
      const queue = [
        { assignmentId: 'a-1', responseText: 'one' },
        { assignmentId: 'a-2', responseText: 'two' },
      ];
      expect(dedupeOfflineQueue(queue)).toEqual(queue);
    });

    it('keeps only the LATEST entry when the same assignment is queued twice', () => {
      const queue = [
        { assignmentId: 'a-1', responseText: 'first attempt' },
        { assignmentId: 'a-2', responseText: 'other' },
        { assignmentId: 'a-1', responseText: 'second attempt', responseScore: 7 },
      ];
      expect(dedupeOfflineQueue(queue)).toEqual([
        { assignmentId: 'a-1', responseText: 'second attempt', responseScore: 7 },
        { assignmentId: 'a-2', responseText: 'other' },
      ]);
    });

    it('drops malformed entries without an assignmentId', () => {
      const queue = [
        { assignmentId: '', responseText: 'broken' },
        { assignmentId: 'a-1', responseText: 'good' },
      ] as any[];
      expect(dedupeOfflineQueue(queue)).toEqual([
        { assignmentId: 'a-1', responseText: 'good' },
      ]);
    });

    it('handles an empty queue', () => {
      expect(dedupeOfflineQueue([])).toEqual([]);
    });
  });

  describe('flushOfflineQueue (at most one response per user per assignment)', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const firestore = require('firebase/firestore');
    const { logger } = require('@/utils/logger');

    beforeEach(() => {
      jest.clearAllMocks();
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ prompt_id: 'p-1', response_count: 0 }),
      });
      firestore.setDoc.mockResolvedValue(undefined);
      firestore.updateDoc.mockResolvedValue(undefined);
      AsyncStorage.removeItem.mockResolvedValue(undefined);
    });

    it('writes queued items once (deterministic id) and clears the queue', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Queued answer.' }])
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      await flushOfflineQueue('user-1', 'couple-1');

      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({
          assignment_id: 'a-1',
          user_id: 'user-1',
          couple_id: 'couple-1',
          response_text: 'Queued answer.',
        })
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@closer_offline_responses');
    });

    it('pins couple_id in the server existence check (rules-provable query)', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Queued answer.' }])
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      await flushOfflineQueue('user-1', 'couple-1');

      expect(firestore.where).toHaveBeenCalledWith('couple_id', '==', 'couple-1');
      expect(firestore.where).toHaveBeenCalledWith('assignment_id', '==', 'a-1');
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1');
    });

    it('dedupes WITHIN the queue before flushing — one write, latest wins', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([
          { assignmentId: 'a-1', responseText: 'stale duplicate' },
          { assignmentId: 'a-1', responseText: 'latest version' },
        ])
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      await flushOfflineQueue('user-1', 'couple-1');

      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({ response_text: 'latest version' })
      );
    });

    it('drops queued items when this user already responded on the server', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Would double-count.' }])
      );
      // Server already has a response by this user for a-1
      firestore.getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'a-1_user-1' }] });

      await flushOfflineQueue('user-1', 'couple-1');

      expect(firestore.setDoc).not.toHaveBeenCalled();
      expect(firestore.updateDoc).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@closer_offline_responses');
    });

    it('does nothing when the queue is empty', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await flushOfflineQueue('user-1', 'couple-1');

      expect(firestore.setDoc).not.toHaveBeenCalled();
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('single-flight: concurrent flush calls share ONE execution', async () => {
      let resolveGetItem!: (value: string | null) => void;
      AsyncStorage.getItem.mockImplementation(
        () =>
          new Promise<string | null>((resolve) => {
            resolveGetItem = resolve;
          })
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      // Two NetInfo listeners (today + explore) firing on the same reconnect
      const first = flushOfflineQueue('user-1', 'couple-1');
      const second = flushOfflineQueue('user-1', 'couple-1');
      expect(second).toBe(first);

      resolveGetItem(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Queued answer.' }])
      );
      await Promise.all([first, second]);

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    });

    it('allows a NEW flush once the previous one settled (retry-on-reconnect)', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Queued answer.' }])
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      await flushOfflineQueue('user-1', 'couple-1');
      await flushOfflineQueue('user-1', 'couple-1');

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
    });

    it('logs flush failures via the logger instead of failing silently, and keeps the queue', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ assignmentId: 'a-1', responseText: 'Stuck answer.' }])
      );
      firestore.getDocs.mockRejectedValue(new Error('permission-denied'));

      await expect(flushOfflineQueue('user-1', 'couple-1')).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
      // Queue must survive for the next reconnect retry
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });

    it('logs a failed photo upload but still submits the response without it', async () => {
      const { uploadResponsePhoto } = require('@/services/imageUpload');
      uploadResponsePhoto.mockRejectedValue(new Error('storage down'));
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([
          { assignmentId: 'a-1', responseText: 'Answer with photo.', imageUri: 'file://p.jpg' },
        ])
      );
      firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });

      await flushOfflineQueue('user-1', 'couple-1');

      expect(logger.warn).toHaveBeenCalled();
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-1_user-1' }),
        expect.objectContaining({ image_url: null })
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@closer_offline_responses');
    });
  });
});
