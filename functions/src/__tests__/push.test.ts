/**
 * Unit tests for sendPushNotification (shared.ts) — Expo Push Service +
 * legacy FCM transport branching.
 *
 * Token routing contract:
 *   - Tokens matching ExponentPushToken[...] go to the Expo Push Service
 *     (https://exp.host/--/api/v2/push/send) in chunks of <= 100.
 *   - All other tokens (legacy raw FCM registration tokens) go through
 *     admin.messaging().sendEach() exactly as before.
 *   - DeviceNotRegistered Expo tickets and invalid FCM tokens are removed
 *     from the user's push_tokens array.
 *   - Transport failures never throw out of sendPushNotification.
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

  it('sends non-Expo tokens through the existing FCM path untouched', async () => {
    userDocWithTokens(['legacy-fcm-token-1', 'legacy-fcm-token-2']);
    mockSendEach.mockResolvedValue({ responses: [{}, {}] });

    await sendPushNotification('user-1', NOTIFICATION, { type: 'prompt' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendEach).toHaveBeenCalledTimes(1);
    expect(mockSendEach).toHaveBeenCalledWith([
      { token: 'legacy-fcm-token-1', notification: NOTIFICATION, data: { type: 'prompt' } },
      { token: 'legacy-fcm-token-2', notification: NOTIFICATION, data: { type: 'prompt' } },
    ]);
  });

  it('splits mixed-token users across both transports', async () => {
    userDocWithTokens([expoToken('aaa'), 'legacy-fcm-token', expoToken('bbb')]);
    mockFetch.mockResolvedValue(fetchResponse(okTickets(2)));
    mockSendEach.mockResolvedValue({ responses: [{}] });

    await sendPushNotification('user-1', NOTIFICATION);

    const expoMessages = sentExpoMessages();
    expect(expoMessages.map((m) => m.to)).toEqual([expoToken('aaa'), expoToken('bbb')]);
    expect(mockSendEach).toHaveBeenCalledWith([
      { token: 'legacy-fcm-token', notification: NOTIFICATION },
    ]);
  });

  it('filters out empty and non-string token entries', async () => {
    userDocWithTokens(['', null, 42, expoToken('aaa')]);

    await sendPushNotification('user-1', NOTIFICATION);

    expect(sentExpoMessages().map((m) => m.to)).toEqual([expoToken('aaa')]);
    expect(mockSendEach).not.toHaveBeenCalled();
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

  it('cleans up invalid tokens on both transports for mixed-token users', async () => {
    userDocWithTokens([expoToken('dead'), 'dead-fcm-token']);
    mockFetch.mockResolvedValue(
      fetchResponse({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      })
    );
    mockSendEach.mockResolvedValue({
      responses: [{ error: { code: 'messaging/registration-token-not-registered' } }],
    });

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: [expoToken('dead')] },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: ['dead-fcm-token'] },
    });
  });

  it('keeps the FCM invalid-token cleanup untouched for non-expo tokens', async () => {
    userDocWithTokens(['valid-fcm', 'invalid-fcm']);
    mockSendEach.mockResolvedValue({
      responses: [{}, { error: { code: 'messaging/invalid-registration-token' } }],
    });

    await sendPushNotification('user-1', NOTIFICATION);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      push_tokens: { __op: 'arrayRemove', tokens: ['invalid-fcm'] },
    });
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

  it('swallows FCM transport failures', async () => {
    userDocWithTokens(['legacy-fcm-token']);
    mockSendEach.mockRejectedValue(new Error('fcm down'));

    await expect(sendPushNotification('user-1', NOTIFICATION)).resolves.toBeUndefined();
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
