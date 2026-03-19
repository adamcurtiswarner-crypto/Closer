import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, sandboxTag } from './config';

export async function seedCheckIns(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();
  let count = 0;

  for (let week = 0; week < ctx.config.checkInScores.length; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    date.setDate(date.getDate() + 6);

    const score = ctx.config.checkInScores[week];
    const variance = (Math.random() - 0.5) * 0.6;
    const user2Score = Math.round((score + variance) * 10) / 10;

    const ref1 = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('check_ins').doc();
    batch.set(ref1, {
      user_id: ctx.user1Id,
      responses: [{ user_id: ctx.user1Id, score }],
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
    count++;

    const ref2 = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('check_ins').doc();
    batch.set(ref2, {
      user_id: ctx.user2Id,
      responses: [{ user_id: ctx.user2Id, score: user2Score }],
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} check-ins created`);
}
