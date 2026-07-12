/**
 * Tests for src/config/purchases.ts — the single RevenueCat init site.
 *
 * Contracts under test (RC error-spam fix):
 *  - a custom log handler is installed BEFORE configure — configure's
 *    default handler routes every native SDK log event to
 *    console.error("[RevenueCat] ..."), the residual red LogBox lines on
 *    fresh free accounts, and it only installs when no handler exists;
 *  - the handler downgrades SDK WARN/ERROR to logger.warn (dev console
 *    only) and drops the chatty INFO/DEBUG/VERBOSE stream;
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
import { logger } from '@/utils/logger';

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

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

  it('installs the custom log handler BEFORE configure so the SDK default console.error handler never installs', async () => {
    await configurePurchases('user-1');

    expect(Purchases.setLogHandler).toHaveBeenCalledTimes(1);
    const handlerOrder = (Purchases.setLogHandler as jest.Mock).mock
      .invocationCallOrder[0];
    const configureOrder = (Purchases.configure as jest.Mock).mock
      .invocationCallOrder[0];
    expect(handlerOrder).toBeLessThan(configureOrder);
  });

  it('the handler routes SDK ERROR and WARN to logger.warn and drops the chatty rest', async () => {
    await configurePurchases('user-1');
    const handler = (Purchases.setLogHandler as jest.Mock).mock.calls[0][0];

    handler(LOG_LEVEL.ERROR, 'Error fetching offerings');
    handler(LOG_LEVEL.WARN, 'There are no products registered');
    handler(LOG_LEVEL.INFO, 'API request started');
    handler(LOG_LEVEL.DEBUG, 'chatter');
    handler(LOG_LEVEL.VERBOSE, 'more chatter');

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith('[RevenueCat] Error fetching offerings');
    expect(logger.warn).toHaveBeenCalledWith('[RevenueCat] There are no products registered');
    // Never error-level — expected pre-launch states stay out of LogBox.
    expect(logger.error).not.toHaveBeenCalled();
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

    expect(Purchases.setLogHandler).not.toHaveBeenCalled();
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
