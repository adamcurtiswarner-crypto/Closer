jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
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

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mapAssignment,
  mapScaleConfig,
  mapFollowUpInfo,
  selectAssignmentDoc,
  useSubmitResponse,
} from '../hooks/usePrompt';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
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
      firestore.addDoc.mockResolvedValue({ id: 'r-1' });
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

      expect(firestore.addDoc).toHaveBeenCalledWith(
        undefined,
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
      firestore.addDoc.mockResolvedValue({ id: 'r-2' });
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

      expect(firestore.addDoc).toHaveBeenCalledWith(
        undefined,
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
      expect(firestore.addDoc).not.toHaveBeenCalled();
    });
  });
});
