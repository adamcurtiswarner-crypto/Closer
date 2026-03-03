const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({ projectId: 'closer-dev' });
const db = admin.firestore(app);

const adamUid = 'RYvFGbr3jHMcbhx6xfQU3rt1VLAf';
const partnerUid = '2FEGOdateNUFJuvBYYl6mNiYGf9u';
const coupleId = 'test-couple-001';
const today = new Date().toISOString().split('T')[0];

async function main() {
  await db.collection('couples').doc(coupleId).set({
    member_ids: [adamUid, partnerUid],
    status: 'active', prompt_frequency: 'daily',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('users').doc(adamUid).set({
    email: 'adam@stoke.test', display_name: 'Adam', partner_name: 'Alex',
    couple_id: coupleId, notification_time: '19:00',
    timezone: 'America/Los_Angeles', tone_calibration: 'solid',
    is_onboarded: true, is_deleted: false,
    photo_url: null, partner_photo_url: null, love_language: null, locale: 'en',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('users').doc(partnerUid).set({
    email: 'alex@stoke.test', display_name: 'Alex', partner_name: 'Adam',
    couple_id: coupleId, notification_time: '19:00',
    timezone: 'America/Los_Angeles', tone_calibration: 'solid',
    is_onboarded: true, is_deleted: false,
    photo_url: null, partner_photo_url: null, love_language: null, locale: 'en',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('prompt_assignments').doc(coupleId + '_' + today).set({
    couple_id: coupleId, prompt_id: 'test-prompt-001',
    prompt_text: "What's one thing your partner did this week that made your day better?",
    prompt_hint: 'Think about small gestures, not just big ones.',
    prompt_type: 'appreciation', requires_conversation: false,
    assigned_date: today, source: 'daily', status: 'delivered',
    response_count: 0, delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    delivery_timezone: 'America/Los_Angeles',
    first_response_at: null, second_response_at: null, completed_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Seeded. Date:', today, 'Adam:', adamUid);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
