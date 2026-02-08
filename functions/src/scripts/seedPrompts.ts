/**
 * Seed Prompts Script
 *
 * Run with: npx ts-node src/scripts/seedPrompts.ts
 *
 * For emulator usage, set FIRESTORE_EMULATOR_HOST=localhost:8080
 * For production, set GOOGLE_APPLICATION_CREDENTIALS to your service account key.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

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

// Load prompts from JSON file
const promptsPath = path.join(__dirname, '../../../../data/seed-prompts.json');
const promptsData = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

interface PromptInput {
  id: string;
  text: string;
  hint: string | null;
  type: string;
  research_basis: string;
  emotional_depth: string;
  requires_conversation: boolean;
  week_restriction: number | null;
  max_per_week: number | null;
  status: string;
}

async function seedPrompts(): Promise<void> {
  console.log(`Seeding ${promptsData.prompts.length} prompts...`);

  const batch = db.batch();
  const promptsRef = db.collection('prompts');

  for (const prompt of promptsData.prompts as PromptInput[]) {
    // Use the prompt ID as the document ID
    const docRef = promptsRef.doc(prompt.id);

    batch.set(docRef, {
      text: prompt.text,
      hint: prompt.hint,
      type: prompt.type,
      research_basis: prompt.research_basis,
      emotional_depth: prompt.emotional_depth,
      requires_conversation: prompt.requires_conversation,
      status: prompt.status,
      status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
      testing_started_at: null,

      // Initialize metrics
      times_assigned: 0,
      times_completed: 0,
      completion_rate: 0,
      avg_response_length: 0,
      positive_response_rate: 0,

      // Scheduling
      week_restriction: prompt.week_restriction,
      max_per_week: prompt.max_per_week,
      day_preference: null,

      // Metadata
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: 'seed-script',
    });

    console.log(`  Added: ${prompt.id} - "${prompt.text.substring(0, 40)}..."`);
  }

  await batch.commit();

  console.log('\nSeed complete!');
  console.log(`\nDistribution:`);
  console.log(`  By type: ${JSON.stringify(promptsData.distribution.by_type)}`);
  console.log(`  By depth: ${JSON.stringify(promptsData.distribution.by_depth)}`);
  console.log(`  Requires conversation: ${promptsData.distribution.requires_conversation}`);
  console.log(`  Week restricted: ${promptsData.distribution.week_restricted}`);

  process.exit(0);
}

async function clearPrompts(): Promise<void> {
  console.log('Clearing existing prompts...');

  const snapshot = await db.collection('prompts').get();

  if (snapshot.empty) {
    console.log('No prompts to clear.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Cleared ${snapshot.size} prompts.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--clear')) {
    await clearPrompts();
  }

  await seedPrompts();
}

main().catch((error) => {
  console.error('Error seeding prompts:', error);
  process.exit(1);
});
