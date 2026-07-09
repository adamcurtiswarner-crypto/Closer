/**
 * Unit tests for sendPushNotification (shared.ts) — Expo-only transport.
 *
 * Token routing contract:
 *   - Tokens matching ExponentPushToken[...] go to the Expo Push Service
 *     (https://exp.host/--/api/v2/push/send) in chunks of <= 100.
 *   - All other tokens are stale legacy entries (raw APNs/FCM registration
 *     tokens from old builds). They are NEVER sent to — they are pruned from
 *     the user's push_tokens via arrayRemove. admin.messaging() is dead.
 *   - DeviceNotRegistered Expo tickets are removed from push_tokens.
 *   - Transport and cleanup failures never throw out of sendPushNotification.
 */

const mockSendEach = jest.fn();
const mockUserGet = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('firebase-admin', () => {
  const firestoreFn = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockUserGet,
        update: mockUserUpdate,
        set: jest.fn(),
      })),
      add: jest.fn(),
    })),
  })) as jest.Mock & { FieldValue: Record<string, unknown> };
  firestoreFn.FieldValue = {
    arrayRemove: (...tokens: unknown[]) => ({ __op: 'arrayRemove', tokens }),
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return {
    initializeApp: jest.fn(),
    firestore: firestoreFn,
    messaging: jest.fn(() => ({ sendEach: mockSendEach })),
  };
});

import { sendPushNotification, isExpoPushToken } from '../shared';

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const NOTIFICATION = { title: 'Stoke', body: 'Alex answered today’s prompt.' };

const mockFetch = jest.fn();

function expoToken(id: string): string {
  return `ExponentPushToken[${id}]`;
}

function userDocWithTokens(tokens: unknown[]): void {
  mockUserGet.mockResolvedValue({
    exists: true,
    data: () => ({ push_tokens: tokens }),
  });
}

function okTickets(count: number): { data: Array<{ status: string; id: string }> } {
  return {
    data: Array.from({ length: count }, (_, i) => ({ status: 'ok', id: `ticket-${i}` })),
  };
}

function fetchResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

/** Parse the JSON body of the nth fetch call. */
function sentExpoMessages(callIndex = 0): Array<Record<string, unknown>> {
  const [, init] = mockFetch.mock.calls[callIndex];
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  jest.clearAllMocks();
  (global as { fetch: unknown }).fetch = mockFetch;
  mockUserUpdate.mockResolvedValue(undefined);
  mockSendEach.mockResolvedValue({ responses: [] });
  mockFetch.mockResolvedValue(fetchResponse(okTickets(1)));
});

describe('isExpoPushToken', () => {
  it('matches ExponentPushToken[...] strings', () => {
    expect(isExpoPushToken(expoToken('abc123'))).toBe(true);
  });

  it('rejects raw APNs/FCM device tokens', () => {
    expect(isExpoPushToken('a'.repeat(64))).toBe(false); // raw APNs hex
    expect(isExpoPushToken('fcm-registration-token:APA91b')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false); // empty id
    expect(isExpoPushToken('')).toBe(false);
  });
});

describe('sendPushNotification token partitioning', () => {
  it('sends Expo tokens to the Expo Push Service, not FCM', async () => {
    userDocWithTokens([expoToken('aaa')]);

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(EXPO_ENDPOINT);
    expect(mockSendEach).not.toHaveBeenCalled();
  });

  it('prunes non-Expo legacy tokens instead of sending to them', async () => {
    userDocWithTokens(['legacy-fcm-token-1', 'legacy-fcm-token-2']);

    await sendPushNotification('user-1', NOTIFICATION, { type: 'prompt' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendEach).not.toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: {
        __op: 'arrayRemove',
        tokens: ['legacy-fcm-token-1', 'legacy-fcm-token-2'],
      },
    });
  });

  it('sends Expo tokens and prunes legacy tokens for mixed-token users', async () => {
    userDocWithTokens([expoToken('aaa'), 'legacy-fcm-token', expoToken('bbb')]);
    mockFetch.mockResolvedValue(fetchResponse(okTickets(2)));

    await sendPushNotification('user-1', NOTIFICATION);

    const expoMessages = sentExpoMessages();
    expect(expoMessages.map((m) => m.to)).toEqual([expoToken('aaa'), expoToken('bbb')]);
    expect(mockSendEach).not.toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: ['legacy-fcm-token'] },
    });
  });

  it('never uses the FCM transport regardless of token shape', async () => {
    userDocWithTokens([
      'a'.repeat(64), // raw APNs hex
      'fcm-registration-token:APA91b',
      expoToken('live'),
    ]);

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockSendEach).not.toHaveBeenCalled();
    expect(sentExpoMessages().map((m) => m.to)).toEqual([expoToken('live')]);
  });

  it('filters out empty and non-string token entries without pruning writes', async () => {
    userDocWithTokens(['', null, 42, expoToken('aaa')]);

    await sendPushNotification('user-1', NOTIFICATION);

    expect(sentExpoMessages().map((m) => m.to)).toEqual([expoToken('aaa')]);
    expect(mockSendEach).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('does nothing when the user has no tokens or does not exist', async () => {
    userDocWithTokens([]);
    await sendPushNotification('user-1', NOTIFICATION);

    mockUserGet.mockResolvedValue({ exists: false, data: () => undefined });
    await sendPushNotification('missing-user', NOTIFICATION);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendEach).not.toHaveBeenCalled();
  });
});

describe('Expo push payload', () => {
  it('sends title, body, default sound, and data for each token', async () => {
    userDocWithTokens([expoToken('aaa')]);

    await sendPushNotification('user-1', NOTIFICATION, { type: 'partner_responded' });

    expect(sentExpoMessages()).toEqual([
      {
        to: expoToken('aaa'),
        title: NOTIFICATION.title,
        body: NOTIFICATION.body,
        sound: 'default',
        data: { type: 'partner_responded' },
      },
    ]);
  });

  it('omits the data field when no data is provided', async () => {
    userDocWithTokens([expoToken('aaa')]);

    await sendPushNotification('user-1', NOTIFICATION);

    expect(sentExpoMessages()[0]).not.toHaveProperty('data');
  });
});

describe('Expo push chunking', () => {
  it('chunks requests at 100 messages', async () => {
    const tokens = Array.from({ length: 150 }, (_, i) => expoToken(`t${i}`));
    userDocWithTokens(tokens);
    mockFetch
      .mockResolvedValueOnce(fetchResponse(okTickets(100)))
      .mockResolvedValueOnce(fetchResponse(okTickets(50)));

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(sentExpoMessages(0)).toHaveLength(100);
    expect(sentExpoMessages(1)).toHaveLength(50);
    expect(sentExpoMessages(1)[0].to).toBe(expoToken('t100'));
  });

  it('sends a single request for exactly 100 tokens', async () => {
    userDocWithTokens(Array.from({ length: 100 }, (_, i) => expoToken(`t${i}`)));
    mockFetch.mockResolvedValue(fetchResponse(okTickets(100)));

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sentExpoMessages(0)).toHaveLength(100);
  });
});

describe('DeviceNotRegistered cleanup', () => {
  it('removes tokens whose tickets come back DeviceNotRegistered', async () => {
    userDocWithTokens([expoToken('dead'), expoToken('alive')]);
    mockFetch.mockResolvedValue(
      fetchResponse({
        data: [
          { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
          { status: 'ok', id: 'ticket-1' },
        ],
      })
    );

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: [expoToken('dead')] },
    });
  });

  it('does not remove tokens for other ticket errors', async () => {
    userDocWithTokens([expoToken('throttled')]);
    mockFetch.mockResolvedValue(
      fetchResponse({
        data: [
          { status: 'error', message: 'rate limited', details: { error: 'MessageRateExceeded' } },
        ],
      })
    );

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('prunes legacy tokens and removes dead Expo tokens independently', async () => {
    userDocWithTokens([expoToken('dead'), 'dead-fcm-token']);
    mockFetch.mockResolvedValue(
      fetchResponse({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      })
    );

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockSendEach).not.toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: ['dead-fcm-token'] },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: [expoToken('dead')] },
    });
  });

  it('still sends to Expo tokens when the legacy prune write fails', async () => {
    userDocWithTokens(['stale-legacy', expoToken('live')]);
    mockUserUpdate.mockRejectedValue(new Error('firestore down'));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();

    expect(sentExpoMessages().map((m) => m.to)).toEqual([expoToken('live')]);
  });
});

describe('error posture — sendPushNotification never throws', () => {
  it('swallows Expo transport failures', async () => {
    userDocWithTokens([expoToken('aaa')]);
    mockFetch.mockRejectedValue(new Error('network down'));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('swallows non-2xx Expo responses without cleanup', async () => {
    userDocWithTokens([expoToken('aaa')]);
    mockFetch.mockResolvedValue(fetchResponse({}, false, 500));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('continues to the next chunk after a failed chunk', async () => {
    userDocWithTokens(Array.from({ length: 101 }, (_, i) => expoToken(`t${i}`)));
    mockFetch
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(
        fetchResponse({
          data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
        })
      );

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: [expoToken('t100')] },
    });
  });

  it('swallows legacy-token prune failures', async () => {
    userDocWithTokens(['legacy-fcm-token']);
    mockUserUpdate.mockRejectedValue(new Error('firestore down'));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendEach).not.toHaveBeenCalled();
  });

  it('swallows Firestore cleanup failures', async () => {
    userDocWithTokens([expoToken('dead')]);
    mockFetch.mockResolvedValue(
      fetchResponse({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      })
    );
    mockUserUpdate.mockRejectedValue(new Error('firestore down'));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();
  });
});
