import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

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
    // Purchases.configure installs a DEFAULT log handler that routes every
    // native SDK log event to console.error("[RevenueCat] ...") — the 2-4
    // red LogBox lines on fresh free accounts, even at LOG_LEVEL.ERROR.
    // configure only installs that default when no handler exists, so ours
    // must go in FIRST. Offerings/customerInfo fetch failures are expected
    // states pre-W-9: surface WARN/ERROR quietly through logger.warn (dev
    // console only; a no-op in release) and drop the chatty rest. Real
    // failures still reach users through our own catch paths —
    // useSubscription's offeringError state and the purchase/restore alerts.
    Purchases.setLogHandler((level, message) => {
      if (level === LOG_LEVEL.ERROR || level === LOG_LEVEL.WARN) {
        logger.warn(`[RevenueCat] ${message}`);
      }
    });
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
