#!/usr/bin/env node
import { initFirebase } from '../backend/firebaseClient.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/get_topic_doc.mjs <docId>');
  process.exit(2);
}

const fb = initFirebase();
if (!process.env.FIREBASE_SERVICE_KEY) {
  console.log('NO_KEY');
  process.exit(0);
}

async function run() {
  try {
    const docRef = fb.firestore.collection(process.env.TOPICS_COLLECTION || 'topics2').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.log('NOT_FOUND');
      process.exit(0);
    }
    const data = typeof snap.data === 'function' ? snap.data() : snap;
    console.log(JSON.stringify({ id: snap.id || id, ...data }, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    process.exit(1);
  }
}

run();
