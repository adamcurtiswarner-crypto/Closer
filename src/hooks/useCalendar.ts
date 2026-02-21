import { useState, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import {
  requestCalendarPermission,
  syncCalendar,
  removeStokeCalendar,
  isSynced,
} from '@/services/calendar';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';

export function useCalendarSync() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const [synced, setSynced] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    isSynced().then(setSynced);
  }, []);

  const sync = useMutation({
    mutationFn: async () => {
      const granted = await requestCalendarPermission();
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Calendar access needed',
          'Enable calendar access in your device Settings to sync Stoke events.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        throw new Error('Permission denied');
      }

      await syncCalendar({
        anniversaryDate: couple?.anniversaryDate
          ? new Date(couple.anniversaryDate)
          : null,
        partnerName: user?.partnerName || 'Partner',
        notificationTime: user?.notificationTime || '19:00',
      });

      setSynced(true);
      logEvent('calendar_synced');
    },
    onError: (error) => {
      if (error.message !== 'Permission denied') {
        logger.error('Calendar sync error:', error);
        Alert.alert('Error', 'Failed to sync calendar. Please try again.');
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await removeStokeCalendar();
      setSynced(false);
      logEvent('calendar_removed');
    },
    onError: (error) => {
      logger.error('Calendar remove error:', error);
    },
  });

  return { synced, hasPermission, sync, remove };
}
