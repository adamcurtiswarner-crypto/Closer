import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { requireNativeModule } from 'expo-modules-core';
import { logger } from '@/utils/logger';

// Re-enabled 2026-08-02 (Hooked audit; extension was disabled 2026-02-25 to
// unblock the first TestFlight build). Widgets read this JSON from the App
// Group; the Swift WidgetData struct must stay in sync with this shape.
// currentStreak is still written (shape stability) but no widget renders it
// — streaks are hidden in v1.

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

/** Must match ios.entitlements application-groups in app.json and
 *  WidgetData.appGroupId in widgets/WidgetData.swift. */
const APP_GROUP = 'group.io.getstoke.app';
const STORAGE_KEY = 'widgetData';

/**
 * Write widget data to shared UserDefaults and reload widget timelines.
 * Never throws — a widget that lags is better than a broken Today screen.
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    await SharedGroupPreferences.setItem(STORAGE_KEY, data, APP_GROUP);
    // The package's JS API (v0.2.0) only exposes Live Activity functions —
    // reloadAllTimelines is our own addition in widgets/Module.swift, so it
    // is reached via the native module directly, lazily (the module only
    // exists in real builds, never in Jest or Expo Go).
    requireNativeModule('ReactNativeWidgetExtension').reloadAllTimelines();
  } catch (error) {
    logger.warn('[WidgetBridge] Failed to update widget data:', error);
  }
}

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
