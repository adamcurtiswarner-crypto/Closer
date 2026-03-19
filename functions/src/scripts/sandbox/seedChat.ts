import * as admin from 'firebase-admin';
import { SandboxContext, getDayDate, randomBetween, sandboxTag } from './config';
import { CHAT_POOL } from './chatPool';

export async function seedChat(ctx: SandboxContext): Promise<void> {
  let batch = ctx.db.batch();
  let count = 0;
  let batchCount = 0;
  let lastMessageTime: Date | null = null;

  for (let week = 0; week < ctx.config.startWeeksAgo; week++) {
    const weeksAgo = ctx.config.startWeeksAgo - week;
    const engagement = ctx.config.engagementByWeek[week];

    for (let day = 0; day < 7; day++) {
      const date = getDayDate(weeksAgo, day);
      if (date > new Date()) continue;

      const { min, max } = ctx.config.chatMessagesPerDay;
      const msgCount = Math.round(min + (max - min) * engagement);

      for (let m = 0; m < msgCount; m++) {
        const hour = 7 + Math.round(Math.random() * Math.random() * 16);
        const minute = randomBetween(0, 59);
        const msgTime = new Date(date);
        msgTime.setHours(hour, minute, 0, 0);

        const senderId = Math.random() < 0.5 ? ctx.user1Id : ctx.user2Id;
        const text = pickChatMessage();

        const ref = ctx.db.collection('couples').doc(ctx.coupleId)
          .collection('messages').doc();

        batch.set(ref, {
          sender_id: senderId,
          text,
          created_at: admin.firestore.Timestamp.fromDate(msgTime),
          ...sandboxTag(),
        });

        count++;
        batchCount++;
        lastMessageTime = msgTime;

        if (batchCount >= 490) {
          await batch.commit();
          batch = ctx.db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) await batch.commit();

  if (lastMessageTime) {
    const cursorTime = new Date(lastMessageTime.getTime() - 3 * 60 * 60 * 1000);
    const cursorBatch = ctx.db.batch();
    const cursorsRef = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('chat_read_cursors');

    cursorBatch.set(cursorsRef.doc(ctx.user1Id), {
      last_read_at: admin.firestore.Timestamp.fromDate(cursorTime),
      ...sandboxTag(),
    });
    cursorBatch.set(cursorsRef.doc(ctx.user2Id), {
      last_read_at: admin.firestore.Timestamp.fromDate(cursorTime),
      ...sandboxTag(),
    });
    await cursorBatch.commit();
  }

  console.log(`  ${count} chat messages created`);
}

function pickChatMessage(): string {
  const r = Math.random();
  if (r < 0.4) {
    return CHAT_POOL.short[Math.floor(Math.random() * CHAT_POOL.short.length)];
  } else if (r < 0.85) {
    return CHAT_POOL.medium[Math.floor(Math.random() * CHAT_POOL.medium.length)];
  } else {
    return CHAT_POOL.long[Math.floor(Math.random() * CHAT_POOL.long.length)];
  }
}
