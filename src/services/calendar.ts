import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const CALENDAR_ID_KEY = 'stoke_calendar_id';
const CALENDAR_SYNCED_KEY = 'stoke_calendar_synced';

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getOrCreateStokeCalendar(): Promise<string> {
  // Check if we already have a calendar saved
  const existingId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
  if (existingId) {
    // Verify it still exists
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.some((c) => c.id === existingId)) {
        return existingId;
      }
    } catch {
      // Calendar was deleted, create a new one
    }
  }

  // Get default calendar source
  let defaultSource: Calendar.Source | undefined;

  if (Platform.OS === 'ios') {
    const sources = await Calendar.getSourcesAsync();
    defaultSource = sources.find((s) => s.type === 'caldav') ||
      sources.find((s) => s.type === 'local') ||
      sources[0];
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: 'Stoke',
    color: '#ef5323',
    entityType: Calendar.EntityTypes.EVENT,
    ...(Platform.OS === 'ios' && defaultSource
      ? { sourceId: defaultSource.id }
      : {
          source: {
            isLocalAccount: true,
            name: 'Stoke',
            type: Calendar.SourceType?.LOCAL,
          },
          name: 'Stoke',
          ownerAccount: 'stoke',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        }),
  });

  await AsyncStorage.setItem(CALENDAR_ID_KEY, calendarId);
  return calendarId;
}

export async function addAnniversaryEvent(
  calendarId: string,
  date: Date,
  partnerName: string
): Promise<void> {
  await Calendar.createEventAsync(calendarId, {
    title: `Anniversary with ${partnerName}`,
    startDate: date,
    endDate: date,
    allDay: true,
    recurrenceRule: {
      frequency: Calendar.Frequency.YEARLY,
    },
    alarms: [{ relativeOffset: -1440 }], // 1 day before (in minutes)
    notes: 'Added by Stoke',
  });
}

export async function addDateNightEvent(
  calendarId: string,
  title: string,
  date: Date,
  time?: string | null
): Promise<string | null> {
  try {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: `Date Night: ${title}`,
        startDate,
        endDate,
        allDay: false,
        alarms: [{ relativeOffset: -60 }], // 1 hour before
        notes: 'Added by Stoke',
      });
      return eventId;
    }

    // All-day event when no time is specified
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `Date Night: ${title}`,
      startDate: date,
      endDate: date,
      allDay: true,
      alarms: [{ relativeOffset: -1440 }], // 1 day before
      notes: 'Added by Stoke',
    });
    return eventId;
  } catch (error) {
    logger.warn('Error creating date night calendar event:', error);
    return null;
  }
}

export async function addPromptReminder(
  calendarId: string,
  notificationTime: string
): Promise<void> {
  const [hours, minutes] = notificationTime.split(':').map(Number);

  // Start from today
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, start tomorrow
  if (startDate < new Date()) {
    startDate.setDate(startDate.getDate() + 1);
  }

  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 15);

  await Calendar.createEventAsync(calendarId, {
    title: 'Stoke prompt time',
    startDate,
    endDate,
    recurrenceRule: {
      frequency: Calendar.Frequency.DAILY,
    },
    alarms: [{ relativeOffset: 0 }],
    notes: 'Your daily relationship prompt is ready',
  });
}

export async function syncCalendar({
  anniversaryDate,
  partnerName,
  notificationTime,
}: {
  anniversaryDate?: Date | null;
  partnerName: string;
  notificationTime: string;
}): Promise<void> {
  const calendarId = await getOrCreateStokeCalendar();

  // Clear existing Stoke events
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAhead = new Date(now);
  twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);

  try {
    const existingEvents = await Calendar.getEventsAsync(
      [calendarId],
      oneYearAgo,
      twoYearsAhead
    );
    for (const event of existingEvents) {
      await Calendar.deleteEventAsync(event.id);
    }
  } catch (error) {
    logger.warn('Error clearing old calendar events:', error);
  }

  // Add anniversary event
  if (anniversaryDate) {
    await addAnniversaryEvent(calendarId, anniversaryDate, partnerName);
  }

  // Add daily prompt reminder
  await addPromptReminder(calendarId, notificationTime);

  await AsyncStorage.setItem(CALENDAR_SYNCED_KEY, 'true');
}

export async function isSynced(): Promise<boolean> {
  const value = await AsyncStorage.getItem(CALENDAR_SYNCED_KEY);
  return value === 'true';
}

export async function removeStokeCalendar(): Promise<void> {
  const calendarId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
  if (calendarId) {
    try {
      await Calendar.deleteCalendarAsync(calendarId);
    } catch (error) {
      logger.warn('Error deleting Stoke calendar:', error);
    }
  }
  await AsyncStorage.removeItem(CALENDAR_ID_KEY);
  await AsyncStorage.removeItem(CALENDAR_SYNCED_KEY);
}
