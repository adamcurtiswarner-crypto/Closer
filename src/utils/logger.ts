import * as Sentry from '@sentry/react-native';

const isDev = __DEV__;

/** Firestore web-SDK errors carry a string `code` like 'permission-denied'. */
function firestoreErrorCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * Best-effort sanitized telemetry: writes a `client_error` event doc to
 * /events (same shape as src/services/analytics.ts). Carries ONLY the query
 * context string and the error code — never response text, never the error
 * message (which can quote document data).
 *
 * Lazy requires on purpose: src/config/firebase.ts imports this logger, so a
 * top-level import here would create a module cycle; lazy loading also keeps
 * the logger importable in tests without Firebase mocks.
 *
 * /events create is rules-allowed for the signed-in user
 * (request.resource.data.user_id == request.auth.uid); with no signed-in
 * user the write is skipped entirely.
 */
async function writeClientErrorEvent(context: string, code: string): Promise<void> {
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { db, auth } = require('@/config/firebase');
    const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
    const { Platform } = require('react-native');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const userId: string | undefined = auth?.currentUser?.uid;
    if (!userId) return;

    await addDoc(collection(db, 'events'), {
      event_name: 'client_error',
      user_id: userId,
      couple_id: null,
      platform: Platform?.OS ?? 'unknown',
      timestamp: serverTimestamp(),
      properties: { context, code },
    });
  } catch {
    // Telemetry must never cascade into a second failure.
  }
}

export const logger = {
  info: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  /**
   * Every call site in this app logs as `logger.error('Context:', err)`, so
   * reading args[0] captured the CONTEXT STRING and threw the error away —
   * Sentry received a bare message with no stack, no type and no Firestore
   * code. (Found 2026-08-02: a production "Error loading your words:" issue
   * that was undiagnosable for exactly this reason.) Scan the args for the
   * real Error instead, keep the context as an annotation, and tag the
   * Firestore code so failures are triageable at a glance.
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
      return;
    }
    const error = args.find((a) => a instanceof Error);
    const context = args
      .filter((a): a is string => typeof a === 'string')
      .join(' ')
      .trim();

    if (error) {
      const code = firestoreErrorCode(error);
      Sentry.captureException(error, {
        ...(context ? { extra: { context } } : {}),
        ...(code ? { tags: { firestore_code: code } } : {}),
      });
      return;
    }

    // No Error anywhere in the args — keep whatever detail we do have.
    const detail = args.find((a) => a != null && typeof a !== 'string');
    Sentry.captureMessage(
      [context, detail != null ? String(detail) : null].filter(Boolean).join(' ') ||
        'Unknown error',
      'error'
    );
  },
  /**
   * For catch blocks around Firestore queries/listeners. Logs like
   * logger.error, and when the failure is a rules denial
   * ('permission-denied') ALSO records a sanitized `client_error` event in
   * /events — the server-visible signal that a client query shape has
   * drifted from the security rules (the class of bug that silently jammed
   * the offline queue). Fire-and-forget: callers do not need to await.
   */
  reportQueryDenied: (context: string, error: unknown): Promise<void> => {
    if (isDev) {
      console.error(`[${context}]`, error);
    } else if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`[${context}] ${String(error)}`, 'error');
    }
    const code = firestoreErrorCode(error);
    if (code === 'permission-denied') {
      return writeClientErrorEvent(context, code);
    }
    return Promise.resolve();
  },
};
