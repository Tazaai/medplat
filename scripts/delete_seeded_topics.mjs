#!/usr/bin/env node
// scripts/delete_seeded_topics.mjs
// Deletes seeded documents (deterministic ids) from the configured topics collection.
import { initFirebase } from '../backend/firebaseClient.js';

async function main() {
  const key = process.env.FIREBASE_SERVICE_KEY;
  if (!key) {
    console.log('FIREBASE_SERVICE_KEY not set — aborting delete (local dev/no-op)');
    return;
  }

  const fb = initFirebase();
  if (!fb || !fb.firestore) {
    console.error('Firestore not initialized — aborting delete');
    return;
  }

  const colName = process.env.TOPICS_COLLECTION || 'topics2';
  const col = fb.firestore.collection(colName);

  const ids = ['pneumonia','diabetes','hypertension'];
  for (const id of ids) {
    try {
      const docRef = col.doc(id);
      const snap = await docRef.get();
      if (snap && snap.exists) {
        await docRef.delete();
        console.log('Deleted document:', id);
      } else {
        console.log('Not found (skipped):', id);
      }
    } catch (e) {
      console.error('Failed to delete', id, e.message || e);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
