import * as admin from 'firebase-admin';
import { SandboxContext, ResponseRecord, getEngagementLevel, randomBetween, sandboxTag } from './config';
import { RESPONSE_POOL } from './responsePool';

export async function seedResponses(ctx: SandboxContext): Promise<void> {
  if (ctx.assignments.length === 0) {
    throw new Error('No assignments found. Run assignments module first.');
  }
  ctx.responses = [];
  let batch = ctx.db.batch();
  let batchCount = 0;
  const assignmentUpdates = new Map<string, Record<string, unknown>>();

  for (const assignment of ctx.assignments) {
    const engagement = assignment.engagement;
    const level = getEngagementLevel(engagement);
    const sentimentDist = ctx.config.sentimentByEngagement[level];

    const user1Responds = Math.random() < engagement;
    const user2Responds = Math.random() < engagement;

    const record: ResponseRecord = {
      assignmentId: assignment.id,
      user1Responded: user1Responds,
      user2Responded: user2Responds,
      user1ResponseTime: null,
      user2ResponseTime: null,
    };

    const respondents: Array<{ userId: string; key: 'user1ResponseTime' | 'user2ResponseTime' }> = [];
    if (user1Responds) respondents.push({ userId: ctx.user1Id, key: 'user1ResponseTime' });
    if (user2Responds) respondents.push({ userId: ctx.user2Id, key: 'user2ResponseTime' });

    let responseCount = 0;
    let firstResponseAt: Date | null = null;
    let secondResponseAt: Date | null = null;

    for (const { userId, key } of respondents) {
      const hoursLater = randomBetween(1, 14);
      const responseTime = new Date(assignment.date.getTime() + hoursLater * 60 * 60 * 1000);
      record[key] = responseTime;

      const sentiment = pickSentiment(sentimentDist);
      const text = pickResponseText(sentiment);
      const responseLength = text.length;

      const ref = ctx.db.collection('prompt_responses').doc();
      batch.set(ref, {
        couple_id: ctx.coupleId,
        prompt_id: assignment.promptId,
        assignment_id: assignment.id,
        user_id: userId,
        response_text: '[encrypted]',
        response_text_encrypted: text,
        status: 'submitted',
        emotional_response: sentiment,
        talked_about_it: sentiment === 'positive' && Math.random() < 0.6,
        image_url: null,
        response_length: responseLength,
        time_to_respond_seconds: randomBetween(120, 7200),
        submitted_at: admin.firestore.Timestamp.fromDate(responseTime),
        created_at: admin.firestore.Timestamp.fromDate(responseTime),
        ...sandboxTag(),
      });
      batchCount++;

      responseCount++;
      if (responseCount === 1) firstResponseAt = responseTime;
      if (responseCount === 2) secondResponseAt = responseTime;

      if (batchCount >= 490) {
        await batch.commit();
        batch = ctx.db.batch();
        batchCount = 0;
      }
    }

    const status = responseCount === 2 ? 'completed' : responseCount === 1 ? 'partial' : 'expired';
    assignmentUpdates.set(assignment.id, {
      status,
      response_count: responseCount,
      first_response_at: firstResponseAt ? admin.firestore.Timestamp.fromDate(firstResponseAt) : null,
      second_response_at: secondResponseAt ? admin.firestore.Timestamp.fromDate(secondResponseAt) : null,
      completed_at: status === 'completed' && secondResponseAt
        ? admin.firestore.Timestamp.fromDate(secondResponseAt) : null,
      updated_at: admin.firestore.Timestamp.fromDate(
        secondResponseAt || firstResponseAt || assignment.date
      ),
    });

    ctx.responses.push(record);
  }

  if (batchCount > 0) await batch.commit();

  let updateBatch = ctx.db.batch();
  let updateCount = 0;
  for (const [id, data] of assignmentUpdates) {
    updateBatch.update(ctx.db.collection('prompt_assignments').doc(id), data);
    updateCount++;
    if (updateCount >= 490) {
      await updateBatch.commit();
      updateBatch = ctx.db.batch();
      updateCount = 0;
    }
  }
  if (updateCount > 0) await updateBatch.commit();

  const total = ctx.responses.filter(r => r.user1Responded).length
    + ctx.responses.filter(r => r.user2Responded).length;
  console.log(`  ${total} responses created`);
}

function pickSentiment(dist: { positive: number; neutral: number; negative: number }): 'positive' | 'neutral' | 'negative' {
  const r = Math.random();
  if (r < dist.positive) return 'positive';
  if (r < dist.positive + dist.neutral) return 'neutral';
  return 'negative';
}

function pickResponseText(sentiment: 'positive' | 'neutral' | 'negative'): string {
  const pool = RESPONSE_POOL[sentiment];
  return pool[Math.floor(Math.random() * pool.length)];
}
