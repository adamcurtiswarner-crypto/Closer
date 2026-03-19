import * as admin from 'firebase-admin';
import { SandboxContext, getWeekStart, sandboxTag } from './config';

export async function seedPhotos(ctx: SandboxContext): Promise<void> {
  const batch = ctx.db.batch();

  for (const [i, photo] of ctx.config.photos.entries()) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - photo.weekCreated);
    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('photos').doc();

    batch.set(ref, {
      image_url: photo.imageUrl,
      caption: photo.caption,
      uploaded_by: i % 2 === 0 ? ctx.user1Id : ctx.user2Id,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      ...sandboxTag(),
    });
  }

  for (const milestone of ctx.config.milestones) {
    const createdAt = getWeekStart(ctx.config.startWeeksAgo - milestone.weekCreated);
    const milestoneDate = milestone.date || createdAt.toISOString().split('T')[0];
    const ref = ctx.db.collection('couples').doc(ctx.coupleId)
      .collection('milestones').doc();

    batch.set(ref, {
      title: milestone.title,
      category: milestone.category,
      description: milestone.description,
      image_url: null,
      date: milestoneDate,
      created_by: ctx.user1Id,
      created_at: admin.firestore.Timestamp.fromDate(createdAt),
      ...sandboxTag(),
    });
  }

  await batch.commit();
  console.log(`  ${ctx.config.photos.length} photos, ${ctx.config.milestones.length} milestones created`);
}
