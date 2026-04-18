import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, APP_NAME, sendPushNotification, logEvent } from './shared';

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

  // Mark user as deleted with 30-day purge window
  await userRef.update({
    is_deleted: true,
    deleted_at: admin.firestore.FieldValue.serverTimestamp(),
    scheduled_purge_at: admin.firestore.Timestamp.fromDate(scheduledPurgeAt),
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

      // Null out couple_id for both users
      const memberIds: string[] = coupleData.member_ids || [];
      for (const memberId of memberIds) {
        await db.collection('users').doc(memberId).update({
          couple_id: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
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
    console.error('Failed to delete Firebase Auth user:', error);
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
        // Delete prompt_responses and their attached images
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
          await responseDoc.ref.delete();
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
        const userData = userDoc.data();
        if (userData?.couple_id) {
          const chatSnap = await db
            .collection('couples')
            .doc(userData.couple_id)
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
        console.error(`Failed to purge user ${userId}:`, error);
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
      const completionRef = db
        .collection('prompt_completions')
        .doc(responseData.assignment_id);
      const completionDoc = await completionRef.get();

      if (completionDoc.exists) {
        const completionData = completionDoc.data()!;
        const updatedResponses = (completionData.responses || []).map(
          (r: { user_id: string; response_text: string; response_text_encrypted: string; image_url: string | null }) =>
            r.user_id === userId
              ? { ...r, response_text: '[removed]', response_text_encrypted: '[removed]', image_url: null }
              : r
        );
        await completionRef.update({
          responses: updatedResponses,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // Update memory_artifacts where user's response appears
  if (userData.couple_id) {
    const memoriesSnap = await db
      .collection('memory_artifacts')
      .where('couple_id', '==', userData.couple_id)
      .get();

    for (const memoryDoc of memoriesSnap.docs) {
      const memoryData = memoryDoc.data();
      const memoryResponses = memoryData.responses || [];
      const hasUserResponse = memoryResponses.some(
        (r: { user_id: string }) => r.user_id === userId
      );

      if (hasUserResponse) {
        const updatedResponses = memoryResponses.map(
          (r: { user_id: string; response_text: string; response_text_encrypted: string; image_url: string | null }) =>
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
