jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getSourcesAsync: jest.fn(),
  createCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
  deleteCalendarAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
  Frequency: { YEARLY: 'yearly', DAILY: 'daily' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}));

import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestCalendarPermission,
  getOrCreateStokeCalendar,
  syncCalendar,
  removeStokeCalendar,
  isSynced,
} from '../services/calendar';

describe('calendar service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCalendarPermission', () => {
    it('returns true when granted', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      const result = await requestCalendarPermission();
      expect(result).toBe(true);
    });

    it('returns false when denied', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      const result = await requestCalendarPermission();
      expect(result).toBe(false);
    });
  });

  describe('getOrCreateStokeCalendar', () => {
    it('creates calendar with correct color', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Calendar.getSourcesAsync as jest.Mock).mockResolvedValue([
        { id: 'src-1', type: 'local' },
      ]);
      (Calendar.createCalendarAsync as jest.Mock).mockResolvedValue('cal-123');

      const calendarId = await getOrCreateStokeCalendar();

      expect(calendarId).toBe('cal-123');
      expect(Calendar.createCalendarAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Stoke',
          color: '#c97454',
        })
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'stoke_calendar_id',
        'cal-123'
      );
    });

    it('returns existing ID from AsyncStorage if present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('existing-cal');
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'existing-cal' },
      ]);

      const calendarId = await getOrCreateStokeCalendar();

      expect(calendarId).toBe('existing-cal');
      expect(Calendar.createCalendarAsync).not.toHaveBeenCalled();
    });
  });

  describe('syncCalendar', () => {
    it('creates events for anniversary and prompt reminder', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cal-1');
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([{ id: 'cal-1' }]);
      (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([]);

      await syncCalendar({
        anniversaryDate: new Date('2023-06-15'),
        partnerName: 'Alex',
        notificationTime: '19:00',
      });

      // Should create anniversary event and prompt reminder
      expect(Calendar.createEventAsync).toHaveBeenCalledTimes(2);
      expect(Calendar.createEventAsync).toHaveBeenCalledWith(
        'cal-1',
        expect.objectContaining({
          title: 'Anniversary with Alex',
        })
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'stoke_calendar_synced',
        'true'
      );
    });
  });

  describe('removeStokeCalendar', () => {
    it('deletes calendar and clears AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cal-to-delete');

      await removeStokeCalendar();

      expect(Calendar.deleteCalendarAsync).toHaveBeenCalledWith('cal-to-delete');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('stoke_calendar_id');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('stoke_calendar_synced');
    });
  });

  describe('isSynced', () => {
    it('returns true when synced', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      expect(await isSynced()).toBe(true);
    });

    it('returns false when not synced', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      expect(await isSynced()).toBe(false);
    });
  });
});
