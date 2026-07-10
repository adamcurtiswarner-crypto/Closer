/**
 * useCouple hook tests — trust-cluster changes:
 *
 * - useAcceptInvite now calls the acceptInvite callable (invite acceptance
 *   is server-side; clients can no longer read/update stranger invites) and
 *   force-refreshes the ID token so the new coupleId custom claim reaches
 *   Storage rules immediately.
 * - useDisconnectPartner now calls the unlinkCouple callable (users docs
 *   are owner-write-only, so the old client-side unlink left the partner
 *   half-linked) and force-refreshes the token to drop the claim.
 * - useCouple self-heals a missing/stale coupleId claim for active couples
 *   (covers the inviter, whose claim is set by the partner's device).
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('firebase/auth', () => ({
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

const mockCurrentUser = { uid: 'user-1' };

jest.mock('@/config/firebase', () => ({
  auth: { get currentUser() { return mockCurrentUser; } },
  db: {},
  functions: {},
}));

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
let mockUser: { id: string; coupleId: string | null; email?: string } | null = {
  id: 'user-1',
  coupleId: null,
  email: 'me@example.com',
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: mockRefreshUser,
  }),
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('@/config/app', () => ({
  getShareMessage: jest.fn(() => 'share message'),
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDoc } from 'firebase/firestore';
import { getIdToken, getIdTokenResult } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useCouple, useAcceptInvite, useDisconnectPartner } from '../hooks/useCouple';

const mockHttpsCallable = httpsCallable as jest.Mock;
const mockGetIdToken = getIdToken as jest.Mock;
const mockGetIdTokenResult = getIdTokenResult as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'user-1', coupleId: null, email: 'me@example.com' };
  mockGetIdToken.mockResolvedValue('fresh-token');
  mockGetIdTokenResult.mockResolvedValue({ claims: {} });
});

// ---------------------------------------------------------------------------
// useAcceptInvite → acceptInvite callable
// ---------------------------------------------------------------------------

describe('useAcceptInvite', () => {
  it('calls the acceptInvite callable with the uppercased code', async () => {
    const callable = jest.fn().mockResolvedValue({ data: { coupleId: 'couple-9' } });
    mockHttpsCallable.mockReturnValue(callable);

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: createWrapper() });

    let outcome: { coupleId: string } | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync('abc234');
    });

    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'acceptInvite');
    expect(callable).toHaveBeenCalledWith({ code: 'ABC234' });
    expect(outcome).toEqual({ coupleId: 'couple-9' });
  });

  it('force-refreshes the ID token (claim pickup) and refreshes the user', async () => {
    mockHttpsCallable.mockReturnValue(
      jest.fn().mockResolvedValue({ data: { coupleId: 'couple-9' } })
    );

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('ABC234');
    });

    expect(mockGetIdToken).toHaveBeenCalledWith(mockCurrentUser, true);
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('propagates the callable error message (screen maps it by substring)', async () => {
    mockHttpsCallable.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('This invite has expired'))
    );

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: createWrapper() });
    await act(async () => {
      await expect(result.current.mutateAsync('ABC234')).rejects.toThrow(
        'This invite has expired'
      );
    });
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('still succeeds when the token refresh fails (best-effort)', async () => {
    mockHttpsCallable.mockReturnValue(
      jest.fn().mockResolvedValue({ data: { coupleId: 'couple-9' } })
    );
    mockGetIdToken.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: createWrapper() });
    let outcome: { coupleId: string } | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync('ABC234');
    });
    expect(outcome).toEqual({ coupleId: 'couple-9' });
    expect(mockRefreshUser).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDisconnectPartner → unlinkCouple callable
// ---------------------------------------------------------------------------

describe('useDisconnectPartner', () => {
  it('calls the unlinkCouple callable and refreshes token + user', async () => {
    mockUser = { id: 'user-1', coupleId: 'couple-9' };
    const callable = jest.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(callable);

    const { result } = renderHook(() => useDisconnectPartner(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'unlinkCouple');
    expect(callable).toHaveBeenCalled();
    expect(mockGetIdToken).toHaveBeenCalledWith(mockCurrentUser, true);
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('rejects when the user is not in a couple (no callable hit)', async () => {
    mockUser = { id: 'user-1', coupleId: null };
    const callable = jest.fn();
    mockHttpsCallable.mockReturnValue(callable);

    const { result } = renderHook(() => useDisconnectPartner(), { wrapper: createWrapper() });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Not in a couple');
    });
    expect(callable).not.toHaveBeenCalled();
  });

  it('propagates a server failure', async () => {
    mockUser = { id: 'user-1', coupleId: 'couple-9' };
    mockHttpsCallable.mockReturnValue(jest.fn().mockRejectedValue(new Error('internal')));

    const { result } = renderHook(() => useDisconnectPartner(), { wrapper: createWrapper() });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('internal');
    });
  });
});

// ---------------------------------------------------------------------------
// useCouple claim self-heal
// ---------------------------------------------------------------------------

describe('useCouple claim self-heal', () => {
  function seedCouple(status: string) {
    mockUser = { id: 'user-1', coupleId: 'couple-9' };
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'couple-9',
      data: () => ({
        member_ids: ['user-1', 'user-2'],
        status,
      }),
    });
  }

  // Global fake timers are on; react-query batches result notifications on a
  // setTimeout(0). Alternate microtask flushes with timer advances so the
  // queryFn resolves AND the notification timer fires.
  async function flushQuery() {
    for (let i = 0; i < 3; i++) {
      await act(async () => {});
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
    }
  }

  it('force-refreshes the token when an active couple claim is missing', async () => {
    seedCouple('active');
    mockGetIdTokenResult.mockResolvedValue({ claims: {} });

    const { result } = renderHook(() => useCouple(), { wrapper: createWrapper() });
    await flushQuery();

    expect(result.current.data?.id).toBe('couple-9');
    expect(mockGetIdTokenResult).toHaveBeenCalledWith(mockCurrentUser);
    expect(mockGetIdToken).toHaveBeenCalledWith(mockCurrentUser, true);
  });

  it('does not refresh when the claim already matches', async () => {
    seedCouple('active');
    mockGetIdTokenResult.mockResolvedValue({ claims: { coupleId: 'couple-9' } });

    const { result } = renderHook(() => useCouple(), { wrapper: createWrapper() });
    await flushQuery();

    expect(result.current.data?.id).toBe('couple-9');
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });

  it('does not touch the token for non-active couples', async () => {
    seedCouple('pending');

    const { result } = renderHook(() => useCouple(), { wrapper: createWrapper() });
    await flushQuery();

    expect(result.current.data?.status).toBe('pending');
    expect(mockGetIdTokenResult).not.toHaveBeenCalled();
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });
});
