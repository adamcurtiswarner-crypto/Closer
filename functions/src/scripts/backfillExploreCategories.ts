/**
 * Backfill: category on explore prompt_assignments
 *
 * Run with: npx ts-node src/scripts/backfillExploreCategories.ts
 *
 * Explore assignments used to be written with `prompt_type` but no `category`,
 * so their completions carried category: null and never surfaced in any Hearth
 * category tile. The client now writes both on create; this backfills the
 * historical docs: category = prompt_type wherever category is missing.
 *
 * Idempotent — docs that already have a category are left untouched.
 * Dry run by default; pass --apply to write.
 *
 * For emulator usage, set FIRESTORE_EMULATOR_HOST=localhost:8080
 * For production, set GOOGLE_APPLICATION_CREDENTIALS to your service account key.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// When FIRESTORE_EMULATOR_HOST is set, the Admin SDK automatically routes
// requests to the emulator — no real credentials needed.
if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: 'closer-app-dev' });
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const BATCH_LIMIT = 400; // stay under Firestore's 500-writes-per-batch cap

async function backfillExploreCategories(apply: boolean): Promise<void> {
  const snapshot = await db
    .collection('prompt_assignments')
    .where('source', '==', 'explore')
    .get();

  console.log(`Found ${snapshot.size} explore assignments`);

  const missing = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return !data.category && typeof data.prompt_type === 'string' && data.prompt_type.length > 0;
  });
  const unmappable = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return !data.category && !data.prompt_type;
  });

  console.log(`${missing.length} missing category (backfillable from prompt_type)`);
  if (unmappable.length > 0) {
    console.warn(
      `${unmappable.length} docs have neither category nor prompt_type — skipped:`,
      unmappable.map((d) => d.id)
    );
  }

  if (!apply) {
    for (const doc of missing) {
      console.log(`[dry-run] ${doc.id}: category <- ${doc.data().prompt_type}`);
    }
    console.log('Dry run complete. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = missing.slice(i, i + BATCH_LIMIT);
    for (const doc of chunk) {
      batch.update(doc.ref, {
        category: doc.data().prompt_type,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`Committed ${updated}/${missing.length}`);
  }

  console.log(`Backfill complete: ${updated} assignments updated`);
}

const apply = process.argv.includes('--apply');
backfillExploreCategories(apply)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
