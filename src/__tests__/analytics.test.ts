jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-event-id' }),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

import { setAnalyticsContext, logEvent } from '../services/analytics';
import { addDoc, collection } from 'firebase/firestore';

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs event with correct structure', async () => {
    await logEvent('session_started');

    expect(collection).toHaveBeenCalledWith({}, 'events');
    expect(addDoc).toHaveBeenCalledWith(
      undefined, // collection returns undefined due to mock
      expect.objectContaining({
        event_name: 'session_started',
        platform: 'ios',
        timestamp: 'mock-timestamp',
        properties: {},
      })
    );
  });

  it('includes context after setAnalyticsContext', async () => {
    setAnalyticsContext({ user_id: 'user-123', couple_id: 'couple-456' });
    await logEvent('prompt_viewed', { assignment_id: 'a1' });

    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        event_name: 'prompt_viewed',
        user_id: 'user-123',
        couple_id: 'couple-456',
        properties: { assignment_id: 'a1' },
      })
    );
  });

  it('does not throw on Firestore error', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await expect(logEvent('session_started')).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Analytics event failed:',
      'session_started',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
