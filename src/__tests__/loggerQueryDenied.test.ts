/**
 * Tests for logger.reportQueryDenied (src/utils/logger.ts).
 *
 * Contract: every call logs (console in dev); a Firestore
 * 'permission-denied' error ADDITIONALLY writes a sanitized `client_error`
 * event doc to /events — context string + error code only, never the error
 * message (which can quote document data) and never response text. No
 * signed-in user -> no event write (rules require user_id == auth.uid).
 */

const mockAuth: { currentUser: { uid: string } | null } = {
  currentUser: { uid: 'user-1' },
};

jest.mock('@/config/firebase', () => ({
  db: {},
  auth: mockAuth,
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'events-collection'),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-event-id' }),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { logger } from '../utils/logger';
import { addDoc, collection } from 'firebase/firestore';

function permissionDenied(): Error & { code: string } {
  const err = new Error(
    'Missing or insufficient permissions.'
  ) as Error & { code: string };
  err.code = 'permission-denied';
  return err;
}

describe('logger.reportQueryDenied', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { uid: 'user-1' };
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('writes a sanitized client_error event on permission-denied', async () => {
    await logger.reportQueryDenied('useHearth.listener', permissionDenied());

    expect(collection).toHaveBeenCalledWith({}, 'events');
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(
      'events-collection',
      expect.objectContaining({
        event_name: 'client_error',
        user_id: 'user-1',
        platform: 'ios',
        properties: { context: 'useHearth.listener', code: 'permission-denied' },
      })
    );
  });

  it('never puts the error message (potential document data) in the event', async () => {
    const err = permissionDenied();
    err.message = 'quoted response text that must not leak';
    await logger.reportQueryDenied('usePrompt.flushOfflineQueue', err);

    const written = (addDoc as jest.Mock).mock.calls[0][1];
    expect(JSON.stringify(written)).not.toContain('quoted response text');
  });

  it('does not write an event for non-permission errors (still logs)', async () => {
    await logger.reportQueryDenied('useHearth.listener', new Error('network down'));

    expect(addDoc).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('skips the event write when no user is signed in', async () => {
    mockAuth.currentUser = null;
    await logger.reportQueryDenied('useHearth.listener', permissionDenied());

    expect(addDoc).not.toHaveBeenCalled();
  });

  it('never throws even when the event write fails', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(
      logger.reportQueryDenied('useHearth.listener', permissionDenied())
    ).resolves.toBeUndefined();
  });

  it('tolerates non-Error values', async () => {
    await expect(
      logger.reportQueryDenied('ctx', 'string failure')
    ).resolves.toBeUndefined();
    expect(addDoc).not.toHaveBeenCalled();
  });
});
