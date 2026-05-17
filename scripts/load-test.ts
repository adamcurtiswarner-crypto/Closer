/**
 * Basic load test for Stoke Cloud Functions.
 * Tests Firestore read performance under concurrent load.
 *
 * Usage:
 *   npx ts-node scripts/load-test.ts
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials (uses application default credentials)
 *   - Or set GOOGLE_APPLICATION_CREDENTIALS env var
 */

import * as admin from 'firebase-admin';

// Initialize with project
admin.initializeApp({ projectId: 'stoke-5f762' });
const db = admin.firestore();

interface TestResult {
  name: string;
  concurrency: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
}

async function timeOperation(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function runConcurrent(
  name: string,
  fn: () => Promise<void>,
  concurrency: number
): Promise<TestResult> {
  const times: number[] = [];
  let errors = 0;

  const start = Date.now();
  const promises = Array.from({ length: concurrency }, async () => {
    try {
      const ms = await timeOperation(fn);
      times.push(ms);
    } catch {
      errors++;
    }
  });

  await Promise.all(promises);
  const totalMs = Date.now() - start;

  return {
    name,
    concurrency,
    totalMs,
    avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    minMs: times.length ? Math.min(...times) : 0,
    maxMs: times.length ? Math.max(...times) : 0,
    errors,
  };
}

async function main() {
  console.log('=== Stoke Load Test ===\n');

  // Test 1: Read a user document (most common operation)
  const userReadTest = async () => {
    await db.collection('users').limit(1).get();
  };

  // Test 2: Query prompt assignments (daily operation)
  const assignmentQueryTest = async () => {
    const today = new Date().toISOString().split('T')[0];
    await db.collection('prompt_assignments')
      .where('assigned_date', '==', today)
      .limit(10)
      .get();
  };

  // Test 3: Read couple document
  const coupleReadTest = async () => {
    await db.collection('couples').limit(1).get();
  };

  // Test 4: Query events (analytics)
  const eventsQueryTest = async () => {
    await db.collection('events')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
  };

  const tests = [
    { name: 'User doc read', fn: userReadTest },
    { name: 'Assignment query', fn: assignmentQueryTest },
    { name: 'Couple doc read', fn: coupleReadTest },
    { name: 'Events query (20)', fn: eventsQueryTest },
  ];

  const concurrencyLevels = [1, 5, 10, 25, 50];

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    for (const c of concurrencyLevels) {
      const result = await runConcurrent(test.name, test.fn, c);
      const status = result.maxMs > 2000 ? '🔴' : result.maxMs > 500 ? '🟡' : '🟢';
      console.log(
        `${status} ${c} concurrent: avg=${result.avgMs}ms, min=${result.minMs}ms, max=${result.maxMs}ms, total=${result.totalMs}ms${result.errors ? `, errors=${result.errors}` : ''}`
      );
    }
  }

  console.log('\n=== Done ===');
  console.log('🟢 < 500ms  🟡 500-2000ms  🔴 > 2000ms');

  process.exit(0);
}

main().catch(console.error);
