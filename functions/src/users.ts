import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, APP_NAME, sendPushNotification, logEvent, reportError } from './shared';
import { setCoupleClaim } from './invites';

// Shape of the embedded response copies stored on prompt_completions and
// memory_artifacts (responses[] arrays).
interface EmbeddedResponse {
  user_id: string;
  response_text: string;
  response_text_encrypted: string;
  image_url: string | null;
  [key: string]: unknown;
}

// ============================================
// SHARED SCRUB HELPERS
// ============================================
// A user's answer text lives in three places: the prompt_responses doc AND
// embedded copies inside prompt_completions.responses[] and
// memory_artifacts.responses[]. Anonymization and account purge must scrub
// all three — these helpers are the single source of truth for the embedded
// copies (used by anonymizeMyResponses and cleanupDeletedAccounts).

/** Scrubs the user's embedded copy inside prompt_completions/{assignmentId}. */
async function scrubUserFromCompletion(assignmentId: string, userId: string): Promise<void> {
  const completionRef = db.collection('prompt_completions').doc(assignmentId);
  const completionDoc = await completionRef.get();
  if (!completionDoc.exists) return;

  const completionData = completionDoc.data()!;
  const responses = (completionData.responses || []) as EmbeddedResponse[];
  if (!responses.some((r) => r.user_id === userId)) return;

  const updatedResponses = responses.map((r) =>
    r.user_id === userId
      ? { ...r, response_text: '[removed]', response_text_encrypted: '[removed]', image_url: null }
      : r
  );
  await completionRef.update({
    responses: updatedResponses,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/** Scrubs the user's embedded copies across the couple's memory_artifacts. */
async function scrubUserFromMemoryArtifacts(coupleId: string, userId: string): Promise<void> {
  const memoriesSnap = await db
    .collection('memory_artifacts')
    .where('couple_id', '==', coupleId)
    .get();

  for (const memoryDoc of memoriesSnap.docs) {
    const memoryData = memoryDoc.data();
    const memoryResponses = (memoryData.responses || []) as EmbeddedResponse[];
    if (!memoryResponses.some((r) => r.user_id === userId)) continue;

    const updatedResponses = memoryResponses.map((r) =>
      r.user_id === userId
        ? { ...r, response_text: '[removed]', response_text_encrypted: '[removed]', image_url: null }
        : r
    );
    await memoryDoc.ref.update({
      responses: updatedResponses,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ============================================
// CALLABLE: Delete Account
// ============================================

export const deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  const now = new Date();
  const scheduledPurgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Mark user as deleted with 30-day purge window.
  // purge_couple_id snapshots couple_id BEFORE the couple dissolution below
  // nulls it — cleanupDeletedAccounts needs it to purge chat messages and
  // the embedded response copies 30 days from now.
  await userRef.update({
    is_deleted: true,
    deleted_at: admin.firestore.FieldValue.serverTimestamp(),
    scheduled_purge_at: admin.firestore.Timestamp.fromDate(scheduledPurgeAt),
    purge_couple_id: userData.couple_id || null,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Handle couple disconnection
  if (userData.couple_id) {
    const coupleRef = db.collection('couples').doc(userData.couple_id);
    const coupleDoc = await coupleRef.get();

    if (coupleDoc.exists) {
      const coupleData = coupleDoc.data()!;

      // Set couple status to deleted
      await coupleRef.update({
        status: 'deleted',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Null out couple_id for both users and clear the coupleId custom
      // claim (Storage rules key off it). Claim failures are reported but
      // never block deletion — denial is the safe direction.
      const memberIds: string[] = coupleData.member_ids || [];
      for (const memberId of memberIds) {
        await db.collection('users').doc(memberId).update({
          couple_id: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        try {
          await setCoupleClaim(memberId, null);
        } catch (error) {
          await reportError('deleteAccount:setCoupleClaim', error, { userId: memberId });
        }
      }

      // Notify partner
      const partnerId = memberIds.find((id: string) => id !== userId);
      if (partnerId) {
        await sendPushNotification(partnerId, {
          title: APP_NAME,
          body: 'Your partner has left Stoke.',
        }, { type: 'prompt' });
      }
    }
  }

  // Delete Firebase Auth account
  try {
    await admin.auth().deleteUser(userId);
  } catch (error) {
    await reportError('deleteAccount', error, { userId });
  }

  await logEvent('account_deleted', userId, userData.couple_id || null, {});

  return {
    success: true,
    purge_date: scheduledPurgeAt.toISOString(),
  };
});

// ============================================
// SCHEDULED: Cleanup Deleted Accounts (Daily 3 AM PT)
// ============================================

export const cleanupDeletedAccounts = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    // Find users past their purge date
    const deletedUsers = await db
      .collection('users')
      .where('is_deleted', '==', true)
      .where('scheduled_purge_at', '<=', now)
      .get();

    let purgedCount = 0;

    for (const userDoc of deletedUsers.docs) {
      const userId = userDoc.id;

      try {
        // deleteAccount nulls couple_id when the couple dissolves, so the
        // purge reads the snapshot it took at deletion time. couple_id is
        // kept as a fallback for users deleted before purge_couple_id existed.
        const userData = userDoc.data();
        const purgeCoupleId: string | null =
          userData?.purge_couple_id || userData?.couple_id || null;

        // Delete prompt_responses and their attached images, and scrub the
        // embedded copies inside prompt_completions.responses[]
        const responsesSnap = await db
          .collection('prompt_responses')
          .where('user_id', '==', userId)
          .get();
        for (const responseDoc of responsesSnap.docs) {
          const rData = responseDoc.data();
          if (rData.image_url && rData.couple_id && rData.assignment_id) {
            try {
              const bucket = admin.storage().bucket();
              await bucket.file(`responses/${rData.couple_id}/${rData.assignment_id}/${userId}.jpg`).delete();
            } catch (e) {
              // Image may not exist
            }
          }
          if (rData.assignment_id) {
            await scrubUserFromCompletion(rData.assignment_id, userId);
          }
          await responseDoc.ref.delete();
        }

        // Scrub embedded copies inside the couple's memory_artifacts
        if (purgeCoupleId) {
          await scrubUserFromMemoryArtifacts(purgeCoupleId, userId);
        }

        // Delete events
        const eventsSnap = await db
          .collection('events')
          .where('user_id', '==', userId)
          .get();
        for (const doc of eventsSnap.docs) {
          await doc.ref.delete();
        }

        // Delete chat messages and images
        if (purgeCoupleId) {
          const chatSnap = await db
            .collection('couples')
            .doc(purgeCoupleId)
            .collection('messages')
            .where('sender_id', '==', userId)
            .get();
          for (const chatDoc of chatSnap.docs) {
            const chatData = chatDoc.data();
            if (chatData.image_url) {
              try {
                const bucket = admin.storage().bucket();
                const urlPath = new URL(chatData.image_url).pathname;
                const filePath = decodeURIComponent(urlPath.split('/o/')[1]?.split('?')[0] || '');
                if (filePath) await bucket.file(filePath).delete();
              } catch (e) {
                // Image may not exist
              }
            }
            await chatDoc.ref.delete();
          }
        }

        // Delete profile photo from Storage
        try {
          const bucket = admin.storage().bucket();
          await bucket.file(`users/${userId}/profile.jpg`).delete();
        } catch (e) {
          // Photo may not exist
        }

        // Delete the user doc itself
        await userDoc.ref.delete();

        purgedCount++;
      } catch (error) {
        await reportError('cleanupDeletedAccounts', error, { userId });
      }
    }

    console.log(`Purged ${purgedCount} deleted accounts`);
    return null;
  });

// ============================================
// CALLABLE: Export User Data
// ============================================

export const exportUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;

  // Rate limit: 1 export per 24 hours
  if (userData.last_export_at) {
    const lastExport = userData.last_export_at.toDate();
    const hoursSince = (Date.now() - lastExport.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Data export is available once every 24 hours.'
      );
    }
  }

  // User profile (exclude push_tokens)
  const { push_tokens: _push_tokens, ...profileData } = userData;

  // Prompt responses
  const responsesSnap = await db
    .collection('prompt_responses')
    .where('user_id', '==', userId)
    .get();
  const responses = responsesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Events
  const eventsSnap = await db
    .collection('events')
    .where('user_id', '==', userId)
    .get();
  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Memories (saved by this user's couple)
  let memories: admin.firestore.DocumentData[] = [];
  if (userData.couple_id) {
    const memoriesSnap = await db
      .collection('memory_artifacts')
      .where('couple_id', '==', userData.couple_id)
      .get();
    memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Goals
  let goals: admin.firestore.DocumentData[] = [];
  if (userData.couple_id) {
    const goalsSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('goals')
      .get();
    goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Wishlist items
  let wishlistItems: admin.firestore.DocumentData[] = [];
  if (userData.couple_id) {
    const wishlistSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('wishlist_items')
      .get();
    wishlistItems = wishlistSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Chat messages
  let chatMessages: admin.firestore.DocumentData[] = [];
  if (userData.couple_id) {
    const chatSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('messages')
      .where('sender_id', '==', userId)
      .get();
    chatMessages = chatSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Mark export time
  await userRef.update({
    last_export_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent('data_exported', userId, userData.couple_id || null, {});

  return {
    exported_at: new Date().toISOString(),
    profile: profileData,
    prompt_responses: responses,
    events,
    memories,
    goals,
    wishlist_items: wishlistItems,
    chat_messages: chatMessages,
  };
});

// ============================================
// CALLABLE: Anonymize My Responses
// ============================================

export const anonymizeMyResponses = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  let anonymizedCount = 0;

  // Anonymize prompt_responses
  const responsesSnap = await db
    .collection('prompt_responses')
    .where('user_id', '==', userId)
    .get();

  for (const responseDoc of responsesSnap.docs) {
    const responseData = responseDoc.data();

    // Delete attached image from Storage
    if (responseData.image_url && responseData.couple_id && responseData.assignment_id) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(`responses/${responseData.couple_id}/${responseData.assignment_id}/${userId}.jpg`).delete();
      } catch (e) {
        // Image may not exist
      }
    }

    await responseDoc.ref.update({
      response_text: '[removed]',
      response_text_encrypted: '[removed]',
      image_url: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    anonymizedCount++;

    // Update corresponding prompt_completions
    if (responseData.assignment_id) {
      await scrubUserFromCompletion(responseData.assignment_id, userId);
    }
  }

  // Update memory_artifacts where user's response appears
  if (userData.couple_id) {
    await scrubUserFromMemoryArtifacts(userData.couple_id, userId);
  }

  // Anonymize chat messages
  if (userData.couple_id) {
    const chatSnap = await db
      .collection('couples')
      .doc(userData.couple_id)
      .collection('messages')
      .where('sender_id', '==', userId)
      .where('is_deleted', '==', false)
      .get();

    for (const chatDoc of chatSnap.docs) {
      const chatData = chatDoc.data();

      // Delete chat image from Storage
      if (chatData.image_url) {
        try {
          const bucket = admin.storage().bucket();
          // Extract path from URL
          const urlPath = new URL(chatData.image_url).pathname;
          const filePath = decodeURIComponent(urlPath.split('/o/')[1]?.split('?')[0] || '');
          if (filePath) await bucket.file(filePath).delete();
        } catch (e) {
          // Image may not exist
        }
      }

      await chatDoc.ref.update({
        text: '[removed]',
        text_encrypted: '',
        image_url: null,
        is_deleted: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      anonymizedCount++;
    }
  }

  await logEvent('responses_anonymized', userId, userData.couple_id || null, {
    count: anonymizedCount,
  });

  return { anonymized_count: anonymizedCount };
});

// ============================================
// CALLABLE: Unlink Couple (breakup)
// ============================================

/**
 * Server-side partner disconnect. The client cannot do this itself: users
 * docs are owner-write-only, so a client-side unlink could only clear its
 * OWN couple_id and left the partner half-linked. This callable verifies
 * membership, dissolves the couple, clears BOTH users' couple_id and
 * coupleId custom claims, cancels pending invites, and quietly notifies
 * the partner.
 */
export const unlinkCouple = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const coupleId: string | null = userDoc.data()!.couple_id || null;
  if (!coupleId) {
    throw new functions.https.HttpsError('failed-precondition', 'Not in a couple');
  }

  const coupleRef = db.collection('couples').doc(coupleId);
  const coupleDoc = await coupleRef.get();

  if (!coupleDoc.exists) {
    // Couple doc is gone — self-heal the caller's link and claim.
    await userRef.update({
      couple_id: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    try {
      await setCoupleClaim(userId, null);
    } catch (error) {
      await reportError('unlinkCouple:setCoupleClaim', error, { userId });
    }
    return { success: true };
  }

  const coupleData = coupleDoc.data()!;
  const memberIds: string[] = coupleData.member_ids || [];
  if (!memberIds.includes(userId)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a member of this couple');
  }

  await coupleRef.update({
    status: 'deleted',
    unlinked_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Clear couple_id and the coupleId custom claim for BOTH members.
  for (const memberId of memberIds) {
    await db.collection('users').doc(memberId).update({
      couple_id: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    try {
      await setCoupleClaim(memberId, null);
    } catch (error) {
      await reportError('unlinkCouple:setCoupleClaim', error, { userId: memberId });
    }
  }

  // Cancel any pending invites for this couple
  const invitesSnap = await db
    .collection('couple_invites')
    .where('couple_id', '==', coupleId)
    .where('status', '==', 'pending')
    .get();
  for (const inviteDoc of invitesSnap.docs) {
    await inviteDoc.ref.update({ status: 'cancelled' });
  }

  // Quiet push to the partner (same copy the account-deletion path uses)
  const partnerId = memberIds.find((id: string) => id !== userId);
  if (partnerId) {
    try {
      await sendPushNotification(partnerId, {
        title: APP_NAME,
        body: 'Your partner has left Stoke.',
      }, { type: 'prompt' });
    } catch (error) {
      await reportError('unlinkCouple:push', error, { userId: partnerId, coupleId });
    }
  }

  await logEvent('couple_unlinked', userId, coupleId, {});

  return { success: true };
});
