import * as admin from 'firebase-admin';
import { format } from 'date-fns';
import { SandboxContext, getDayDate, sandboxTag } from './config';

export async function seedPromptAssignments(ctx: SandboxContext): Promise<void> {
  ctx.assignments = [];
  const batch = ctx.db.batch();
  let promptIndex = 0;

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const engagement = ctx.config.engagementByWeek[week];

    for (let day = 0; day < 7; day++) {
      const date = getDayDate(weeksAgo, day);
      if (date > new Date()) continue;

      const promptId = ctx.promptIds[promptIndex % ctx.promptIds.length];
      const prompt = ctx.promptMap.get(promptId)!;
      promptIndex++;

      const ref = ctx.db.collection('prompt_assignments').doc();

      batch.set(ref, {
        couple_id: ctx.coupleId,
        prompt_id: promptId,
        prompt_text: prompt.text,
        prompt_hint: prompt.hint,
        prompt_type: prompt.type,
        requires_conversation: prompt.requires_conversation,
        assigned_date: format(date, 'yyyy-MM-dd'),
        source: 'sandbox',
        delivered_at: admin.firestore.Timestamp.fromDate(date),
        delivery_timezone: 'America/Los_Angeles',
        status: 'delivered',
        completed_at: null,
        response_count: 0,
        first_response_at: null,
        second_response_at: null,
        created_at: admin.firestore.Timestamp.fromDate(date),
        updated_at: admin.firestore.Timestamp.fromDate(date),
        ...sandboxTag(),
      });

      ctx.assignments.push({ id: ref.id, promptId, date, weekIndex: week, engagement });
    }
  }

  await batch.commit();
  console.log(`  ${ctx.assignments.length} assignments created`);
}
