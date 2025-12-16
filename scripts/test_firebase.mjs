#!/usr/bin/env node
import { initFirebase } from '../backend/firebaseClient.js';

console.log('Testing Firebase connection...');

const { firestore, initialized } = initFirebase();

if (!initialized) {
  console.error('❌ Firebase not initialized');
  process.exit(1);
}

console.log('✅ Firebase initialized');

// Test query
try {
  const snapshot = await firestore.collection('topics2').limit(1).get();
  console.log(`✅ Successfully queried Firestore. Found ${snapshot.docs.length} documents.`);
  process.exit(0);
} catch (error) {
  console.error('❌ Error querying Firestore:', error.message);
  process.exit(1);
}
