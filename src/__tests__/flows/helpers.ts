/**
 * Shared plumbing for the two-client emulator flow harness.
 *
 * Two layers:
 * - `FlowClient` — a real firebase WEB SDK app per user, signed in through
 *   the Auth emulator, talking to the Firestore/Functions emulators. Every
 *   read/write in the flow tests goes through this layer using the EXACT
 *   query and write shapes from src/hooks, so security rules and the
 *   deployed trigger/callable behavior are exercised end to end.
 * - `adminContext` — @firebase/rules-unit-testing withSecurityRulesDisabled,
 *   standing in for Cloud Functions / Admin SDK writes (seeding couples,
 *   assignments) and for rules-free assertions.
 *
 * Ports come from firebase.json: auth 9099, firestore 8080, functions 5001.
 */
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  RulesTestContext,
} from '@firebase/rules-unit-testing';

type AdminDb = ReturnType<RulesTestContext['firestore']>;

export const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-stoke-flows';

const EMULATOR_HOST = '127.0.0.1';
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;
const FUNCTIONS_PORT = 5001;

/** Unique per jest invocation so reruns never collide on doc ids. */
export const RUN_ID = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export interface FlowClient {
  name: string;
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  uid: string;
}

/** A fresh authed user with its own web-SDK app instance. */
export async function createFlowClient(name: string): Promise<FlowClient> {
  const app = initializeApp(
    { apiKey: 'fake-api-key', projectId: PROJECT_ID, appId: '1:flows:web:harness' },
    `flow-${name}-${RUN_ID}-${Math.random().toString(36).slice(2)}`
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, {
    disableWarnings: true,
  });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, EMULATOR_HOST, FUNCTIONS_PORT);

  const credential = await createUserWithEmailAndPassword(
    auth,
    `${name}-${RUN_ID}-${Math.random().toString(36).slice(2)}@flows.test`,
    'flow-password-123'
  );
  return { name, app, auth, db, functions, uid: credential.user.uid };
}

export async function destroyFlowClient(client: FlowClient): Promise<void> {
  try {
    await deleteApp(client.app);
  } catch {
    // Already deleted / harness teardown — never fail a suite on cleanup.
  }
}

let adminEnv: RulesTestEnvironment | null = null;

/** Rules-disabled context (the Cloud Functions / Admin SDK stand-in). */
export async function adminContext(): Promise<RulesTestEnvironment> {
  if (!adminEnv) {
    adminEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: EMULATOR_HOST, port: FIRESTORE_PORT },
    });
  }
  return adminEnv;
}

export async function adminCleanup(): Promise<void> {
  if (adminEnv) {
    await adminEnv.cleanup();
    adminEnv = null;
  }
}

/** Run `fn` with a rules-disabled Firestore (firebase-admin stand-in). */
export async function withAdminDb<T>(fn: (db: AdminDb) => Promise<T>): Promise<T> {
  const env = await adminContext();
  let result!: T;
  await env.withSecurityRulesDisabled(async (ctx) => {
    result = await fn(ctx.firestore());
  });
  return result;
}

/**
 * Poll until `check` returns a truthy value. Used to observe the Cloud
 * Functions emulator's async trigger work (completion creation, status
 * repair, discussed_at settle).
 */
export async function waitFor<T>(
  check: () => Promise<T | null | undefined | false>,
  label: string,
  { timeoutMs = 20000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | null | undefined | false = null;
  for (;;) {
    last = await check();
    if (last) return last;
    if (Date.now() >= deadline) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms: ${label} (last=${JSON.stringify(last)})`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** Device-local today as yyyy-MM-dd (TZ pinned to UTC by jest config). */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Mirrors src/utils/localDate.ts localDateWindow() for the harness process. */
export function dateWindow(): [string, string, string] {
  const dayMs = 86400000;
  const iso = (d: Date) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const now = new Date();
  return [iso(new Date(now.getTime() - dayMs)), iso(now), iso(new Date(now.getTime() + dayMs))];
}

export const DEFAULT_SCALE_CONFIG = {
  min: 1,
  max: 10,
  low_threshold: 4,
  high_threshold: 9,
  divergence_gap: 4,
  min_label: 'Struggling',
  max_label: 'Thriving',
};

/** Seed an active couple + both member user docs (Admin SDK stand-in). */
export async function seedCouple(
  coupleId: string,
  a: FlowClient,
  b: FlowClient
): Promise<void> {
  await withAdminDb(async (db) => {
    await db.doc(`couples/${coupleId}`).set({
      member_ids: [a.uid, b.uid],
      status: 'active',
      prompt_frequency: 'daily',
      created_at: new Date(),
      linked_at: new Date(),
    });
    for (const client of [a, b]) {
      await db.doc(`users/${client.uid}`).set({
        display_name: client.name,
        couple_id: coupleId,
        timezone: 'America/New_York',
        is_onboarded: true,
        is_deleted: false,
        // No push_tokens on purpose: sendPushNotification no-ops in flows.
      });
    }
  });
}

/** Seed a daily-flow assignment the way deliverPromptToCouple writes it. */
export async function seedDailyAssignment(
  assignmentId: string,
  coupleId: string,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await withAdminDb(async (db) => {
    await db.doc(`prompt_assignments/${assignmentId}`).set({
      couple_id: coupleId,
      prompt_id: `prompt-${RUN_ID}`,
      prompt_text: 'How connected do you feel today?',
      prompt_hint: null,
      prompt_type: 'communication',
      category: 'communication',
      requires_conversation: false,
      response_format: 'scale',
      scale_config: DEFAULT_SCALE_CONFIG,
      assignment_kind: 'daily',
      assigned_date: todayISO(),
      source: 'daily',
      delivered_at: new Date(),
      status: 'delivered',
      completed_at: null,
      response_count: 0,
      first_response_at: null,
      second_response_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    });
  });
}

/**
 * The EXACT submit shape from useSubmitResponse (src/hooks/usePrompt.ts):
 * deterministic `${assignmentId}_${uid}` doc id, full field set, then the
 * client-side assignment counter update. `skipAssignmentUpdate` simulates
 * the reveal race (a lost client status write) — the server trigger must
 * repair it.
 */
export async function submitResponseAsClient(
  client: FlowClient,
  coupleId: string,
  assignmentId: string,
  options: {
    responseText: string;
    responseScore?: number | null;
    promptId?: string;
    skipAssignmentUpdate?: boolean;
    /** What the client believes the current count is (race simulation). */
    knownResponseCount?: number;
  }
): Promise<string> {
  const st = serverTimestamp;
  const responseId = `${assignmentId}_${client.uid}`;
  await setDoc(doc(client.db, 'prompt_responses', responseId), {
    assignment_id: assignmentId,
    couple_id: coupleId,
    user_id: client.uid,
    prompt_id: options.promptId ?? `prompt-${RUN_ID}`,
    response_text: options.responseText,
    response_score: options.responseScore ?? null,
    image_url: null,
    status: 'submitted',
    submitted_at: st(),
    emotional_response: null,
    talked_about_it: null,
    response_length: options.responseText.length,
    time_to_respond_seconds: null,
    created_at: st(),
    updated_at: st(),
  });

  if (!options.skipAssignmentUpdate) {
    const newCount = (options.knownResponseCount ?? 0) + 1;
    const updates: Record<string, unknown> = {
      response_count: newCount,
      updated_at: st(),
    };
    if (newCount === 1) {
      updates.first_response_at = st();
      updates.first_responder_id = client.uid;
      updates.status = 'partial';
    } else if (newCount === 2) {
      updates.second_response_at = st();
      updates.status = 'completed';
      updates.completed_at = st();
    }
    await updateDoc(doc(client.db, 'prompt_assignments', assignmentId), updates);
  }
  return responseId;
}

export { serverTimestamp };
