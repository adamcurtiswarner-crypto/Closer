// Device-calendar helpers for the HIDDEN date-nights feature
// (app/(app)/date-nights.tsx, flagged off in src/config/features.ts).
//
// The v1-visible "Sync to calendar" feature (anniversary event + daily prompt
// reminder, toggled from Profile) was removed 2026-07-12 — this file keeps
// only what date-nights needs so the flag can be flipped back on post-launch.
// The expo-calendar package stays installed: it is a native dependency, and
// uninstalling it forces native churn (see CLAUDE.md Known Issues).
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const CALENDAR_ID_KEY = 'stoke_calendar_id';

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
    color: '#D4522A',
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
