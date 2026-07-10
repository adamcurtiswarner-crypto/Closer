// Persistence for the one-time pairing paywall (SEV-0 #8).
// The "seen" flag lives in two places: AsyncStorage (fast, survives most
// sessions) and the user doc (survives reinstall / new device). Either one
// being set means the sheet never shows again.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

const PAYWALL_SEEN_STORAGE_KEY = 'paywall_seen_at';

/**
 * Has this user already been shown the pairing paywall?
 * Fails closed (returns true) when the user doc cannot be read — a network
 * hiccup must never cause the sheet to show a second time.
 */
export async function hasSeenPairingPaywall(userId: string): Promise<boolean> {
  try {
    const local = await AsyncStorage.getItem(PAYWALL_SEEN_STORAGE_KEY);
    if (local != null) return true;
  } catch {
    // Storage unavailable — fall through to the user doc
  }

  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() && snap.data()?.paywall_seen_at != null;
  } catch (error) {
    logger.warn('Could not read paywall_seen_at:', error);
    return true;
  }
}

/**
 * Record that the pairing paywall was shown. Both writes are best-effort —
 * a failure is logged, never surfaced; the sheet itself already rendered.
 */
export async function markPairingPaywallSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYWALL_SEEN_STORAGE_KEY, new Date().toISOString());
  } catch (error) {
    logger.warn('Could not store paywall_seen_at locally:', error);
  }

  try {
    await updateDoc(doc(db, 'users', userId), {
      paywall_seen_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    logger.warn('Could not persist paywall_seen_at:', error);
  }
}
