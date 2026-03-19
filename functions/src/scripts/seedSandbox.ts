import * as admin from 'firebase-admin';
import * as readline from 'readline';
import { DEFAULT_CONFIG, SandboxContext } from './sandbox/config';
import { seedUsers } from './sandbox/seedUsers';
import { seedCouple } from './sandbox/seedCouple';
import { seedPromptAssignments } from './sandbox/seedPromptAssignments';
import { seedResponses } from './sandbox/seedResponses';
import { seedCompletions } from './sandbox/seedCompletions';
import { seedCoaching } from './sandbox/seedCoaching';
import { seedPulseScores } from './sandbox/seedPulseScores';
import { seedChat } from './sandbox/seedChat';
import { seedGoals } from './sandbox/seedGoals';
import { seedWishlist } from './sandbox/seedWishlist';
import { seedPhotos } from './sandbox/seedPhotos';
import { seedStreaks } from './sandbox/seedStreaks';
import { seedCheckIns } from './sandbox/seedCheckIns';
import { clearSandbox } from './sandbox/clearSandbox';

function parseArgs(argv: string[]): {
  production: boolean;
  backfill: string | null;
  live: boolean;
  clear: boolean;
  only: string[] | null;
  dryRun: boolean;
} {
  const args = argv.slice(2);
  return {
    production: args.includes('--production'),
    backfill: args.includes('--backfill')
      ? args[args.indexOf('--backfill') + 1] || null
      : null,
    live: args.includes('--live'),
    clear: args.includes('--clear'),
    only: args.includes('--only')
      ? (args[args.indexOf('--only') + 1] || '').split(',')
      : null,
    dryRun: args.includes('--dry-run'),
  };
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} Type 'yes' to continue: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv);

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: 'closer-app-dev' });
    console.log('Connected to emulator');
  } else if (flags.production) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Connected to PRODUCTION');
  } else {
    console.error('No emulator detected and --production not set. Aborting.');
    process.exit(1);
  }

  const db = admin.firestore();
  const auth = admin.auth();

  if (flags.production) {
    const ok = await confirm(
      'You are about to write ~830 documents to PRODUCTION Firestore.'
    );
    if (!ok) { process.exit(0); }
  }
  if (flags.backfill) {
    const ok = await confirm(
      `This will add sandbox data to couple ${flags.backfill}. Existing data will NOT be deleted.`
    );
    if (!ok) { process.exit(0); }
  }

  if (flags.clear) {
    const coupleId = flags.backfill || 'sandbox-couple-001';
    await clearSandbox(db, coupleId, flags.production);
    console.log('Sandbox data cleared.');
    process.exit(0);
  }

  const promptsSnap = await db.collection('prompts').get();
  if (promptsSnap.empty) {
    console.error('No prompts found. Run seed:emulator first.');
    process.exit(1);
  }
  const promptIds = promptsSnap.docs.map(d => d.id);
  const promptMap = new Map(
    promptsSnap.docs.map(d => [d.id, {
      text: d.data().text,
      hint: d.data().hint,
      type: d.data().type,
      requires_conversation: d.data().requires_conversation,
    }])
  );

  let user1Id: string;
  let user2Id: string;
  let coupleId: string;

  if (flags.backfill) {
    coupleId = flags.backfill;
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) {
      console.error(`Couple ${coupleId} not found.`);
      process.exit(1);
    }
    const memberIds = coupleDoc.data()!.member_ids;
    user1Id = memberIds[0];
    user2Id = memberIds[1];
    console.log(`Backfill mode: couple=${coupleId}, users=${user1Id}, ${user2Id}`);
  } else {
    const users = await seedUsers(db, auth, DEFAULT_CONFIG);
    user1Id = users.user1Id;
    user2Id = users.user2Id;
    coupleId = 'sandbox-couple-001';
    await seedCouple(db, DEFAULT_CONFIG, coupleId, user1Id, user2Id);
  }

  const ctx: SandboxContext = {
    config: DEFAULT_CONFIG,
    db,
    auth,
    user1Id,
    user2Id,
    coupleId,
    isProduction: flags.production,
    isBackfill: !!flags.backfill,
    isLive: flags.live,
    dryRun: flags.dryRun,
    promptIds,
    promptMap,
    assignments: [],
    responses: [],
  };

  const modules: Record<string, (ctx: SandboxContext) => Promise<void>> = {
    assignments: seedPromptAssignments,
    responses: seedResponses,
    completions: seedCompletions,
    streaks: seedStreaks,
    coaching: seedCoaching,
    pulseScores: seedPulseScores,
    chat: seedChat,
    goals: seedGoals,
    wishlist: seedWishlist,
    photos: seedPhotos,
    checkIns: seedCheckIns,
  };

  const order = [
    'assignments', 'responses', 'completions', 'streaks',
    'coaching', 'pulseScores', 'chat', 'goals', 'wishlist', 'photos', 'checkIns',
  ];

  for (const name of order) {
    if (flags.only && !flags.only.includes(name)) continue;
    console.log(`\nSeeding ${name}...`);
    await modules[name](ctx);
    console.log(`  ${name} done.`);
  }

  console.log('\nSandbox seeding complete!');
  console.log(`  Couple: ${coupleId}`);
  console.log(`  User 1: ${user1Id} (${DEFAULT_CONFIG.users.user1.email})`);
  console.log(`  User 2: ${user2Id} (${DEFAULT_CONFIG.users.user2.email})`);
  console.log(`  Password: ${DEFAULT_CONFIG.users.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Sandbox seed failed:', err);
  process.exit(1);
});
