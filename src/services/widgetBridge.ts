import { Platform } from 'react-native';

interface WidgetData {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
  lastUpdated: string;
}

const APP_GROUP = 'group.com.stoke.app';
const STORAGE_KEY = 'widgetData';

/**
 * Update the iOS home screen widget data.
 * Writes to shared UserDefaults and triggers a widget timeline reload.
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const SharedGroupPreferences = (await import('react-native-shared-group-preferences')).default;
    await SharedGroupPreferences.setItem(STORAGE_KEY, data, APP_GROUP);

    const { reloadAllTimelines } = await import('react-native-widget-extension');
    reloadAllTimelines();
  } catch (error) {
    console.warn('[WidgetBridge] Failed to update widget data:', error);
  }
}

/**
 * Build widget data from app state.
 */
export function buildWidgetData({
  currentStreak,
  daysAsCouple,
  userName,
  partnerName,
  promptStatus,
  promptText,
  anniversaryDaysLeft,
  anniversaryIsToday,
}: {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
}): WidgetData {
  return {
    currentStreak,
    daysAsCouple,
    userName,
    partnerName,
    promptStatus,
    promptText,
    anniversaryDaysLeft,
    anniversaryIsToday,
    lastUpdated: new Date().toISOString(),
  };
}
