jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { buildWidgetData, updateWidgetData } from '../services/widgetBridge';
import { logger } from '@/utils/logger';

// SharedGroupPreferences resolves to src/__mocks__ via jest.config.js
// moduleNameMapper; expo-modules-core is required lazily inside
// updateWidgetData and throws in Jest — which is exactly the contained
// failure path this suite pins down.

function makeInput() {
  return {
    currentStreak: 3,
    daysAsCouple: 812,
    userName: 'Adam',
    partnerName: 'Masha',
    promptStatus: 'your_turn' as const,
    promptText: 'What felt easy this week?',
    anniversaryDaysLeft: 40,
    anniversaryIsToday: false,
  };
}

describe('widgetBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildWidgetData stamps lastUpdated and passes fields through', () => {
    const data = buildWidgetData(makeInput());
    expect(data.promptStatus).toBe('your_turn');
    expect(data.daysAsCouple).toBe(812);
    expect(typeof data.lastUpdated).toBe('string');
    expect(new Date(data.lastUpdated).getTime()).not.toBeNaN();
  });

  it('updateWidgetData never throws, even when the native module is missing', async () => {
    // In Jest there is no ReactNativeWidgetExtension native module — the
    // lazy require path must swallow that, not crash the Today screen.
    await expect(
      updateWidgetData(buildWidgetData(makeInput()))
    ).resolves.toBeUndefined();
    expect(SharedGroupPreferences.setItem).toHaveBeenCalledWith(
      'widgetData',
      expect.objectContaining({ promptStatus: 'your_turn' }),
      'group.io.getstoke.app'
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('is a no-op off iOS', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      await updateWidgetData(buildWidgetData(makeInput()));
      expect(SharedGroupPreferences.setItem).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('contains SharedGroupPreferences failures', async () => {
    (SharedGroupPreferences.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('no app group')
    );
    await expect(
      updateWidgetData(buildWidgetData(makeInput()))
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });
});
