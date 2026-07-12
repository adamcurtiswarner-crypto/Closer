/**
 * Tests for src/config/purchases.ts — the single RevenueCat init site.
 *
 * Contracts under test (RC error-spam fix):
 *  - the SDK log level is capped (WARN in dev, ERROR in release) BEFORE
 *    configure, so offering-fetch hiccups on free accounts stop printing
 *    error lines;
 *  - configure/logIn run once per session even though useSubscription
 *    mounts on several screens at once (the old per-mount re-configure was
 *    the 2-6 errors-per-session source);
 *  - with no API key the SDK is never touched and isPurchasesConfigured()
 *    stays false so callers can skip entitlement calls quietly.
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import {
  configurePurchases,
  isPurchasesConfigured,
  resetPurchasesConfigForTests,
} from '@/config/purchases';

const ENV_KEY = 'EXPO_PUBLIC_REVENUECAT_IOS_KEY';

describe('configurePurchases', () => {
  const originalKey = process.env[ENV_KEY];

  beforeEach(() => {
    jest.clearAllMocks();
    resetPurchasesConfigForTests();
    process.env[ENV_KEY] = 'rc_test_key';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalKey;
    }
  });

  it('caps the SDK log level BEFORE configure — dev builds run at WARN, never verbose', async () => {
    await configurePurchases('user-1');

    // __DEV__ is true under jest.
    expect(Purchases.setLogLevel).toHaveBeenCalledWith(LOG_LEVEL.WARN);
    const setLogLevelOrder = (Purchases.setLogLevel as jest.Mock).mock
      .invocationCallOrder[0];
    const configureOrder = (Purchases.configure as jest.Mock).mock
      .invocationCallOrder[0];
    expect(setLogLevelOrder).toBeLessThan(configureOrder);
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rc_test_key' });
  });

  it('configures and logs in exactly ONCE across repeated calls for the same user', async () => {

    await configurePurchases('user-1');
    await configurePurchases('user-1');
    await configurePurchases('user-1');

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.setLogLevel).toHaveBeenCalledTimes(1);
    expect(Purchases.logIn).toHaveBeenCalledTimes(1);
    expect(Purchases.logIn).toHaveBeenCalledWith('user-1');
  });

  it('a different user re-logs-in without re-configuring', async () => {

    await configurePurchases('user-1');
    await configurePurchases('user-2');

    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.logIn).toHaveBeenCalledTimes(2);
    expect(Purchases.logIn).toHaveBeenLastCalledWith('user-2');
  });

  it('a failed logIn is retried on the next call — the guard never latches on failure', async () => {
    (Purchases.logIn as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    await expect(configurePurchases('user-1')).rejects.toThrow('offline');
    await configurePurchases('user-1');

    expect(Purchases.logIn).toHaveBeenCalledTimes(2);
    expect(Purchases.configure).toHaveBeenCalledTimes(1);
  });

  it('with no API key it never touches the SDK and reports unconfigured', async () => {
    delete process.env[ENV_KEY];

    await configurePurchases('user-1');

    expect(Purchases.setLogLevel).not.toHaveBeenCalled();
    expect(Purchases.configure).not.toHaveBeenCalled();
    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(isPurchasesConfigured()).toBe(false);
  });

  it('isPurchasesConfigured flips true after a successful configure', async () => {

    expect(isPurchasesConfigured()).toBe(false);
    await configurePurchases('user-1');
    expect(isPurchasesConfigured()).toBe(true);
  });
});
