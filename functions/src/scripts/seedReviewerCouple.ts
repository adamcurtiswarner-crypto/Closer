/**
 * Seed the App Review demo couple for the ONE-DEVICE review path.
 *
 * Dry run (default): npx ts-node src/scripts/seedReviewerCouple.ts
 * Apply:             npx ts-node src/scripts/seedReviewerCouple.ts --apply
 *
 * Why: App Review usually tests on a single device. Stoke's daily loop needs
 * BOTH partners to answer before the reveal, so a reviewer signing in as one
 * account would only ever see the sealed "waiting for your partner" state.
 * This script stages the demo couple so a reviewer signing in as Partner B
 * ALONE experiences the full loop: today's question is waiting with Partner A
 * already answered (score 9 + a warm note) → B responds → the reveal opens →
 * because both scores land >= 9, the same-day deepener follow-up fires.
 *
 * What it ensures (idempotent — safe to re-run each morning of the review window):
 * 1. TODAY's daily assignment exists for the demo couple (America/Los_Angeles
 *    local day), on an active scale prompt whose category has live deepener
 *    templates; stale live assignments from earlier days are expired.
 * 2. Partner A's response is already submitted (deterministic id
 *    `${assignmentId}_${uidA}`, score 9) and the assignment is 'partial'.
 * 3. Couple-scoped premium: /subscriptions/{uidA} (couple_id + status active +
 *    far-future expires_at — the exact shape revenueCatWebhook writes and
 *    src/hooks/useSubscription.ts checks) plus the couples.premium_until
 *    mirror, so BOTH demo accounts resolve premium with no purchase.
 * 4. Both members carry the coupleId custom auth claim (Storage rules need it).
 * 5. Read-only report of existing Hearth/Explore history so we know the
 *    reviewer has something to browse.
 *
 * For emulator usage set FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST.
 * For production set GOOGLE_APPLICATION_CREDENTIALS to a service account key.
 */

import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Project bootstrap — MUST run before ../shared loads.
//
// shared.ts calls admin.initializeApp() with NO options at import time, and
// the Auth admin API cannot infer the project from ADC alone (see the same
// fix in backfillCoupleClaims.ts) — without a projectId every getUser()
// errors. Bare initializeApp() DOES honor GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT,
// so we inject the project via env here and defer every import that touches
// shared.ts (invites, prompts) to dynamic import() inside main().
// ---------------------------------------------------------------------------
const IS_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = IS_EMULATOR
  ? 'closer-app-dev'
  : process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'stoke-5f762';
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

const isApply = process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTNER_A_EMAIL = 'stoke.uitest.a@example.com'; // pre-seeded answerer
const PARTNER_B_EMAIL = 'stoke.uitest.b@example.com'; // the reviewer signs in here

/** Review staging runs on Apple's clock coast-agnostically; PT is fine. */
const REVIEW_TIMEZONE = 'America/Los_Angeles';

/**
 * Both scores >= high_threshold (9) fire the same-day deepener. Seeding A at
 * 9 means the reviewer triggers it by answering 9 or 10 (review notes say so).
 */
const PARTNER_A_SCORE = 9;

/** Far-future expiry so the demo premium never lapses mid-review. */
const PREMIUM_EXPIRES_AT = new Date('2036-12-31T00:00:00Z');

/**
 * Categories tried in order when creating today's assignment. Warm categories
 * first so a score-9 answer reads believably; every candidate is still
 * verified to have >= 1 active deepener step-1 template before selection.
 */
const PREFERRED_CATEGORIES: readonly string[] = [
  'appreciation_trust',
  'affection',
  'everyday_life',
  'communication',
  'fun_play',
];

/** Warm, believable Partner A notes, keyed by prompt category. */
const ANSWER_BY_CATEGORY: Record<string, string> = {
  appreciation_trust:
    'Honestly, this stretch has felt really good. You have been noticing the small stuff — the coffee before I ask, checking in after my long days — and it adds up. I feel looked after.',
  affection:
    'The little moments lately — a hand on my shoulder while I cook, the way you lean in when we talk — have made me feel close to you all week. I do not want to take that for granted.',
  everyday_life:
    'Our ordinary days have felt easy lately. Splitting the small chores without keeping score, the walk after dinner — it is quiet, but it is my favorite part of us right now.',
  communication:
    'I feel like we have actually been hearing each other lately. You asked a follow-up question the other night instead of jumping in, and it changed the whole conversation.',
  fun_play:
    'We have been laughing more this month than we have in a while. The dumb kitchen dance party on Tuesday is still making me smile. More of that, please.',
};

const ANSWER_FALLBACK =
  'This one is easy to answer well right now — things between us have felt warm and steady lately, and I can name the little moments that got us here.';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Modules that transitively load shared.ts — imported after env bootstrap. */
interface LoadedModules {
  db: admin.firestore.Firestore;
  setCoupleClaim: (userId: string, coupleId: string | null) => Promise<void>;
  assignmentDateWindow: (
    timezone: string,
    now?: Date
  ) => { yesterday: string; today: string; tomorrow: string };
}

interface DemoCouple {
  coupleId: string;
  uidA: string;
  uidB: string;
  coupleData: admin.firestore.DocumentData;
}

interface SeedReport {
  assignmentId: string | null;
  assignmentCreated: boolean;
  assignmentReused: boolean;
  staleExpired: number;
  responseSeeded: boolean;
  promptText: string | null;
  promptCategory: string | null;
  subscriptionWritten: boolean;
  premiumMirrorWritten: boolean;
  claimsSet: number;
  completionsCount: number;
  exploreCount: number;
  warnings: string[];
}

function newReport(): SeedReport {
  return {
    assignmentId: null,
    assignmentCreated: false,
    assignmentReused: false,
    staleExpired: 0,
    responseSeeded: false,
    promptText: null,
    promptCategory: null,
    subscriptionWritten: false,
    premiumMirrorWritten: false,
    claimsSet: 0,
    completionsCount: 0,
    exploreCount: 0,
    warnings: [],
  };
}

function warn(report: SeedReport, message: string): void {
  report.warnings.push(message);
  console.warn(`  WARN ${message}`);
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Loads shared-dependent modules AFTER the project env is bootstrapped. */
async function loadModules(): Promise<LoadedModules> {
  const shared = await import('../shared'); // triggers admin.initializeApp()
  const invites = await import('../invites');
  const prompts = await import('../prompts');
  return {
    db: shared.db,
    setCoupleClaim: invites.setCoupleClaim,
    assignmentDateWindow: prompts.assignmentDateWindow,
  };
}

/** Finds the demo couple by BOTH member emails; fails loudly when absent. */
async function findDemoCouple(db: admin.firestore.Firestore): Promise<DemoCouple> {
  const [userA, userB] = await Promise.all([
    admin.auth().getUserByEmail(PARTNER_A_EMAIL),
    admin.auth().getUserByEmail(PARTNER_B_EMAIL),
  ]);

  const couplesSnap = await db
    .collection('couples')
    .where('member_ids', 'array-contains', userA.uid)
    .get();

  const coupleDoc = couplesSnap.docs.find((doc) =>
    (doc.data().member_ids || []).includes(userB.uid)
  );
  if (!coupleDoc) {
    throw new Error(
      `No couple doc contains both ${PARTNER_A_EMAIL} and ${PARTNER_B_EMAIL} — ` +
        'pair the demo accounts in-app first, then re-run.'
    );
  }

  const coupleData = coupleDoc.data();
  if (coupleData.status !== 'active') {
    throw new Error(
      `Demo couple ${coupleDoc.id} has status '${coupleData.status}' (needs 'active'). ` +
        'Re-pair the demo accounts before seeding.'
    );
  }

  console.log(
    `Demo couple ${coupleDoc.id}: A=${userA.uid} (${PARTNER_A_EMAIL}), B=${userB.uid} (${PARTNER_B_EMAIL})`
  );
  return { coupleId: coupleDoc.id, uidA: userA.uid, uidB: userB.uid, coupleData };
}

// ---------------------------------------------------------------------------
// Step 1 — today's daily assignment
// ---------------------------------------------------------------------------

/**
 * Picks an active scale prompt for the demo assignment: not assigned to this
 * couple in the last 30 days, preferring warm categories that have at least
 * one active deepener step-1 template (so the follow-up demo cannot dead-end).
 */
async function pickReviewPrompt(
  db: admin.firestore.Firestore,
  coupleId: string,
  report: SeedReport
): Promise<{ id: string; data: admin.firestore.DocumentData } | null> {
  const promptsSnap = await db.collection('prompts').where('status', '==', 'active').get();
  const scaleDocs = promptsSnap.docs.filter((doc) => doc.data().response_format === 'scale');
  if (scaleDocs.length === 0) {
    warn(report, 'No active scale prompts exist — cannot stage the daily assignment.');
    return null;
  }

  // Exclude prompts this couple saw in the last 30 days (mirrors delivery).
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const recentSnap = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', thirtyDaysAgo)
    .get();
  const recentPromptIds = new Set(recentSnap.docs.map((doc) => doc.data().prompt_id));
  const fresh = scaleDocs.filter((doc) => !recentPromptIds.has(doc.id));
  const pool = fresh.length > 0 ? fresh : scaleDocs;
  if (fresh.length === 0) {
    warn(report, 'Every active scale prompt was assigned in the last 30 days — reusing one.');
  }

  // Prefer warm categories whose deepener templates are confirmed live.
  for (const category of PREFERRED_CATEGORIES) {
    const candidate = pool.find((doc) => doc.data().category === category);
    if (!candidate) continue;
    const templatesSnap = await db
      .collection('follow_up_templates')
      .where('category', '==', category)
      .where('branch', '==', 'deepener')
      .where('step', '==', 1)
      .where('active', '==', true)
      .limit(1)
      .get();
    if (!templatesSnap.empty) {
      return { id: candidate.id, data: candidate.data() };
    }
    warn(report, `Category '${category}' has no active deepener template — skipping it.`);
  }

  warn(report, 'No preferred-category prompt had deepener templates; using first pool prompt.');
  const fallback = pool[0];
  return { id: fallback.id, data: fallback.data() };
}

/** Mirrors the assignment shape deliverPromptToCouple writes (prompts.ts). */
function buildAssignmentDoc(
  coupleId: string,
  promptId: string,
  prompt: admin.firestore.DocumentData,
  today: string
): Record<string, unknown> {
  return {
    couple_id: coupleId,
    prompt_id: promptId,
    prompt_text: prompt.text,
    prompt_hint: prompt.hint ?? null,
    prompt_type: prompt.type,
    requires_conversation: prompt.requires_conversation ?? false,
    category: prompt.category || null,
    response_format: 'scale',
    scale_config: prompt.scale_config || {
      min: 1,
      max: 10,
      low_threshold: 4,
      high_threshold: 9,
      divergence_gap: 4,
      min_label: 'Struggling',
      max_label: 'Thriving',
    },
    assignment_kind: 'daily',
    assigned_date: today,
    source: 'daily',
    delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    delivery_timezone: REVIEW_TIMEZONE,
    status: 'delivered',
    completed_at: null,
    response_count: 0,
    first_response_at: null,
    second_response_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Ensures exactly one live daily-track assignment dated today: expires stale
 * live ones from earlier local days, reuses today's when it is a reviewable
 * scale daily, and otherwise creates a fresh one.
 * Returns the assignment id plus whether Partner A's response still needs
 * seeding (null id means today cannot be staged — e.g. already completed).
 */
async function ensureTodayAssignment(
  db: admin.firestore.Firestore,
  modules: LoadedModules,
  couple: DemoCouple,
  report: SeedReport
): Promise<{ assignmentId: string | null; assignmentData: admin.firestore.DocumentData | null }> {
  const { yesterday, today, tomorrow } = modules.assignmentDateWindow(REVIEW_TIMEZONE);
  console.log(`Local window (${REVIEW_TIMEZONE}): ${yesterday} … ${tomorrow}, today=${today}`);

  const windowSnap = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', couple.coupleId)
    .where('assigned_date', '>=', yesterday)
    .where('assigned_date', '<=', tomorrow)
    .get();

  let todayDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  for (const doc of windowSnap.docs) {
    const data = doc.data();
    if (data.source === 'explore') continue; // parallel track — never touched
    if (data.assigned_date === today) {
      if (!todayDoc) todayDoc = doc;
      continue;
    }
    // Stale live assignment from another local day would block the client's
    // window query — expire it (demo couple only; mirrors expireStalePrompts).
    if (data.status !== 'expired' && data.status !== 'completed') {
      report.staleExpired++;
      if (isApply) {
        await doc.ref.update({
          status: 'expired',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  expired stale assignment ${doc.id} (${data.assigned_date})`);
      } else {
        console.log(`  DRY-RUN would expire stale assignment ${doc.id} (${data.assigned_date})`);
      }
    }
  }

  if (todayDoc) {
    const data = todayDoc.data();
    if (data.status === 'completed') {
      warn(
        report,
        `Today's assignment ${todayDoc.id} is already completed — the reviewer would land on ` +
          'the revealed state. Re-run tomorrow morning (PT) for the fresh answer→reveal path.'
      );
      report.assignmentId = todayDoc.id;
      return { assignmentId: null, assignmentData: null };
    }
    if (data.assignment_kind !== 'daily' || data.response_format !== 'scale') {
      warn(
        report,
        `Today's assignment ${todayDoc.id} is ${data.assignment_kind}/${data.response_format}, ` +
          'not a scale daily — scores and the deepener demo do not apply to it. Not replacing it.'
      );
      report.assignmentId = todayDoc.id;
      return { assignmentId: null, assignmentData: null };
    }
    console.log(`Reusing today's assignment ${todayDoc.id} (status ${data.status})`);
    report.assignmentId = todayDoc.id;
    report.assignmentReused = true;
    report.promptText = data.prompt_text || null;
    report.promptCategory = data.category || null;
    return { assignmentId: todayDoc.id, assignmentData: data };
  }

  const prompt = await pickReviewPrompt(db, couple.coupleId, report);
  if (!prompt) return { assignmentId: null, assignmentData: null };

  report.promptText = prompt.data.text || null;
  report.promptCategory = prompt.data.category || null;
  const assignmentDoc = buildAssignmentDoc(couple.coupleId, prompt.id, prompt.data, today);

  if (isApply) {
    const ref = await db.collection('prompt_assignments').add(assignmentDoc);
    console.log(`Created today's assignment ${ref.id} — "${prompt.data.text}"`);
    report.assignmentId = ref.id;
    report.assignmentCreated = true;
    return { assignmentId: ref.id, assignmentData: assignmentDoc };
  }

  console.log(`DRY-RUN would create today's assignment — "${prompt.data.text}"`);
  report.assignmentCreated = true;
  report.assignmentId = 'DRY_RUN_ASSIGNMENT';
  return { assignmentId: 'DRY_RUN_ASSIGNMENT', assignmentData: assignmentDoc };
}

// ---------------------------------------------------------------------------
// Step 2 — Partner A's submitted response
// ---------------------------------------------------------------------------

/**
 * Seeds Partner A's response exactly the way the client writes it
 * (deterministic id `${assignmentId}_${uid}`, same field set as
 * useSubmitResponse) and moves the assignment to 'partial'. In production
 * the write fires onResponseSubmitted, which with one distinct response only
 * nudges Partner B — the demo accounts have no push tokens, so it is a no-op.
 */
async function seedPartnerAResponse(
  db: admin.firestore.Firestore,
  couple: DemoCouple,
  assignmentId: string,
  assignmentData: admin.firestore.DocumentData,
  report: SeedReport
): Promise<void> {
  const isDryRunId = assignmentId === 'DRY_RUN_ASSIGNMENT';
  const responseId = `${assignmentId}_${couple.uidA}`;

  if (!isDryRunId) {
    const existingA = await db.collection('prompt_responses').doc(responseId).get();
    if (existingA.exists) {
      console.log(`Partner A response ${responseId} already exists — leaving it alone.`);
      report.responseSeeded = true;
      return;
    }
    const existingB = await db
      .collection('prompt_responses')
      .doc(`${assignmentId}_${couple.uidB}`)
      .get();
    if (existingB.exists) {
      warn(
        report,
        "Partner B already answered today's assignment — seeding A would complete the reveal " +
          'before the reviewer signs in. Skipping the response seed; re-run tomorrow.'
      );
      return;
    }
  }

  const category: string = assignmentData.category || '';
  const responseText = ANSWER_BY_CATEGORY[category] || ANSWER_FALLBACK;

  const responseDoc = {
    assignment_id: assignmentId,
    couple_id: couple.coupleId,
    user_id: couple.uidA,
    prompt_id: assignmentData.prompt_id,
    response_text: responseText,
    response_score: PARTNER_A_SCORE,
    image_url: null,
    status: 'submitted',
    submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    emotional_response: null,
    talked_about_it: null,
    response_length: responseText.length,
    time_to_respond_seconds: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  const assignmentUpdates = {
    response_count: 1,
    first_response_at: admin.firestore.FieldValue.serverTimestamp(),
    first_responder_id: couple.uidA,
    status: 'partial',
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (isApply && !isDryRunId) {
    await db.collection('prompt_responses').doc(responseId).set(responseDoc);
    await db.collection('prompt_assignments').doc(assignmentId).update(assignmentUpdates);
    console.log(`Seeded Partner A response ${responseId} (score ${PARTNER_A_SCORE}) → assignment partial`);
  } else {
    console.log(
      `DRY-RUN would seed Partner A response (score ${PARTNER_A_SCORE}) and mark the assignment partial`
    );
  }
  report.responseSeeded = true;
}

// ---------------------------------------------------------------------------
// Step 3 — couple-scoped premium entitlement
// ---------------------------------------------------------------------------

/**
 * Grants the demo couple premium through the same two writes the RevenueCat
 * webhook makes (functions/src/admin.ts): a /subscriptions/{uidA} doc that
 * useSubscription's couple-scoped query matches (couple_id + status 'active'
 * + live expires_at), and the couples.premium_until mirror.
 */
async function ensureDemoPremium(
  db: admin.firestore.Firestore,
  couple: DemoCouple,
  report: SeedReport
): Promise<void> {
  const expiresAt = admin.firestore.Timestamp.fromDate(PREMIUM_EXPIRES_AT);

  const subscriptionDoc = {
    user_id: couple.uidA,
    couple_id: couple.coupleId,
    status: 'active',
    plan: 'premium',
    platform: 'promo', // manually granted for App Review, not a store purchase
    expires_at: expiresAt,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  const coupleUpdates = {
    premium_until: expiresAt,
    premium_source: couple.uidA,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (isApply) {
    await db.collection('subscriptions').doc(couple.uidA).set(subscriptionDoc, { merge: true });
    await db.collection('couples').doc(couple.coupleId).update(coupleUpdates);
    console.log(
      `Premium granted: subscriptions/${couple.uidA} active until ${PREMIUM_EXPIRES_AT.toISOString()} ` +
        `+ couples/${couple.coupleId}.premium_until mirror`
    );
  } else {
    console.log(
      `DRY-RUN would write subscriptions/${couple.uidA} (status active, couple_id ${couple.coupleId}, ` +
        `expires ${PREMIUM_EXPIRES_AT.toISOString()}) and couples.premium_until mirror`
    );
  }
  report.subscriptionWritten = true;
  report.premiumMirrorWritten = true;
}

// ---------------------------------------------------------------------------
// Step 4 — coupleId custom claims
// ---------------------------------------------------------------------------

/** Ensures both demo members carry the coupleId claim (Storage rules need it). */
async function ensureCoupleClaims(
  modules: LoadedModules,
  couple: DemoCouple,
  report: SeedReport
): Promise<void> {
  for (const uid of [couple.uidA, couple.uidB]) {
    const userRecord = await admin.auth().getUser(uid);
    const currentClaim = (userRecord.customClaims || {}).coupleId;
    if (currentClaim === couple.coupleId) {
      console.log(`Claim already correct for ${uid}`);
      continue;
    }
    if (isApply) {
      await modules.setCoupleClaim(uid, couple.coupleId);
      console.log(`SET claim coupleId=${couple.coupleId} for ${uid}`);
    } else {
      console.log(`DRY-RUN would set claim coupleId=${couple.coupleId} for ${uid}`);
    }
    report.claimsSet++;
  }
}

// ---------------------------------------------------------------------------
// Step 5 — read-only history report (Hearth + Explore browsing content)
// ---------------------------------------------------------------------------

async function reportBrowsableHistory(
  db: admin.firestore.Firestore,
  couple: DemoCouple,
  report: SeedReport
): Promise<void> {
  const [completionsSnap, exploreSnap] = await Promise.all([
    db.collection('prompt_completions').where('couple_id', '==', couple.coupleId).get(),
    db
      .collection('prompt_assignments')
      .where('couple_id', '==', couple.coupleId)
      .where('source', '==', 'explore')
      .get(),
  ]);
  report.completionsCount = completionsSnap.size;
  report.exploreCount = exploreSnap.size;

  console.log(
    `History: ${completionsSnap.size} completions (Hearth) · ${exploreSnap.size} explore assignments`
  );
  if (completionsSnap.size === 0) {
    warn(report, 'Hearth has ZERO completions to browse — the review notes promise seeded history.');
  }
  if (exploreSnap.size === 0) {
    warn(report, 'No explore history exists — send a couple of Explore questions between the demo accounts.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printSummary(report: SeedReport): void {
  console.log('\n=== Reviewer seed summary ===');
  console.log(`mode:                ${isApply ? 'APPLY' : 'dry run'}`);
  console.log(`project:             ${PROJECT_ID}${IS_EMULATOR ? ' (emulator)' : ''}`);
  console.log(`assignment:          ${report.assignmentId ?? 'not staged'}`);
  console.log(`  created/reused:    ${report.assignmentCreated ? 'created' : report.assignmentReused ? 'reused' : 'n/a'}`);
  console.log(`  prompt:            ${report.promptText ?? 'n/a'} [${report.promptCategory ?? '-'}]`);
  console.log(`  stale expired:     ${report.staleExpired}`);
  console.log(`partner A response:  ${report.responseSeeded ? `seeded/present (score ${PARTNER_A_SCORE})` : 'NOT seeded'}`);
  console.log(`premium:             ${report.subscriptionWritten ? 'subscription doc + couple mirror' : 'NOT written'}`);
  console.log(`claims set:          ${report.claimsSet} (0 = both already correct)`);
  console.log(`hearth completions:  ${report.completionsCount}`);
  console.log(`explore history:     ${report.exploreCount}`);
  if (report.warnings.length > 0) {
    console.log(`warnings:            ${report.warnings.length} (see WARN lines above)`);
  }
  if (!isApply) {
    console.log('\nRe-run with --apply to write.');
  }
}

async function main(): Promise<void> {
  console.log(
    isApply
      ? 'Seeding reviewer demo couple (APPLY mode — writing)'
      : 'Seeding reviewer demo couple (dry run — pass --apply to write)'
  );

  const modules = await loadModules();
  const { db } = modules;
  const report = newReport();

  const couple = await findDemoCouple(db);

  const { assignmentId, assignmentData } = await ensureTodayAssignment(db, modules, couple, report);
  if (assignmentId && assignmentData) {
    await seedPartnerAResponse(db, couple, assignmentId, assignmentData, report);
  }

  await ensureDemoPremium(db, couple, report);
  await ensureCoupleClaims(modules, couple, report);
  await reportBrowsableHistory(db, couple, report);

  printSummary(report);

  if (!report.assignmentId || !report.responseSeeded) {
    console.error('\nReview path is NOT fully staged — resolve the warnings above before submitting.');
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error('Reviewer seed failed:', error);
    process.exit(1);
  });
