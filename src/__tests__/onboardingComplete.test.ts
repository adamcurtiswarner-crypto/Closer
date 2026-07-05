import { completeOnboarding } from '@/utils/onboarding';
import { updateDoc } from 'firebase/firestore';
import { logEvent } from '@/services/analytics';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collectionName, id) => ({ path: `${collectionName}/${id}` })),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

const mockUpdateDoc = updateDoc as jest.Mock;
const mockLogEvent = logEvent as jest.Mock;

describe('completeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('marks the user as onboarded', async () => {
    await completeOnboarding('user-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      expect.objectContaining({
        is_onboarded: true,
        onboarding_completed_at: 'server-timestamp',
        updated_at: 'server-timestamp',
      })
    );
  });

  it('does not write notification_time unless provided', async () => {
    await completeOnboarding('user-1');

    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload).not.toHaveProperty('notification_time');
  });

  it('writes the chosen prompt time when provided', async () => {
    await completeOnboarding('user-1', { notificationTime: '08:00' });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      expect.objectContaining({
        is_onboarded: true,
        notification_time: '08:00',
      })
    );
  });

  it('logs completion without the skip flag by default', async () => {
    await completeOnboarding('user-1');

    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_completed', {
      skipped_invite: false,
    });
  });

  describe('skip path (invite screen "Skip for now")', () => {
    it('still sets is_onboarded so Today does not bounce the user back', async () => {
      await completeOnboarding('user-1', { skippedInvite: true });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: 'users/user-1' },
        expect.objectContaining({ is_onboarded: true })
      );
      expect(mockLogEvent).toHaveBeenCalledWith('onboarding_completed', {
        skipped_invite: true,
      });
    });

    it('propagates write failures so the screen can keep the user in place', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('offline'));

      await expect(
        completeOnboarding('user-1', { skippedInvite: true })
      ).rejects.toThrow('offline');
      expect(mockLogEvent).not.toHaveBeenCalled();
    });
  });
});
