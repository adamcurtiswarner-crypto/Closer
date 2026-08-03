import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Watch a completion doc, tolerating the moment before it exists.
 *
 * The reveal is optimistic: the client flips `isComplete` as soon as its own
 * response_count reaches 2 (usePrompt), which is BEFORE the server trigger
 * has created /prompt_completions/{assignmentId}. For that second or two the
 * client is listening to a document that does not exist, and the rules —
 * which dereference `resource.data.couple_id` — deny the read outright
 * rather than returning an empty snapshot.
 *
 * onSnapshot does not retry after an error: it tears the listener down for
 * good. That silently killed live reactions in the same window long before
 * clarify existed (useCompletionReactions swallowed the error with no
 * telemetry); a permission-denied surfaced from the clarify listener on
 * 2026-08-03 is what finally exposed it.
 *
 * So: retry a few times on a short ramp. A genuine denial (a completion that
 * really isn't ours) still gives up quickly and reports exactly once.
 */

/** Short ramp — the server trigger normally lands well inside this. */
export const COMPLETION_WATCH_RETRIES_MS = [400, 1200, 2500];

export function watchCompletionDoc(
  assignmentId: string,
  onData: (snap: DocumentSnapshot) => void,
  onGiveUp: (error: unknown) => void,
  retries: number[] = COMPLETION_WATCH_RETRIES_MS
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const start = () => {
    if (cancelled) return;
    unsubscribe = onSnapshot(
      doc(db, 'prompt_completions', assignmentId),
      (snap) => {
        attempt = 0; // a good read resets the ramp
        onData(snap);
      },
      (error) => {
        // The listener is already torn down by the time this fires.
        unsubscribe = null;
        if (attempt < retries.length) {
          timer = setTimeout(start, retries[attempt]);
          attempt += 1;
          return;
        }
        onGiveUp(error);
      }
    );
  };

  start();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    if (unsubscribe) unsubscribe();
  };
}
