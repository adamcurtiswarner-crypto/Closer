import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, getWeekId, randomBetween, sandboxTag } from './config';
import { STATIC_INSIGHTS } from './coachingInsights';

export async function seedCoaching(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    const weekId = getWeekId(date);
    const insight = STATIC_INSIGHTS[week];
    const engagement = ctx.config.engagementByWeek[week];
    const score = Math.round(engagement * 100);

    let dismissedAt: admin.firestore.Timestamp | null = null;
    let actedOn: admin.firestore.Timestamp | null = null;

    if (insight.outcome === 'acted') {
      const daysLater = randomBetween(1, 3);
      const actedDate = new Date(date.getTime() + daysLater * 24 * 60 * 60 * 1000);
      actedOn = admin.firestore.Timestamp.fromDate(actedDate);
    } else if (insight.outcome === 'dismissed') {
      const daysLater = randomBetween(1, 5);
      const dismissedDate = new Date(date.getTime() + daysLater * 24 * 60 * 60 * 1000);
      dismissedAt = admin.firestore.Timestamp.fromDate(dismissedDate);
    }

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('coaching_insights').doc(weekId);

    batch.set(ref, {
      pulse_score: score,
      insight_text: insight.insightText,
      action_type: insight.actionType,
      action_text: insight.actionText,
      created_at: admin.firestore.Timestamp.fromDate(date),
      dismissed_at: dismissedAt,
      acted_on: actedOn,
      ...sandboxTag(),
    });
  }

  await batch.commit();
  console.log(`  ${ctx.config.startWeeksAgo} coaching insights created`);
}
