/**
 * Device-calendar helpers kept for the HIDDEN date-nights feature.
 * The v1 "Sync to calendar" feature (anniversary + daily prompt reminder)
 * was removed 2026-07-12 — only permission, calendar creation, and
 * date-night event creation remain.
 */
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getSourcesAsync: jest.fn(),
  createCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
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
  addDateNightEvent,
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
          color: '#D4522A',
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

  describe('addDateNightEvent', () => {
    it('creates a 2-hour timed event when a time is given', async () => {
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-1');

      const eventId = await addDateNightEvent(
        'cal-1',
        'Dinner out',
        new Date('2026-07-20T00:00:00'),
        '19:30'
      );

      expect(eventId).toBe('event-1');
      const [calendarId, event] = (Calendar.createEventAsync as jest.Mock).mock
        .calls[0];
      expect(calendarId).toBe('cal-1');
      expect(event.title).toBe('Date Night: Dinner out');
      expect(event.allDay).toBe(false);
      expect(event.startDate.getHours()).toBe(19);
      expect(event.startDate.getMinutes()).toBe(30);
      expect(event.endDate.getHours()).toBe(21);
    });

    it('creates an all-day event when no time is given', async () => {
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-2');

      const eventId = await addDateNightEvent(
        'cal-1',
        'Picnic',
        new Date('2026-07-20T00:00:00'),
        null
      );

      expect(eventId).toBe('event-2');
      const [, event] = (Calendar.createEventAsync as jest.Mock).mock.calls[0];
      expect(event.title).toBe('Date Night: Picnic');
      expect(event.allDay).toBe(true);
    });

    it('returns null instead of throwing when event creation fails', async () => {
      (Calendar.createEventAsync as jest.Mock).mockRejectedValue(
        new Error('calendar unavailable')
      );

      const eventId = await addDateNightEvent(
        'cal-1',
        'Dinner out',
        new Date('2026-07-20T00:00:00'),
        '19:30'
      );

      expect(eventId).toBeNull();
    });
  });
});
