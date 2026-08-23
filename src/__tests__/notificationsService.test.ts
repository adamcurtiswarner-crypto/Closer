/**
 * Tests for the push registration flow (src/services/notifications.ts).
 *
 * Regression contract: registration must store an Expo Push Service token
 * (ExponentPushToken[...]) — NEVER a raw APNs/FCM device token. The server
 * sends through https://exp.host, which only accepts Expo tokens; a raw
 * iOS device token would silently break every push for that user.
 */

const EXPO_TOKEN = 'ExponentPushToken[test-token-1]';
const PROJECT_ID = 'ed4dbe48-8597-4a51-8580-3402ea568d2f';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockGetDevicePushTokenAsync = jest.fn();
const mockAddPushTokenListener = jest.fn();
const mockAddResponseListener = jest.fn((_listener: unknown) => ({ remove: jest.fn() }));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getExpoPushTokenAsync: (options?: { projectId?: string }) =>
    mockGetExpoPushTokenAsync(options),
  getDevicePushTokenAsync: () => mockGetDevicePushTokenAsync(),
  addPushTokenListener: (listener: unknown) => mockAddPushTokenListener(listener),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: (listener: unknown) =>
    mockAddResponseListener(listener),
  setNotificationChannelAsync: jest.fn(),
  PermissionStatus: { UNDETERMINED: 'undetermined', GRANTED: 'granted', DENIED: 'denied' },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { eas: { projectId: 'ed4dbe48-8597-4a51-8580-3402ea568d2f' } },
    },
    easConfig: null,
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({
    path: `${collection}/${id}`,
  })),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  arrayUnion: (value: unknown) => ({ __op: 'arrayUnion', value }),
  arrayRemove: (value: unknown) => ({ __op: 'arrayRemove', value }),
  serverTimestamp: () => ({ __op: 'serverTimestamp' }),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

// The shared AsyncStorage mock is a no-op stub (getItem always resolves
// null), which cannot exercise the cross-launch path unregisterPushToken
// depends on. This suite needs storage that actually stores.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  PUSH_TOKEN_CACHE_KEY,
  registerForPushNotifications,
  registerPushIfAlreadyGranted,
  setupNotificationHandlers,
  unregisterPushToken,
} from '../services/notifications';

function grantPermissions(): void {
  mockGetPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  grantPermissions();
  mockGetExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: EXPO_TOKEN });
  mockUpdateDoc.mockResolvedValue(undefined);
});

describe('registerForPushNotifications', () => {
  it('registers an Expo push token with the EAS projectId from config', async () => {
    const token = await registerForPushNotifications('user-1');

    expect(token).toBe(EXPO_TOKEN);
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: PROJECT_ID });
    // The raw device token API must not be the source of the stored token
    expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it('stores the Expo token additively via arrayUnion (never wipes the array)', async () => {
    await registerForPushNotifications('user-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      expect.objectContaining({
        push_tokens: { __op: 'arrayUnion', value: EXPO_TOKEN },
      })
    );
  });

  it('returns null without registering when permission is denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });

    const token = await registerForPushNotifications('user-1');

    expect(token).toBeNull();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('re-mints an Expo token (not the raw device token) when the token rotates', async () => {
    const rotatedExpoToken = 'ExponentPushToken[rotated-token-2]';
    await registerForPushNotifications('user-1');

    expect(mockAddPushTokenListener).toHaveBeenCalledTimes(1);
    const listener = mockAddPushTokenListener.mock.calls[0][0] as (
      token: { data: string }
    ) => Promise<void>;

    mockGetExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: rotatedExpoToken });
    await listener({ data: 'raw-apns-device-token' });

    // New Expo token stored, old Expo token removed — raw token never written
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      expect.objectContaining({
        push_tokens: { __op: 'arrayUnion', value: rotatedExpoToken },
      })
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      { push_tokens: { __op: 'arrayRemove', value: EXPO_TOKEN } }
    );
    const writtenTokens = mockUpdateDoc.mock.calls
      .map(([, update]) => (update as { push_tokens?: { value?: string } }).push_tokens?.value)
      .filter(Boolean);
    expect(writtenTokens).not.toContain('raw-apns-device-token');
  });

  it('does not rewrite Firestore when the refreshed token is unchanged', async () => {
    await registerForPushNotifications('user-1');
    const listener = mockAddPushTokenListener.mock.calls[0][0] as (
      token: { data: string }
    ) => Promise<void>;
    mockUpdateDoc.mockClear();

    await listener({ data: 'raw-apns-device-token' });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('returns null instead of throwing when token fetch fails', async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error('offline'));

    await expect(registerForPushNotifications('user-1')).resolves.toBeNull();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('notification tap routing', () => {
  function tapWith(data: Record<string, unknown>): void {
    setupNotificationHandlers();
    const listener = mockAddResponseListener.mock.calls.at(-1)![0] as (
      response: unknown
    ) => void;
    listener({ notification: { request: { content: { data } } } });
  }

  it('routes daily prompt taps to Today', () => {
    tapWith({ type: 'partner_responded' });
    expect(router.push).toHaveBeenCalledWith('/(app)/today');
  });

  it('routes explore_question taps to the explore tab with respond deep-link params', () => {
    tapWith({
      type: 'explore_question',
      assignment_id: 'assign-1',
      prompt_id: 'prompt-1',
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(app)/explore',
      params: { assignmentId: 'assign-1', promptId: 'prompt-1' },
    });
  });

  it('routes explore_complete taps to the explore tab with the assignment param', () => {
    tapWith({ type: 'explore_complete', assignment_id: 'assign-1' });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(app)/explore',
      params: { assignmentId: 'assign-1' },
    });
  });

  it('falls back to a bare explore tab when deep-link params are missing or invalid', () => {
    tapWith({ type: 'explore_question', assignment_id: 42 });
    expect(router.push).toHaveBeenCalledWith('/(app)/explore');
  });
});

describe('registerPushIfAlreadyGranted', () => {
  it('registers silently when permission is already granted', async () => {
    const token = await registerPushIfAlreadyGranted('user-1');

    expect(token).toBe(EXPO_TOKEN);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('never prompts when permission is undetermined', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined' });

    const token = await registerPushIfAlreadyGranted('user-1');

    expect(token).toBeNull();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Sign-out must hand the device token back
// ---------------------------------------------------------------------------

describe('unregisterPushToken', () => {
  /*
   * The prod defect (2026-08-23): an Expo push token addresses a DEVICE, not
   * an account, and sign-out never removed it. Every account ever signed in
   * on a phone stayed addressable from that phone, so one device received a
   * copy of the daily prompt for each of them — three identical pushes back
   * to back for the founder. A July scrub of 10 stale tokens grew straight
   * back for the same reason.
   */
  it('removes this device token from the signing-out user', async () => {
    await registerForPushNotifications('user-1');
    mockUpdateDoc.mockClear();

    await unregisterPushToken('user-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      expect.objectContaining({
        push_tokens: { __op: 'arrayRemove', value: EXPO_TOKEN },
      })
    );
  });

  it('never calls the network — sign-out must not wait on Expo', async () => {
    // Deliberately cache-only. getExpoPushTokenAsync is a round trip to
    // Expo's servers; a hung or offline call here would stall sign-out,
    // which is the one flow that must always work.
    await registerForPushNotifications('user-1');
    mockGetExpoPushTokenAsync.mockClear();

    await unregisterPushToken('user-1');

    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('reads the token from storage when this launch never registered', async () => {
    // Registration happens at launch, but a user who signed in on a previous
    // launch and is offline this time still has to hand the token back.
    await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, EXPO_TOKEN);

    await unregisterPushToken('user-2');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-2' },
      expect.objectContaining({
        push_tokens: { __op: 'arrayRemove', value: EXPO_TOKEN },
      })
    );
  });

  it('does nothing when this device has no token to hand back', async () => {
    await unregisterPushToken('user-3');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('resolves even when the Firestore write fails — sign-out is never blocked', async () => {
    await registerForPushNotifications('user-1');
    mockUpdateDoc.mockRejectedValue(new Error('offline'));

    await expect(unregisterPushToken('user-1')).resolves.toBeUndefined();
  });

  it('forgets the cached token, so a second sign-out is a no-op', async () => {
    await registerForPushNotifications('user-1');
    await unregisterPushToken('user-1');
    mockUpdateDoc.mockClear();

    await unregisterPushToken('user-1');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY)).toBeNull();
  });
});
