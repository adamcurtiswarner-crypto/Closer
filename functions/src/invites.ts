import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, enforceRateLimit, getWeekId, logEvent, reportError } from './shared';

// 6 chars from the client alphabet (no 0/O/1/I) — but accept the full
// A-Z/2-9 range so validation never drifts from generation.
const INVITE_CODE_REGEX = /^[A-Z0-9]{6}$/;

// ============================================
// CUSTOM CLAIM: coupleId
// ============================================

/**
 * Sets (or clears, when coupleId is null) the `coupleId` custom auth claim.
 *
 * Storage security rules cannot read Firestore, so couple membership for
 * Storage paths is proven via this claim (`request.auth.token.coupleId`).
 * It is set when a couple activates (acceptInvite) and cleared when the
 * couple dissolves (unlinkCouple / deleteAccount). Claims propagate to
 * clients on ID token refresh: immediately with getIdToken(true), or
 * within ~1 hour on natural token expiry.
 */
export async function setCoupleClaim(userId: string, coupleId: string | null): Promise<void> {
  const userRecord = await admin.auth().getUser(userId);
  const claims: Record<string, unknown> = { ...(userRecord.customClaims || {}) };
  if (coupleId) {
    claims.coupleId = coupleId;
  } else {
    delete claims.coupleId;
  }
  await admin.auth().setCustomUserClaims(userId, claims);
}

// ============================================
// CALLABLE: Accept Invite
// ============================================

/**
 * Server-side invite acceptance. Clients can no longer read or update
 * couple_invites for codes they didn't create (enumeration fix), so the
 * whole join happens here with the Admin SDK inside a transaction.
 *
 * Error messages are load-bearing: the accept-invite screen maps them via
 * substring match to its five error copies. Keep the exact strings:
 *   'Already in a couple' / 'This invite has expired' /
 *   'This invite has already been used' / "You can't accept your own invite" /
 *   'Invalid invite code'
 */
export const acceptInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  const rawCode = typeof data?.code === 'string' ? data.code.trim().toUpperCase() : '';
  if (!INVITE_CODE_REGEX.test(rawCode)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid invite code');
  }
  const code = rawCode;

  // Light brute-force guard against code enumeration.
  await enforceRateLimit(userId, 'accept_invite', 5);

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
  const userData = userDoc.data()!;

  // Reject when already in an ACTIVE couple; a stale pending/deleted
  // couple_id is simply overwritten by the join below.
  if (userData.couple_id) {
    const existingCouple = await db.collection('couples').doc(userData.couple_id).get();
    if (existingCouple.exists && existingCouple.data()!.status === 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Already in a couple');
    }
  }

  const inviteRef = db.collection('couple_invites').doc(code);

  const result = await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid invite code');
    }
    const inviteData = inviteSnap.data()!;

    if (inviteData.status !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This invite has already been used'
      );
    }

    if (inviteData.expires_at && inviteData.expires_at.toDate() < new Date()) {
      throw new functions.https.HttpsError('failed-precondition', 'This invite has expired');
    }

    if (inviteData.inviter_id === userId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        "You can't accept your own invite"
      );
    }

    const coupleId: string = inviteData.couple_id;
    const coupleRef = db.collection('couples').doc(coupleId);
    const coupleSnap = await transaction.get(coupleRef);
    const coupleData = coupleSnap.exists ? coupleSnap.data() : undefined;

    if (
      !coupleData ||
      coupleData.status !== 'pending' ||
      !Array.isArray(coupleData.member_ids) ||
      coupleData.member_ids.length !== 1
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid invite code');
    }

    const memberIds: string[] = [...coupleData.member_ids, userId];

    transaction.update(inviteRef, {
      status: 'accepted',
      accepted_at: admin.firestore.FieldValue.serverTimestamp(),
      accepted_by: userId,
    });

    transaction.update(coupleRef, {
      member_ids: memberIds,
      member_emails: [...(coupleData.member_emails || []), userData.email || null],
      status: 'active',
      linked_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      cohort_week: getWeekId(new Date()),
    });

    transaction.update(userRef, {
      couple_id: coupleId,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { coupleId, memberIds };
  });

  // Set the coupleId custom claim for BOTH members so Storage rules admit
  // them. A claim failure must not undo the join — the failure direction is
  // safe (Storage denies until the backfill/retry), so report and continue.
  for (const memberId of result.memberIds) {
    try {
      await setCoupleClaim(memberId, result.coupleId);
    } catch (error) {
      await reportError('acceptInvite:setCoupleClaim', error, {
        userId: memberId,
        coupleId: result.coupleId,
      });
    }
  }

  await logEvent('couple_linked', userId, result.coupleId, { invite_code: code });

  return { coupleId: result.coupleId };
});
