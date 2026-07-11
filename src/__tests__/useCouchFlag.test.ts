jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', coupleId: 'couple-1' },
  }),
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  isCouchFlagged,
  mapCouchFlagState,
  useCouchFlag,
  useCouchFlagState,
  type CouchFlagState,
} from '../hooks/useCouchFlag';
import { logEvent } from '@/services/analytics';

const snap = (data: Record<string, unknown>) => ({
  exists: () => true,
  data: () => data,
});

function createClientAndWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useCouchFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapCouchFlagState (read boundary)', () => {
    it('maps snake_case flag fields', () => {
      expect(
        mapCouchFlagState({ couch_flagged: true, couch_flagged_by: 'user-2' })
      ).toEqual({ couchFlagged: true, couchFlaggedBy: 'user-2' });
    });

    it('defaults to unflagged on docs without the fields', () => {
      expect(mapCouchFlagState({})).toEqual({
        couchFlagged: false,
        couchFlaggedBy: null,
      });
    });

    it('isCouchFlagged is true when EITHER partner flagged', () => {
      expect(isCouchFlagged({ couchFlagged: true, couchFlaggedBy: 'user-2' })).toBe(true);
      expect(isCouchFlagged({ couchFlagged: false, couchFlaggedBy: null })).toBe(false);
      expect(isCouchFlagged(null)).toBe(false);
      expect(isCouchFlagged(undefined)).toBe(false);
    });
  });

  describe('useCouchFlagState', () => {
    it('reads the completion doc and maps the flag state', async () => {
      const { doc, getDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(snap({ couch_flagged: true, couch_flagged_by: 'user-1' }));

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useCouchFlagState('a1'), { wrapper });

      await act(async () => {});
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(result.current.data).toEqual({
        couchFlagged: true,
        couchFlaggedBy: 'user-1',
      });
    });

    it('returns null quietly when the read fails (non-critical)', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockRejectedValue(new Error('offline'));

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useCouchFlagState('a1'), { wrapper });

      await act(async () => {});
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(result.current.data).toBeNull();
    });

    it('stays disabled without an assignmentId', () => {
      const { getDoc } = require('firebase/firestore');
      const { wrapper } = createClientAndWrapper();
      renderHook(() => useCouchFlagState(null), { wrapper });
      expect(getDoc).not.toHaveBeenCalled();
    });
  });

  describe('useCouchFlag (mutation)', () => {
    it('writes the flag fields and ADDS discussed: {} when the doc lacks it', async () => {
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(snap({ signal: 'steady' })); // no discussed field
      updateDoc.mockResolvedValue(undefined);

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useCouchFlag(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ assignmentId: 'a1' });
      });

      expect(updateDoc).toHaveBeenCalledWith('completion-ref', {
        couch_flagged: true,
        couch_flagged_by: 'user-1',
        couch_flagged_at: 'server-timestamp',
        updated_at: 'server-timestamp',
        discussed: {},
      });
      expect(logEvent).toHaveBeenCalledWith('couch_flagged', { assignment_id: 'a1' });
    });

    it('never touches an existing discussed map (field omitted from the write)', async () => {
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(
        snap({ signal: 'repair', discussed: { 'user-2': 'ts' } })
      );
      updateDoc.mockResolvedValue(undefined);

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useCouchFlag(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ assignmentId: 'a2' });
      });

      expect(updateDoc).toHaveBeenCalledWith('completion-ref', {
        couch_flagged: true,
        couch_flagged_by: 'user-1',
        couch_flagged_at: 'server-timestamp',
        updated_at: 'server-timestamp',
      });
    });

    it('an EMPTY existing discussed map still counts as present', async () => {
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(snap({ discussed: {} }));
      updateDoc.mockResolvedValue(undefined);

      const { wrapper } = createClientAndWrapper();
      const { result } = renderHook(() => useCouchFlag(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ assignmentId: 'a3' });
      });

      const written = updateDoc.mock.calls[0][1];
      expect('discussed' in written).toBe(false);
    });

    it('optimistically marks the flag-state cache, then invalidates couchFlag + hearth', async () => {
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(snap({}));
      let resolveUpdate: (() => void) | undefined;
      updateDoc.mockReturnValue(new Promise<void>((res) => { resolveUpdate = res; }));

      const { queryClient, wrapper } = createClientAndWrapper();
      queryClient.setQueryData(['couchFlag', 'a4'], {
        couchFlagged: false,
        couchFlaggedBy: null,
      });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCouchFlag(), { wrapper });
      act(() => {
        result.current.mutate({ assignmentId: 'a4' });
      });
      await act(async () => {});

      // Optimistic: the confirmation state shows before the write lands
      expect(
        queryClient.getQueryData<CouchFlagState>(['couchFlag', 'a4'])
      ).toEqual({ couchFlagged: true, couchFlaggedBy: 'user-1' });

      resolveUpdate?.();
      await act(async () => {});

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['couchFlag', 'a4'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['hearth', 'couple-1'] });
    });

    it('rolls back the optimistic flag and alerts quietly on failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      doc.mockReturnValue('completion-ref');
      getDoc.mockResolvedValue(snap({}));
      updateDoc.mockRejectedValue(new Error('offline'));

      const { queryClient, wrapper } = createClientAndWrapper();
      const previous: CouchFlagState = { couchFlagged: false, couchFlaggedBy: null };
      queryClient.setQueryData(['couchFlag', 'a5'], previous);

      const { result } = renderHook(() => useCouchFlag(), { wrapper });
      await act(async () => {
        await expect(
          result.current.mutateAsync({ assignmentId: 'a5' })
        ).rejects.toThrow('offline');
      });

      expect(queryClient.getQueryData(['couchFlag', 'a5'])).toEqual(previous);
      expect(logEvent).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not keep it',
        'Something went wrong. Please try again.'
      );
      alertSpy.mockRestore();
    });
  });
});
