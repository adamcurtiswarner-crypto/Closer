/**
 * One-time backfill: enrich pre-Hearth prompt_completions with the fields
 * the Hearth tab needs (category, prompt_text, is_scale, per-response
 * scores, signal, discussed map for repair/divergence).
 *
 * Completions created before 2026-07-07 predate the enrichment written by
 * onResponseSubmitted, so they carry no category — invisible on every
 * Hearth tile. Every one has a real assignment; this script re-derives the
 * truth from prompt_assignments + prompt_responses:
 *
 * - >= 2 distinct submitted responders -> fully enrich (and repair the
 *   assignment to 'completed' if it drifted)
 * - < 2 distinct responders            -> race-era artifact of a day that
 *   never completed; SKIPPED (stays invisible — Hearth shows only real
 *   both-answered moments)
 *
 * Dry-run by default; --apply to write. Idempotent (only touches
 * completions missing `category`).
 */

// Project bootstrap — must run before ../shared loads (same pattern as
// seedReviewerCouple.ts / backfillCoupleClaims.ts).
const IS_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = IS_EMULATOR
  ? 'closer-app-dev'
  : process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'stoke-5f762';
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

const isApply = process.argv.includes('--apply');

async function main(): Promise<void> {
  const admin = await import('firebase-admin');
  const { db } = await import('../shared');
  const { computeCompletionSignal } = await import('../hearth');

  const missing = await db.collection('prompt_completions').get();
  const targets = missing.docs.filter((d) => !d.data().category);
  console.log(
    `${missing.size} completions total, ${targets.length} missing category ` +
      `(${isApply ? 'APPLY' : 'dry run'})`
  );

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of targets) {
    try {
      const c = doc.data();
      const assignmentId: string = c.assignment_id || doc.id;
      const assignmentSnap = await db
        .collection('prompt_assignments')
        .doc(assignmentId)
        .get();
      if (!assignmentSnap.exists) {
        console.warn(`  SKIP ${doc.id}: assignment ${assignmentId} missing`);
        skipped++;
        continue;
      }
      const a = assignmentSnap.data()!;
      const category: string | null = a.category || a.prompt_type || null;
      if (!category) {
        console.warn(`  SKIP ${doc.id}: assignment has no category/prompt_type`);
        skipped++;
        continue;
      }

      // Re-derive responses from the source of truth, one per distinct user
      // (earliest submitted wins) — race-era completions embedded only what
      // the trigger happened to see.
      const respSnap = await db
        .collection('prompt_responses')
        .where('couple_id', '==', c.couple_id)
        .where('assignment_id', '==', assignmentId)
        .get();
      const byUser = new Map<string, FirebaseFirestore.DocumentData>();
      for (const r of respSnap.docs) {
        const rd = r.data();
        if (rd.status !== 'submitted') continue;
        const prev = byUser.get(rd.user_id);
        const prevAt = prev?.submitted_at?.toMillis?.() ?? Infinity;
        const thisAt = rd.submitted_at?.toMillis?.() ?? Infinity;
        if (!prev || thisAt < prevAt) byUser.set(rd.user_id, rd);
      }

      if (byUser.size < 2) {
        console.log(
          `  SKIP ${doc.id} (${category}): ${byUser.size} distinct responder(s) — never completed`
        );
        skipped++;
        continue;
      }

      const isScale = a.response_format === 'scale';
      const responses = [...byUser.values()].map((r) => ({
        user_id: r.user_id,
        response_text: r.response_text ?? '',
        response_score: typeof r.response_score === 'number' ? r.response_score : null,
        image_url: r.image_url ?? null,
      }));
      const signal = computeCompletionSignal(isScale, responses);

      const update: Record<string, unknown> = {
        category,
        prompt_text: a.prompt_text ?? c.prompt_text ?? '',
        is_scale: isScale,
        responses,
        signal,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      if ((signal === 'repair' || signal === 'divergence') && !('discussed' in c)) {
        update.discussed = {};
        update.discussed_at = null;
      }

      console.log(
        `  ${isApply ? 'ENRICH' : '[dry] would enrich'} ${doc.id}: ${category} signal=${signal} responses=${responses.length}`
      );
      if (isApply) {
        await doc.ref.update(update);
        if (a.status !== 'completed') {
          await assignmentSnap.ref.update({
            status: 'completed',
            response_count: responses.length,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`    repaired assignment ${assignmentId} -> completed`);
        }
      }
      enriched++;
    } catch (error) {
      errors++;
      console.error(`  ERROR ${doc.id}:`, (error as Error).message);
    }
  }

  console.log(
    `--- ${isApply ? 'enriched' : 'would enrich'}: ${enriched} | skipped (never completed / no data): ${skipped} | errors: ${errors}`
  );
  if (!isApply) console.log('Re-run with --apply to write.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
