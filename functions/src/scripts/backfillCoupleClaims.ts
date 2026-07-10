/**
 * Backfill coupleId Custom Auth Claims (one-time admin migration)
 *
 * Dry run (default): npx ts-node src/scripts/backfillCoupleClaims.ts
 * Apply:             npx ts-node src/scripts/backfillCoupleClaims.ts --apply
 *
 * Storage security rules verify couple membership via the `coupleId` custom
 * auth claim (request.auth.token.coupleId). New pairings get the claim from
 * the acceptInvite callable, and unlinkCouple/deleteAccount clear it — but
 * users paired BEFORE this system existed have no claim and would lose all
 * access to couple-scoped Storage paths the moment the new storage.rules
 * deploy. Run this script (with --apply) AFTER deploying functions and
 * BEFORE deploying storage.rules.
 *
 * What it does:
 * - Scans all couples with status == 'active'.
 * - For each member, sets the coupleId custom claim (preserving any other
 *   claims) when it is missing or mismatched.
 * - Warns about members whose users/{uid}.couple_id disagrees with the
 *   couple doc, and about members with no Auth account.
 *
 * Claims propagate to clients on ID token refresh (~1 hour naturally; the
 * app force-refreshes after pairing changes).
 *
 * For emulator usage, set FIRESTORE_EMULATOR_HOST=localhost:8080 and
 * FIREBASE_AUTH_EMULATOR_HOST=localhost:9099.
 * For production, set GOOGLE_APPLICATION_CREDENTIALS to your service
 * account key.
 */

import * as admin from 'firebase-admin';

// When the emulator hosts are set, the Admin SDK routes there automatically.
if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: 'closer-app-dev' });
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // The Auth admin API cannot infer the project from ADC alone — an
    // explicit projectId is required or every getUser() errors (which the
    // catch below would misreport as a missing account).
    projectId:
      process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'stoke-5f762',
  });
}

const db = admin.firestore();

const PAGE_SIZE = 200; // page through couples to keep memory bounded

const isApply = process.argv.includes('--apply');

interface BackfillStats {
  couplesScanned: number;
  membersScanned: number;
  claimsAlreadyCorrect: number;
  claimsSet: number;
  authUserMissing: number;
  coupleIdMismatch: number;
  errors: number;
}

/** Sets (or would set, in dry run) the coupleId claim for one member. */
async function backfillMemberClaim(
  memberId: string,
  coupleId: string,
  stats: BackfillStats
): Promise<void> {
  stats.membersScanned++;

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUser(memberId);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') {
      // API/credential failure — do NOT swallow as a missing account
      throw error;
    }
    stats.authUserMissing++;
    console.warn(`  WARN no Auth account for member ${memberId} of couple ${coupleId}`);
    return;
  }

  // Cross-check the Firestore user doc for drift (report only).
  try {
    const userDoc = await db.collection('users').doc(memberId).get();
    if (!userDoc.exists || userDoc.data()?.couple_id !== coupleId) {
      stats.coupleIdMismatch++;
      console.warn(
        `  WARN users/${memberId}.couple_id (${userDoc.data()?.couple_id ?? 'missing'}) ` +
          `disagrees with active couple ${coupleId} — setting the claim anyway ` +
          `(the couple doc's member_ids is the source of truth)`
      );
    }
  } catch (error) {
    console.warn(`  WARN could not read users/${memberId}:`, error);
  }

  const currentClaims: Record<string, unknown> = { ...(userRecord.customClaims || {}) };
  if (currentClaims.coupleId === coupleId) {
    stats.claimsAlreadyCorrect++;
    return;
  }

  const nextClaims = { ...currentClaims, coupleId };
  if (isApply) {
    await admin.auth().setCustomUserClaims(memberId, nextClaims);
    console.log(`  SET claim coupleId=${coupleId} for ${memberId}`);
  } else {
    console.log(`  DRY-RUN would set claim coupleId=${coupleId} for ${memberId}`);
  }
  stats.claimsSet++;
}

async function backfillCoupleClaims(): Promise<void> {
  console.log(
    isApply
      ? 'Backfilling coupleId claims (APPLY mode — writing claims)'
      : 'Backfilling coupleId claims (dry run — pass --apply to write)'
  );

  const stats: BackfillStats = {
    couplesScanned: 0,
    membersScanned: 0,
    claimsAlreadyCorrect: 0,
    claimsSet: 0,
    authUserMissing: 0,
    coupleIdMismatch: 0,
    errors: 0,
  };

  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let pageQuery = db
      .collection('couples')
      .where('status', '==', 'active')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDoc) {
      pageQuery = pageQuery.startAfter(lastDoc);
    }

    const page = await pageQuery.get();
    if (page.empty) break;

    for (const coupleDoc of page.docs) {
      stats.couplesScanned++;
      const coupleId = coupleDoc.id;
      const memberIds: string[] = coupleDoc.data().member_ids || [];
      console.log(`couple ${coupleId} (${memberIds.length} members)`);

      for (const memberId of memberIds) {
        try {
          await backfillMemberClaim(memberId, coupleId, stats);
        } catch (error) {
          stats.errors++;
          console.error(`  ERROR backfilling ${memberId} in couple ${coupleId}:`, error);
        }
      }
    }

    lastDoc = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  console.log('\n=== Backfill summary ===');
  console.log(`mode:                   ${isApply ? 'APPLY' : 'dry run'}`);
  console.log(`couples scanned:        ${stats.couplesScanned}`);
  console.log(`members scanned:        ${stats.membersScanned}`);
  console.log(`claims already correct: ${stats.claimsAlreadyCorrect}`);
  console.log(`claims ${isApply ? 'set:            ' : 'to set:         '}${stats.claimsSet}`);
  console.log(`auth users missing:     ${stats.authUserMissing}`);
  console.log(`couple_id mismatches:   ${stats.coupleIdMismatch}`);
  console.log(`errors:                 ${stats.errors}`);

  if (!isApply && stats.claimsSet > 0) {
    console.log('\nRe-run with --apply to write these claims.');
  }
}

backfillCoupleClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
