import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
};

export async function configurePurchases(userId: string) {
  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
  if (!apiKey) return;

  Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
}

export { Purchases };
