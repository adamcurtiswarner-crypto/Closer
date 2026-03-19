export async function clearSandbox(
  db: FirebaseFirestore.Firestore,
  coupleId: string,
  _isProduction: boolean,
): Promise<void> {
  console.log(`Clearing sandbox data for couple ${coupleId}...`);

  const topLevelCollections = ['users', 'prompt_assignments', 'prompt_responses', 'prompt_completions'];
  for (const collection of topLevelCollections) {
    await deleteSandboxDocs(db, collection);
  }

  const subcollections = [
    'coaching_insights', 'pulse_scores', 'messages', 'chat_read_cursors',
    'goals', 'wishlist_items', 'photos', 'milestones', 'check_ins',
  ];

  for (const sub of subcollections) {
    const subRef = db.collection('couples').doc(coupleId).collection(sub);
    const snap = await subRef.where('_sandbox', '==', true).get();

    if (snap.empty) continue;

    if (sub === 'goals') {
      for (const doc of snap.docs) {
        const completions = await doc.ref.collection('completions')
          .where('_sandbox', '==', true).get();
        if (!completions.empty) {
          const batch = db.batch();
          completions.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }

    const subChunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
    for (let i = 0; i < snap.docs.length; i += 500) {
      subChunks.push(snap.docs.slice(i, i + 500));
    }
    for (const chunk of subChunks) {
      const batch = db.batch();
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`  Cleared ${snap.size} docs from ${sub}`);
  }

  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (coupleDoc.exists && coupleDoc.data()?._sandbox) {
    await coupleDoc.ref.delete();
    console.log('  Deleted couple doc');
  }
}

async function deleteSandboxDocs(db: FirebaseFirestore.Firestore, collection: string): Promise<void> {
  const snap = await db.collection(collection).where('_sandbox', '==', true).get();
  if (snap.empty) return;

  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < snap.docs.length; i += 500) {
    chunks.push(snap.docs.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log(`  Cleared ${snap.size} docs from ${collection}`);
}
