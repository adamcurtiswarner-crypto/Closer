import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// Read at call time (not import time) so a missing key is decided against
// the live environment — and so the keyless path stays testable.
function resolveApiKey(): string {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
}

// Configure exactly once per app session. useSubscription mounts on several
// screens at once; without this guard every mount re-ran Purchases.configure
// and Purchases.logIn, and the SDK logged an error/warning for each — the
// 2-6 red lines per session on fresh free accounts.
let configured = false;
let loggedInUserId: string | null = null;

/** Test-only escape hatch — resets the once-per-session guards. */
export function resetPurchasesConfigForTests(): void {
  configured = false;
  loggedInUserId = null;
}

/**
 * True once Purchases.configure has run this session. False means RC is
 * unavailable (no API key, e.g. local dev) — callers should treat that as
 * a quiet expected state, never an error.
 */
export function isPurchasesConfigured(): boolean {
  return configured;
}

export async function configurePurchases(userId: string): Promise<void> {
  const apiKey = resolveApiKey();
  if (!apiKey) return;

  if (!configured) {
    // The SDK defaults to chatty logging; offering-fetch failures on free
    // accounts are expected states, not errors worth a console line each.
    // Keep WARN in dev for visibility, ERROR-only in release.
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    configured = true;
  }

  if (loggedInUserId !== userId) {
    await Purchases.logIn(userId);
    loggedInUserId = userId;
  }
}

export { Purchases };
