import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const hapticImpact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style);
};

export const hapticNotification = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(type);
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
