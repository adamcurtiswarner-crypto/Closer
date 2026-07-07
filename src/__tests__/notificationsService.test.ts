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

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getExpoPushTokenAsync: (options?: { projectId?: string }) =>
    mockGetExpoPushTokenAsync(options),
  getDevicePushTokenAsync: () => mockGetDevicePushTokenAsync(),
  addPushTokenListener: (listener: unknown) => mockAddPushTokenListener(listener),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
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

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

import {
  registerForPushNotifications,
  registerPushIfAlreadyGranted,
} from '../services/notifications';

function grantPermissions(): void {
  mockGetPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
}

beforeEach(() => {
  jest.clearAllMocks();
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
