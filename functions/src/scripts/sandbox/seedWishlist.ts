import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, randomBetween, sandboxTag } from './config';

export async function seedWishlist(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  ctx.config.wishlistItems.forEach((item, i) => {
    const weekCreated = randomBetween(1, ctx.config.startWeeksAgo);
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - weekCreated);
    const createdBy = i % 2 === 0 ? ctx.user1Id : ctx.user2Id;

    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('wishlist_items').doc();

    const completedAt = item.toggled
      ? new Date(createdAt.getTime() + randomBetween(7, 30) * 24 * 60 * 60 * 1000)
      : null;

    batch.set(ref, {
      text: item.text,
      created_by: createdBy,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      is_completed: item.toggled,
      completed_at: completedAt ? admin.firestore.Timestamp.fromDate(completedAt) : null,
      ...sandboxTag(),
    });
  });

  await batch.commit();
  console.log(`  ${ctx.config.wishlistItems.length} wishlist items created`);
}
