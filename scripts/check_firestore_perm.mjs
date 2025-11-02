#!/usr/bin/env node
// Non-destructive Firestore permission check.
// Attempts to read the `topics2` collection and prints a clear status.
import { initFirebase } from '../backend/firebaseClient.js';

async function run() {
  const colName = process.env.TOPICS_COLLECTION || 'topics2';
  const fb = initFirebase();

  if (!process.env.FIREBASE_SERVICE_KEY) {
    console.log('FIREBASE_SERVICE_KEY not set — skipping live permission check (local noop).');
    console.log('Result: NO_KEY');
    process.exit(0);
  }

  if (!fb || !fb.firestore) {
    console.log('Firebase client not initialized correctly; running noop client.');
    console.log('Result: NO_CLIENT');
    process.exit(1);
  }

  try {
    const col = fb.firestore.collection(colName);
    const snapshot = await col.get();
    const docs = snapshot && snapshot.docs ? snapshot.docs : [];
    console.log(`Read ${docs.length} documents from collection '${colName}'.`);
    console.log('Result: READ_OK');
    process.exit(0);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error('Error reading collection (possible permission issue):', msg);
    if (/permission/i.test(msg) || /denied/i.test(msg) || /not authorized/i.test(msg)) {
      console.error('Detected permission-denied type error. Confirm the service account has Firestore read access.');
      console.log('Result: PERMISSION_DENIED');
      process.exit(2);
    }
    console.log('Result: READ_ERROR');
    process.exit(3);
  }
}

run();
