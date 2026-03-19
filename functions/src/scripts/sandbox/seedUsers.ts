import * as admin from 'firebase-admin';
import { SandboxConfig, getWeekStart, sandboxTag } from './config';

export async function seedUsers(
  db: FirebaseFirestore.Firestore,
  auth: admin.auth.Auth,
  config: SandboxConfig,
): Promise<{ user1Id: string; user2Id: string }> {
  const user1 = await getOrCreateUser(auth, config.users.user1.email, config.users.password, config.users.user1.displayName);
  const user2 = await getOrCreateUser(auth, config.users.user2.email, config.users.password, config.users.user2.displayName);

  const startDate = getWeekStart(config.startWeeksAgo);

  await db.collection('users').doc(user1.uid).set({
    id: user1.uid,
    email: config.users.user1.email,
    display_name: config.users.user1.displayName,
    partner_name: config.users.user2.displayName,
    couple_id: 'sandbox-couple-001',
    notification_time: '08:00',
    timezone: 'America/Los_Angeles',
    tone_calibration: config.users.user1.toneCalibration,
    is_onboarded: true,
    love_language: config.users.user1.loveLanguage,
    locale: 'en',
    photo_url: null,
    partner_photo_url: null,
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    ...sandboxTag(),
  });

  await db.collection('users').doc(user2.uid).set({
    id: user2.uid,
    email: config.users.user2.email,
    display_name: config.users.user2.displayName,
    partner_name: config.users.user1.displayName,
    couple_id: 'sandbox-couple-001',
    notification_time: '08:00',
    timezone: 'America/Los_Angeles',
    tone_calibration: config.users.user2.toneCalibration,
    is_onboarded: true,
    love_language: config.users.user2.loveLanguage,
    locale: 'en',
    photo_url: null,
    partner_photo_url: null,
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    ...sandboxTag(),
  });

  console.log(`  Users created: ${user1.uid}, ${user2.uid}`);
  return { user1Id: user1.uid, user2Id: user2.uid };
}

async function getOrCreateUser(
  auth: admin.auth.Auth,
  email: string,
  password: string,
  displayName: string,
): Promise<admin.auth.UserRecord> {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return await auth.createUser({ email, password, displayName });
  }
}
