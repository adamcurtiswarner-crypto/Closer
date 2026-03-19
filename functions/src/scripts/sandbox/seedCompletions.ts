import * as admin from 'firebase-admin';
import { SandboxContext, getWeekId, pickWeighted, sandboxTag } from './config';

export async function seedCompletions(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let count = 0;
  let batchCount = 0;

  for (let i = 0; i < ctx.assignments.length; i++) {
    const assignment = ctx.assignments[i];
    const response = ctx.responses[i];

    if (!response.user1Responded || !response.user2Responded) continue;

    const completedAt = response.user2ResponseTime! > response.user1ResponseTime!
      ? response.user2ResponseTime! : response.user1ResponseTime!;
    const timeToComplete = Math.abs(
      (response.user2ResponseTime!.getTime() - response.user1ResponseTime!.getTime()) / 1000
    );

    const completionData: Record<string, unknown> = {
      assignment_id: assignment.id,
      couple_id: ctx.coupleId,
      prompt_id: assignment.promptId,
      responses: [
        {
          user_id: ctx.user1Id,
          response_text: '[encrypted]',
          response_text_encrypted: 'sandbox response',
          image_url: null,
          submitted_at: admin.firestore.Timestamp.fromDate(response.user1ResponseTime!),
        },
        {
          user_id: ctx.user2Id,
          response_text: '[encrypted]',
          response_text_encrypted: 'sandbox response',
          image_url: null,
          submitted_at: admin.firestore.Timestamp.fromDate(response.user2ResponseTime!),
        },
      ],
      time_to_complete_seconds: Math.round(timeToComplete),
      total_response_length: 0,
      emotional_responses: [],
      talked_about_it: false,
      week: getWeekId(completedAt),
      is_memory_saved: false,
      completed_at: admin.firestore.Timestamp.fromDate(completedAt),
      created_at: admin.firestore.Timestamp.fromDate(completedAt),
      ...sandboxTag(),
    };

    if (Math.random() < ctx.config.reactionProbability) {
      const reactorId = Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id;
      const reactionType = pickWeighted([
        { value: 'heart', weight: 55 },
        { value: 'thoughtful', weight: 25 },
        { value: 'laugh', weight: 12 },
        { value: 'teary', weight: 8 },
      ]);
      completionData.reactions = { [reactorId]: reactionType };
    }

    const ref = ctx.db.collection('prompt_completions').doc(assignment.id);
    batch.set(ref, completionData);
    count++;
    batchCount++;

    if (batchCount >= 490) {
      await batch.commit();
      batch = ctx.db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`  ${count} completions created`);
}
