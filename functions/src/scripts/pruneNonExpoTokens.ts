/**
 * Prune Non-Expo Push Tokens Script (one-time admin migration)
 *
 * Run with: npx ts-node src/scripts/pruneNonExpoTokens.ts
 * Dry run:  npx ts-node src/scripts/pruneNonExpoTokens.ts --dry-run
 *
 * The client now registers ONLY Expo push tokens (ExponentPushToken[...]).
 * Any other entry in users/{userId}.push_tokens is a stale raw APNs/FCM
 * device token from an old build. sendPushNotification (src/shared.ts) is
 * Expo-only and prunes lazily on send; this script strips the stale entries
 * from every user doc up-front so no legacy tokens remain.
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

const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;
const PAGE_SIZE = 300; // page through users to keep memory bounded

const isDryRun = process.argv.includes('--dry-run');

interface PruneStats {
  usersScanned: number;
  usersWithTokens: number;
  usersPruned: number;
  tokensKept: number;
  tokensPruned: number;
  errors: number;
}

/** Splits a push_tokens array into Expo tokens and stale non-Expo entries. */
export function partitionPushTokens(tokens: unknown[]): {
  expo: string[];
  stale: unknown[];
} {
  const expo: string[] = [];
  const stale: unknown[] = [];
  for (const token of tokens) {
    if (typeof token === 'string' && EXPO_PUSH_TOKEN_REGEX.test(token)) {
      expo.push(token);
    } else {
      stale.push(token);
    }
  }
  return { expo, stale };
}

async function pruneNonExpoTokens(): Promise<PruneStats> {
  const stats: PruneStats = {
    usersScanned: 0,
    usersWithTokens: 0,
    usersPruned: 0,
    tokensKept: 0,
    tokensPruned: 0,
    errors: 0,
  };

  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  // Paginate by document ID so a crash mid-run can resume safely on re-run
  // (the script is idempotent — already-pruned users have nothing to remove).
  for (;;) {
    let query = db
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const userDoc of snapshot.docs) {
      stats.usersScanned++;

      const rawTokens = userDoc.data().push_tokens;
      if (!Array.isArray(rawTokens) || rawTokens.length === 0) continue;
      stats.usersWithTokens++;

      const { expo, stale } = partitionPushTokens(rawTokens);
      stats.tokensKept += expo.length;
      if (stale.length === 0) continue;

      stats.tokensPruned += stale.length;
      stats.usersPruned++;

      if (isDryRun) {
        console.log(
          `[dry-run] would prune ${stale.length} stale token(s) from user ${userDoc.id} ` +
          `(keeping ${expo.length} Expo token(s))`
        );
        continue;
      }

      try {
        // Write the filtered array (not arrayRemove) so non-string garbage
        // entries are cleared too.
        await userDoc.ref.update({ push_tokens: expo });
        console.log(
          `Pruned ${stale.length} stale token(s) from user ${userDoc.id} ` +
          `(kept ${expo.length} Expo token(s))`
        );
      } catch (error) {
        stats.errors++;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to prune tokens for user ${userDoc.id}: ${message}`);
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < PAGE_SIZE) break;
  }

  return stats;
}

async function main(): Promise<void> {
  console.log(
    `Pruning non-Expo push tokens${isDryRun ? ' (dry run — no writes)' : ''}...`
  );

  const stats = await pruneNonExpoTokens();

  console.log('--- prune summary ---');
  console.log(`Users scanned:      ${stats.usersScanned}`);
  console.log(`Users with tokens:  ${stats.usersWithTokens}`);
  console.log(`Users pruned:       ${stats.usersPruned}`);
  console.log(`Expo tokens kept:   ${stats.tokensKept}`);
  console.log(`Stale tokens ${isDryRun ? 'found' : 'pruned'}: ${stats.tokensPruned}`);
  console.log(`Errors:             ${stats.errors}`);

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('pruneNonExpoTokens failed:', error);
  process.exitCode = 1;
});
