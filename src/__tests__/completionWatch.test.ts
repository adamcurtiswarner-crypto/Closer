/**
 * Regression origin (2026-08-03, production build 72): a permission-denied
 * from useCompletionClarify.listener. Root cause was a race, not a rules bug —
 * the reveal is optimistic (client flips isComplete off its own response_count
 * the instant the second partner submits) so it subscribes to the completion
 * doc BEFORE the server trigger creates it. Rules dereference
 * resource.data.couple_id, so a read of the not-yet-existing doc is denied
 * outright, and onSnapshot tears the listener down permanently.
 *
 * useCompletionReactions watched the same doc and had been swallowing the
 * same failure silently — live partner reactions were dead for the rest of
 * any reveal that hit the window.
 */

const mockOnSnapshot = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, col, id) => `${col}/${id}`),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));
jest.mock('@/config/firebase', () => ({ db: {} }));

import { watchCompletionDoc } from '../utils/completionWatch';

const RETRIES = [10, 20, 30];

describe('watchCompletionDoc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  const denial = () => Object.assign(new Error('Missing or insufficient permissions.'), {
    code: 'permission-denied',
  });

  it('re-subscribes after a denial instead of dying (the doc is about to exist)', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockImplementation(() => unsub);
    const onData = jest.fn();
    const onGiveUp = jest.fn();

    watchCompletionDoc('a1', onData, onGiveUp, RETRIES);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    // The server hasn't created the doc yet — rules deny the read.
    mockOnSnapshot.mock.calls[0][2](denial());
    expect(onGiveUp).not.toHaveBeenCalled();

    jest.advanceTimersByTime(10);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);

    // Second attempt succeeds — the completion doc has landed.
    mockOnSnapshot.mock.calls[1][1]({ exists: () => true, data: () => ({ reactions: {} }) });
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onGiveUp).not.toHaveBeenCalled();
  });

  it('gives up once after exhausting the ramp (a genuine denial)', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn());
    const onGiveUp = jest.fn();
    watchCompletionDoc('a1', jest.fn(), onGiveUp, RETRIES);

    for (let i = 0; i < RETRIES.length; i += 1) {
      mockOnSnapshot.mock.calls[i][2](denial());
      jest.advanceTimersByTime(RETRIES[i]);
    }
    expect(mockOnSnapshot).toHaveBeenCalledTimes(RETRIES.length + 1);
    expect(onGiveUp).not.toHaveBeenCalled();

    // Final attempt fails: report exactly once, never in a loop.
    mockOnSnapshot.mock.calls[RETRIES.length][2](denial());
    expect(onGiveUp).toHaveBeenCalledTimes(1);
  });

  it('a good read resets the ramp so a later blip still retries', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn());
    const onGiveUp = jest.fn();
    watchCompletionDoc('a1', jest.fn(), onGiveUp, RETRIES);

    // Burn the whole ramp, then recover.
    for (let i = 0; i < RETRIES.length; i += 1) {
      mockOnSnapshot.mock.calls[i][2](denial());
      jest.advanceTimersByTime(RETRIES[i]);
    }
    mockOnSnapshot.mock.calls[RETRIES.length][1]({ exists: () => true, data: () => ({}) });

    // A later failure gets a fresh ramp rather than giving up immediately.
    mockOnSnapshot.mock.calls[RETRIES.length][2](denial());
    expect(onGiveUp).not.toHaveBeenCalled();
  });

  it('unsubscribing stops a pending retry', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockImplementation(() => unsub);
    const stop = watchCompletionDoc('a1', jest.fn(), jest.fn(), RETRIES);

    mockOnSnapshot.mock.calls[0][2](denial()); // schedules a retry
    stop();
    jest.advanceTimersByTime(1000);

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1); // never re-subscribed
  });

  it('unsubscribes the live listener on teardown', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockImplementation(() => unsub);
    const stop = watchCompletionDoc('a1', jest.fn(), jest.fn(), RETRIES);
    stop();
    expect(unsub).toHaveBeenCalled();
  });
});
