import { functions, admin, db, APP_NAME, sendPushNotification, reportError } from './shared';
import { format } from 'date-fns';

// ============================================
// CONSTANTS
// ============================================

const FORECAST_MAP: Record<string, string> = {
  encouragement: "Today might be a good day to remind them they're not alone.",
  space: "Give them a little room today. They'll come to you when ready.",
  laughter: 'They could use something light today. A joke, a memory, a smile.',
  stability: 'Keep things steady today. Routine and presence matter.',
};

const VALID_CHOICES = Object.keys(FORECAST_MAP);

// ============================================
// HELPERS
// ============================================

async function getUserAndCouple(userId: string) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }
  const userData = userDoc.data()!;
  const coupleId = userData.couple_id;
  if (!coupleId) {
    throw new functions.https.HttpsError('failed-precondition', 'You are not linked to a partner.');
  }

  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Couple not found.');
  }
  const coupleData = coupleDoc.data()!;
  const partnerId = (coupleData.member_ids as string[]).find((id: string) => id !== userId) || null;

  return { userData, coupleId, coupleData, partnerId };
}

async function getActiveCouples() {
  const snapshot = await db
    .collection('couples')
    .where('status', '==', 'active')
    .get();
  return snapshot.docs;
}

// ============================================
// ENGINE 1 — LEARN: Morning Check-in
// ============================================

export const deliverMorningCheckin = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    try {
      const couples = await getActiveCouples();

      for (const coupleDoc of couples) {
        const coupleData = coupleDoc.data();
        for (const memberId of coupleData.member_ids) {
          await sendPushNotification(
            memberId,
            { title: APP_NAME, body: 'One question. Five seconds.' },
            { type: 'morning_checkin', screen: 'morning-checkin' }
          );
        }
      }

      console.log(`Delivered morning check-in to ${couples.length} couples`);
    } catch (error) {
      await reportError('deliverMorningCheckin', error);
      console.error('deliverMorningCheckin failed:', error);
    }

    return null;
  });

export const submitMorningCheckin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const { choice } = data || {};

  if (!choice || !VALID_CHOICES.includes(choice)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Choice must be one of: ${VALID_CHOICES.join(', ')}`
    );
  }

  try {
    const { coupleId, partnerId } = await getUserAndCouple(userId);
    const forecast = FORECAST_MAP[choice];

    await db.collection('couples').doc(coupleId).collection('check_ins').add({
      user_id: userId,
      couple_id: coupleId,
      choice,
      forecast,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (partnerId) {
      await sendPushNotification(
        partnerId,
        { title: APP_NAME, body: forecast },
        { type: 'morning_checkin_forecast', screen: 'morning-checkin' }
      );
    }

    return { success: true, forecast };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    await reportError('submitMorningCheckin', error, { userId });
    throw new functions.https.HttpsError('internal', 'Could not save your check-in. Please try again.');
  }
});

// ============================================
// ENGINE 2 — ACTION: Spark
// ============================================

export const sendSpark = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const { word } = data || {};

  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'A word is required.');
  }

  if (word.length > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Word must be 100 characters or fewer.');
  }

  try {
    const { coupleId, partnerId } = await getUserAndCouple(userId);

    const sparkRef = await db.collection('couples').doc(coupleId).collection('sparks').add({
      sender_id: userId,
      couple_id: coupleId,
      word: word.trim(),
      guess: null,
      revealed: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (partnerId) {
      await sendPushNotification(
        partnerId,
        { title: APP_NAME, body: 'Your partner sent a spark. What do they mean?' },
        { type: 'spark_received', screen: 'partner-guess', sparkId: sparkRef.id }
      );
    }

    return { success: true, sparkId: sparkRef.id };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    await reportError('sendSpark', error, { userId });
    throw new functions.https.HttpsError('internal', 'Could not send your spark. Please try again.');
  }
});

export const submitSparkGuess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const { sparkId, guess } = data || {};

  if (!sparkId || typeof sparkId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'sparkId is required.');
  }
  if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'A guess is required.');
  }

  try {
    const { coupleId } = await getUserAndCouple(userId);
    const sparkRef = db.collection('couples').doc(coupleId).collection('sparks').doc(sparkId);
    const sparkDoc = await sparkRef.get();

    if (!sparkDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Spark not found.');
    }

    const sparkData = sparkDoc.data()!;
    if (sparkData.sender_id === userId) {
      throw new functions.https.HttpsError('permission-denied', 'You cannot guess your own spark.');
    }

    await sparkRef.update({
      guess: guess.trim(),
      guess_submitted_at: admin.firestore.FieldValue.serverTimestamp(),
      revealed: true,
    });

    await sendPushNotification(
      sparkData.sender_id,
      { title: APP_NAME, body: 'Your partner guessed. See what they think.' },
      { type: 'spark_guessed', screen: 'partner-guess', sparkId }
    );

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    await reportError('submitSparkGuess', error, { userId });
    throw new functions.https.HttpsError('internal', 'Could not submit your guess. Please try again.');
  }
});

// ============================================
// ENGINE 3 — REFLECT: Evening Reflection
// ============================================

export const deliverEveningReflection = functions.pubsub
  .schedule('every day 21:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    try {
      const couples = await getActiveCouples();

      for (const coupleDoc of couples) {
        const coupleData = coupleDoc.data();
        for (const memberId of coupleData.member_ids) {
          await sendPushNotification(
            memberId,
            { title: APP_NAME, body: 'How did today feel? Take a moment to reflect.' },
            { type: 'evening_reflection', screen: 'evening-reflection' }
          );
        }
      }

      console.log(`Delivered evening reflection to ${couples.length} couples`);
    } catch (error) {
      await reportError('deliverEveningReflection', error);
      console.error('deliverEveningReflection failed:', error);
    }

    return null;
  });

export const submitReflection = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const { score, helped } = data || {};

  if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new functions.https.HttpsError('invalid-argument', 'Score must be an integer between 1 and 5.');
  }
  if (!Array.isArray(helped) || !helped.every((h: unknown) => typeof h === 'string')) {
    throw new functions.https.HttpsError('invalid-argument', 'Helped must be an array of strings.');
  }

  try {
    const { coupleId } = await getUserAndCouple(userId);
    const today = format(new Date(), 'yyyy-MM-dd');

    await db.collection('couples').doc(coupleId).collection('reflections').add({
      user_id: userId,
      couple_id: coupleId,
      score,
      helped,
      date: today,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    await reportError('submitReflection', error, { userId });
    throw new functions.https.HttpsError('internal', 'Could not save your reflection. Please try again.');
  }
});

// ============================================
// ENGINE 4 — BONUS: Surprise Mission
// ============================================

export const submitMissionResponse = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const { missionId, accepted } = data || {};

  if (!missionId || typeof missionId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'missionId is required.');
  }
  if (typeof accepted !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'accepted must be a boolean.');
  }

  try {
    const { coupleId } = await getUserAndCouple(userId);

    // Look up the mission text from a missions catalog or use a placeholder
    const missionDoc = await db.collection('missions').doc(missionId).get();
    const missionText = missionDoc.exists ? missionDoc.data()!.text : missionId;

    await db.collection('couples').doc(coupleId).collection('missions').add({
      user_id: userId,
      couple_id: coupleId,
      mission_id: missionId,
      mission_text: missionText,
      accepted,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    await reportError('submitMissionResponse', error, { userId });
    throw new functions.https.HttpsError('internal', 'Could not save your mission response. Please try again.');
  }
});
