/**
 * One-time migration: retokenize live prompt content for personalization.
 *
 * Run with: npx ts-node src/scripts/retokenizePrompts.ts
 *
 * Applies the same "your partner" → "{partner}" transformation as the seed
 * data (see retokenize.ts) to the live `prompts` (text, hint) and
 * `follow_up_templates` (text, closing_text) collections, so already-seeded
 * environments match the retokenized seed files.
 *
 * Only docs whose transformed text actually differs are updated — idempotent,
 * safe to re-run. Denormalized copies (prompt_assignments.prompt_text,
 * prompt_completions.prompt_text) are intentionally NOT migrated: historical
 * assignments/completions keep the text the couple actually answered.
 *
 * Dry run by default; pass --apply to write.
 *
 * For emulator usage, set FIRESTORE_EMULATOR_HOST=localhost:8080
 * For production, set GOOGLE_APPLICATION_CREDENTIALS to your service account key.
 */

import * as admin from 'firebase-admin';
import {
  retokenizeFields,
  PROMPT_TEXT_FIELDS,
  FOLLOW_UP_TEMPLATE_TEXT_FIELDS,
} from './retokenize';

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

interface PendingUpdate {
  ref: FirebaseFirestore.DocumentReference;
  id: string;
  changes: Record<string, string>;
}

async function collectUpdates(
  collectionName: string,
  fields: readonly string[]
): Promise<PendingUpdate[]> {
  const snapshot = await db.collection(collectionName).get();
  console.log(`${collectionName}: ${snapshot.size} docs scanned`);

  const updates: PendingUpdate[] = [];
  for (const doc of snapshot.docs) {
    const changes = retokenizeFields(doc.data(), fields);
    if (Object.keys(changes).length > 0) {
      updates.push({ ref: doc.ref, id: doc.id, changes });
    }
  }
  console.log(`${collectionName}: ${updates.length} docs need retokenizing`);
  return updates;
}

async function commitUpdates(label: string, updates: PendingUpdate[]): Promise<void> {
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + BATCH_LIMIT);
    for (const update of chunk) {
      batch.update(update.ref, {
        ...update.changes,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`${label}: committed ${written}/${updates.length}`);
  }
}

async function retokenizePrompts(apply: boolean): Promise<void> {
  const promptUpdates = await collectUpdates('prompts', PROMPT_TEXT_FIELDS);
  const templateUpdates = await collectUpdates(
    'follow_up_templates',
    FOLLOW_UP_TEMPLATE_TEXT_FIELDS
  );

  if (!apply) {
    for (const update of [...promptUpdates, ...templateUpdates]) {
      for (const [field, value] of Object.entries(update.changes)) {
        console.log(`[dry-run] ${update.ref.path} ${field} -> ${value}`);
      }
    }
    console.log('Dry run complete. Re-run with --apply to write.');
    return;
  }

  await commitUpdates('prompts', promptUpdates);
  await commitUpdates('follow_up_templates', templateUpdates);

  console.log(
    `Retokenize complete: ${promptUpdates.length} prompts, ` +
      `${templateUpdates.length} follow-up templates updated`
  );
}

const apply = process.argv.includes('--apply');
retokenizePrompts(apply)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Retokenize failed:', err);
    process.exit(1);
  });
