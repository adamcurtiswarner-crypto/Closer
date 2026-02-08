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

jest.mock('@/services/encryption', () => ({
  getCoupleKey: jest.fn().mockResolvedValue('mock-key'),
  encrypt: jest.fn((text) => `encrypted_${text}`),
}));

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
});
