import * as admin from 'firebase-admin';
import { SandboxConfig, getWeekStart, sandboxTag } from './config';

export async function seedCouple(
  db: FirebaseFirestore.Firestore,
  config: SandboxConfig,
  coupleId: string,
  user1Id: string,
  user2Id: string,
): Promise<void> {
  const startDate = getWeekStart(config.startWeeksAgo);
  const premiumUntil = new Date();
  premiumUntil.setMonth(premiumUntil.getMonth() + 6);

  await db.collection('couples').doc(coupleId).set({
    member_ids: [user1Id, user2Id],
    status: 'active',
    created_at: admin.firestore.Timestamp.fromDate(startDate),
    premium_until: admin.firestore.Timestamp.fromDate(premiumUntil),
    current_pulse_score: 0,
    current_pulse_tier: 'steady',
    current_streak: 0,
    longest_streak: 0,
    last_streak_date: null,
    depth_progress: {
      surface: { completed: 0, threshold: 5 },
      medium: { completed: 0, threshold: 10, unlocked: false },
      deep: { completed: 0, threshold: 20, unlocked: false },
    },
    ...sandboxTag(),
  });

  console.log(`  Couple created: ${coupleId}`);
}
