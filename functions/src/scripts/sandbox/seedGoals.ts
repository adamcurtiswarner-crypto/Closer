import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, randomBetween, sandboxTag } from './config';

export async function seedGoals(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let batchCount = 0;
  let goalCount = 0;
  let completionCount = 0;

  for (const goal of ctx.config.goals) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - goal.createdWeek);
    const goalRef = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('goals').doc();

    const isArchived = goal.completedWeek !== null;
    const archivedAt = isArchived
      ? getWeekStart(ctx.config.startWeeksAgo - goal.completedWeek!)
      : null;

    batch.set(goalRef, {
      name: goal.name,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      archived: isArchived,
      archived_at: archivedAt ? admin.firestore.Timestamp.fromDate(archivedAt) : null,
      ...sandboxTag(),
    });
    goalCount++;
    batchCount++;

    const endWeek = goal.completedWeek ?? ctx.config.startWeeksAgo;
    for (let w = goal.createdWeek; w < endWeek; w++) {
      const completionsThisWeek = randomBetween(2, 4);
      for (let c = 0; c < completionsThisWeek; c++) {
        const completionDate = getWeekStart(ctx.config.startWeeksAgo - w);
        completionDate.setDate(completionDate.getDate() + randomBetween(0, 6));

        const compRef = goalRef.collection('completions').doc();
        batch.set(compRef, {
          completed_by: Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id,
          completed_at: admin.firestore.Timestamp.fromDate(completionDate),
          ...sandboxTag(),
        });
        completionCount++;
        batchCount++;

        if (batchCount >= 490) {
          await batch.commit();
          batch = ctx.db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`  ${goalCount} goals, ${completionCount} completions created`);
}
