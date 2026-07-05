/**
 * Seed Prompts Script
 *
 * Run with: npx ts-node src/scripts/seedPrompts.ts
 *
 * Seeds into Firestore:
 *   - prompts from app/data/seed-prompts-v4.json (legacy text prompts)
 *   - prompts from app/data/seed-prompts-v5.json (v1 scored/scale prompts)
 *     (v5 is in addition to v4 — v1 selection filters to scale prompts anyway)
 *   - follow_up_templates from app/data/follow-up-templates-v1.json
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

// app/data/ — this script lives in app/functions/src/scripts/
const DATA_DIR = path.join(__dirname, '../../../data');
const PROMPT_FILES = ['seed-prompts-v4.json', 'seed-prompts-v5.json'];
const FOLLOW_UP_TEMPLATES_FILE = 'follow-up-templates-v1.json';
const BATCH_LIMIT = 400; // stay under Firestore's 500-writes-per-batch cap

interface ScaleConfigInput {
  min: number;
  max: number;
  low_threshold: number;
  high_threshold: number;
  divergence_gap: number;
  min_label: string;
  max_label: string;
}

interface PromptInput {
  id: string;
  text: string;
  hint: string | null;
  type: string;
  category?: string;
  research_basis: string;
  emotional_depth: string;
  requires_conversation: boolean;
  week_restriction: number | null;
  max_per_week: number | null;
  status: string;
  response_format?: 'text' | 'scale';
  scale_config?: ScaleConfigInput;
}

interface FollowUpTemplateInput {
  id: string;
  category: string;
  branch: 'deepener' | 'repair' | 'divergence';
  step: 1 | 2;
  text: string;
  closing_text?: string | null;
  variant: number;
  active: boolean;
}

function loadJsonFile<T>(fileName: string): T | null {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(
      `  Skipping ${fileName} — file not found at ${filePath} ` +
      '(it may still be in progress; re-run seeding once it lands).'
    );
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

async function commitInChunks(
  docs: Array<{ ref: admin.firestore.DocumentReference; data: admin.firestore.DocumentData }>
): Promise<void> {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { ref, data } of docs.slice(i, i + BATCH_LIMIT)) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

async function seedPromptsFromFile(fileName: string): Promise<number> {
  const promptsData = loadJsonFile<{
    prompts: PromptInput[];
    distribution?: Record<string, unknown>;
  }>(fileName);
  if (!promptsData) return 0;

  console.log(`Seeding ${promptsData.prompts.length} prompts from ${fileName}...`);

  const promptsRef = db.collection('prompts');
  const writes = promptsData.prompts.map((prompt) => ({
    ref: promptsRef.doc(prompt.id),
    data: {
      text: prompt.text,
      hint: prompt.hint,
      type: prompt.type,
      category: prompt.category ?? null,
      research_basis: prompt.research_basis,
      emotional_depth: prompt.emotional_depth,
      requires_conversation: prompt.requires_conversation,
      status: prompt.status,
      status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
      testing_started_at: null,

      // v1 scored prompts (null for legacy text prompts)
      response_format: prompt.response_format ?? 'text',
      scale_config: prompt.scale_config ?? null,

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
    },
  }));

  await commitInChunks(writes);

  if (promptsData.distribution) {
    console.log(`  Distribution: ${JSON.stringify(promptsData.distribution)}`);
  }
  console.log(`  Seeded ${writes.length} prompts from ${fileName}.`);
  return writes.length;
}

async function seedFollowUpTemplates(): Promise<number> {
  const templates = loadJsonFile<FollowUpTemplateInput[]>(FOLLOW_UP_TEMPLATES_FILE);
  if (!templates) return 0;

  console.log(`Seeding ${templates.length} follow-up templates...`);

  const templatesRef = db.collection('follow_up_templates');
  const writes = templates.map((template) => ({
    ref: templatesRef.doc(template.id),
    data: {
      category: template.category,
      branch: template.branch,
      step: template.step,
      text: template.text,
      closing_text: template.closing_text ?? null,
      variant: template.variant,
      active: template.active,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: 'seed-script',
    },
  }));

  await commitInChunks(writes);

  console.log(`  Seeded ${writes.length} follow-up templates.`);
  return writes.length;
}

async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`No ${collectionName} to clear.`);
    return;
  }

  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    snapshot.docs.slice(i, i + BATCH_LIMIT).forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  console.log(`Cleared ${snapshot.size} ${collectionName}.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--clear')) {
    await clearCollection('prompts');
    await clearCollection('follow_up_templates');
  }

  let promptCount = 0;
  for (const fileName of PROMPT_FILES) {
    promptCount += await seedPromptsFromFile(fileName);
  }
  const templateCount = await seedFollowUpTemplates();

  console.log(
    `\nSeed complete: ${promptCount} prompts, ${templateCount} follow-up templates.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('Error seeding:', error);
  process.exit(1);
});
