// ESM Firebase client helper. Initializes firebase-admin when
// FIREBASE_SERVICE_KEY is present as JSON in an environment variable.
// Exports getFirestore() which returns a Firestore instance or null.

import { readFileSync } from 'fs';

let admin = null;
let firestore = null;

export function getFirestore() {
  if (firestore) return firestore;
  const key = process.env.FIREBASE_SERVICE_KEY;
  if (!key) {
    console.warn('⚠️ FIREBASE_SERVICE_KEY not set — Firestore not initialized (local dev fallback)');
    return null;
  }
  try {
    // Lazily require firebase-admin to keep install optional for quick edits
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    admin = admin || require('firebase-admin');
    const cred = JSON.parse(key);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
    }
    firestore = admin.firestore();
    return firestore;
  } catch (e) {
    console.error('❌ Failed to initialize Firestore:', e.message);
    return null;
  }
}

export default { getFirestore };
