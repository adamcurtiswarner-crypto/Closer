import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, getWeekId, sandboxTag } from './config';

export async function seedPulseScores(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const date = getWeekStart(weeksAgo);
    const weekId = getWeekId(date);
    const engagement = ctx.config.engagementByWeek[week];
    const tier = ctx.config.coachingTiers[week];
    const score = Math.round(engagement * 100);
    const checkInScore = ctx.config.checkInScores[week];

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('pulse_scores').doc(weekId);

    batch.set(ref, {
      score,
      tier,
      breakdown: {
        emotion_positive: Math.round(engagement * 7),
        emotion_negative: Math.round((1 - engagement) * 3),
        emotion_total: 10,
        completion_rate: engagement,
        one_sided_days: Math.round((1 - engagement) * 7),
        avg_response_length: Math.round(engagement * 120),
        avg_check_in: checkInScore,
      },
      created_at: admin.firestore.Timestamp.fromDate(date),
      ...sandboxTag(),
    });
  }

  const lastWeek = ctx.config.startWeeksAgo - 1;
  const lastEngagement = ctx.config.engagementByWeek[lastWeek];
  await ctx.db.collection('couples').doc(ctx.coupleId).update({
    current_pulse_score: Math.round(lastEngagement * 100),
    current_pulse_tier: ctx.config.coachingTiers[lastWeek],
  });

  await batch.commit();
  console.log(`  ${ctx.config.startWeeksAgo} pulse scores created`);
}
