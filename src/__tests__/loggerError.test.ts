/**
 * Tests for logger.error's PRODUCTION branch (src/utils/logger.ts).
 *
 * Regression origin (2026-08-02): a production Sentry issue read only
 * "Error loading your words:" — no type, no stack, no Firestore code —
 * because the logger captured args[0] (the context string) instead of the
 * Error that every call site passes as args[1]. That made a real user-facing
 * failure impossible to diagnose. These tests pin the contract:
 * logger.error('Context:', err) MUST reach Sentry as an exception.
 */

jest.mock('@/config/firebase', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'e1' }),
  serverTimestamp: jest.fn(),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// The logger reads __DEV__ at module load, and ES imports are hoisted —
// so the module is required AFTER the flag is flipped, per test.
type Logger = typeof import('../utils/logger').logger;
let logger: Logger;
let captureException: jest.Mock;
let captureMessage: jest.Mock;

function loadLoggerInProdMode() {
  jest.resetModules();
  (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  logger = require('../utils/logger').logger;
  const sentry = require('@sentry/react-native');
  captureException = sentry.captureException as jest.Mock;
  captureMessage = sentry.captureMessage as jest.Mock;
  captureException.mockClear();
  captureMessage.mockClear();
}

function firestoreError(code: string): Error & { code: string } {
  const err = new Error('Missing or insufficient permissions.') as Error & {
    code: string;
  };
  err.code = code;
  return err;
}

describe('logger.error (production reporting)', () => {
  beforeEach(() => loadLoggerInProdMode());

  afterAll(() => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it('captures the ERROR, not the context string, for the standard call shape', () => {
    const err = new Error('boom');
    logger.error('Error loading your words:', err);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(err, expect.anything());
    // The old behaviour — a bare message with no exception — must not return.
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('keeps the context string as an annotation', () => {
    logger.error('Error loading your words:', new Error('boom'));
    const [, options] = captureException.mock.calls[0];
    expect(options.extra.context).toBe('Error loading your words:');
  });

  it('tags the Firestore code so denials are triageable at a glance', () => {
    logger.error('useYourWords:', firestoreError('permission-denied'));
    const [, options] = captureException.mock.calls[0];
    expect(options.tags.firestore_code).toBe('permission-denied');
  });

  it('finds the error regardless of argument position', () => {
    const err = new Error('boom');
    logger.error(err);
    expect(captureException).toHaveBeenCalledWith(err, expect.anything());
  });

  it('falls back to a message when no Error was passed, keeping the detail', () => {
    logger.error('Something odd:', { code: 'weird' });
    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Something odd:'),
      'error'
    );
  });

  it('never reports an empty message', () => {
    logger.error();
    expect(captureMessage).toHaveBeenCalledWith('Unknown error', 'error');
  });
});
