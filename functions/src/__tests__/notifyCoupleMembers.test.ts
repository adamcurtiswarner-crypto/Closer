/**
 * Unit tests for notifyCoupleMembers (shared.ts) — the single choke point
 * for sending anything to both halves of a couple.
 *
 * Why it exists: `member_ids` was fanned out directly in eight places, and
 * two of them shipped without a status check. One assigned a fresh prompt to
 * long-deleted couples every morning and pushed both ex-partners for weeks.
 * The 2026-08-23 member_ids policy makes that harmless (a dissolved couple
 * has an empty roster); this makes it impossible to write in the first
 * place, and puts the status check, the de-duplication and the per-member
 * isolation in ONE place instead of eight.
 *
 * Asserted through the real Expo transport rather than a mocked
 * sendPushNotification, so the test proves who actually receives a push.
 */

const docs = new Map<string, Record<string, unknown>>();

jest.mock('firebase-admin', () => {
  const makeDoc = (path: string) => ({
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    update: async (data: Record<string, unknown>) => {
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
    set: jest.fn(),
  });
  const firestoreFn = jest.fn(() => ({
    collection: (name: string) => ({
      doc: (id: string) => makeDoc(`${name}/${id}`),
      add: jest.fn(),
    }),
  })) as jest.Mock & { FieldValue: Record<string, unknown> };
  firestoreFn.FieldValue = {
    arrayRemove: (...tokens: unknown[]) => ({ __op: 'arrayRemove', tokens }),
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { initializeApp: jest.fn(), firestore: firestoreFn, messaging: jest.fn() };
});

import { notifyCoupleMembers } from '../shared';

const COUPLE = 'couple-1';
const USER_A = 'user-a';
const USER_B = 'user-b';
const TOKEN_A = 'ExponentPushToken[aaa]';
const TOKEN_B = 'ExponentPushToken[bbb]';
const NOTE = { title: 'Stoke', body: "Today's prompt is ready." };

const mockFetch = jest.fn();

/** Every Expo push token the transport was actually asked to send to. */
function recipients(): string[] {
  return mockFetch.mock.calls.flatMap((call) =>
    JSON.parse(call[1].body).map((m: { to: string }) => m.to)
  );
}

function seed(coupleFields: Record<string, unknown>): void {
  docs.set(`couples/${COUPLE}`, coupleFields);
  docs.set(`users/${USER_A}`, { push_tokens: [TOKEN_A] });
  docs.set(`users/${USER_B}`, { push_tokens: [TOKEN_B] });
}

beforeEach(() => {
  docs.clear();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
  });
  (global as unknown as { fetch: unknown }).fetch = mockFetch;
});

describe('notifyCoupleMembers', () => {
  it('notifies both members of an active couple', async () => {
    seed({ status: 'active', member_ids: [USER_A, USER_B] });

    const sent = await notifyCoupleMembers(COUPLE, NOTE, { type: 'prompt' });

    expect(sent).toBe(2);
    expect(recipients().sort()).toEqual([TOKEN_A, TOKEN_B]);
  });

  it('sends nothing for a dissolved couple', async () => {
    // The defect this whole choke point exists to prevent.
    seed({ status: 'deleted', member_ids: [], former_member_ids: [USER_A, USER_B] });

    const sent = await notifyCoupleMembers(COUPLE, NOTE);

    expect(sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never reaches a former member, even on a pre-policy couple doc', async () => {
    // Legacy shape: dissolved but the roster was never cleared. The status
    // check has to stand on its own, without relying on the migration.
    seed({ status: 'deleted', member_ids: [USER_A, USER_B] });

    const sent = await notifyCoupleMembers(COUPLE, NOTE);

    expect(sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends nothing for a pending couple or the canary couple', async () => {
    seed({ status: 'pending', member_ids: [USER_A] });
    expect(await notifyCoupleMembers(COUPLE, NOTE)).toBe(0);

    seed({ status: 'canary', member_ids: [USER_A, USER_B] });
    expect(await notifyCoupleMembers(COUPLE, NOTE)).toBe(0);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends nothing when the couple doc is missing', async () => {
    docs.set(`users/${USER_A}`, { push_tokens: [TOKEN_A] });

    expect(await notifyCoupleMembers(COUPLE, NOTE)).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('de-duplicates a roster that lists the same uid twice', async () => {
    // Not hypothetical: the canary couple in prod is [canary-u, canary-u],
    // and every raw fan-out would have pushed that member twice.
    seed({ status: 'active', member_ids: [USER_A, USER_A] });

    const sent = await notifyCoupleMembers(COUPLE, NOTE);

    expect(sent).toBe(1);
    expect(recipients()).toEqual([TOKEN_A]);
  });

  it('ignores malformed roster entries instead of throwing', async () => {
    seed({ status: 'active', member_ids: [USER_A, null, '', 42, USER_B] });

    const sent = await notifyCoupleMembers(COUPLE, NOTE);

    expect(sent).toBe(2);
    expect(recipients().sort()).toEqual([TOKEN_A, TOKEN_B]);
  });

  it('still reaches the partner when one member fails', async () => {
    // Per-member isolation: a raw `for` loop with an await aborts the
    // remaining members, so one bad user doc silently costs the partner
    // their notification.
    seed({ status: 'active', member_ids: [USER_A, USER_B] });
    docs.set(`users/${USER_A}`, {
      get push_tokens(): never {
        throw new Error('corrupt user doc');
      },
    } as unknown as Record<string, unknown>);

    const sent = await notifyCoupleMembers(COUPLE, NOTE);

    expect(sent).toBe(1);
    expect(recipients()).toEqual([TOKEN_B]);
  });

  it('never throws out of a notification', async () => {
    seed({ status: 'active', member_ids: [USER_A, USER_B] });
    mockFetch.mockRejectedValue(new Error('network down'));

    await expect(notifyCoupleMembers(COUPLE, NOTE)).resolves.toBe(2);
  });
});
