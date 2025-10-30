#!/usr/bin/env node
// scripts/seed_topics.js
// Simple seeding helper that writes sample topics into the configured Firestore
// collection. It is intentionally conservative: it only runs when FIREBASE_SERVICE_KEY
// is present and will not overwrite documents.

import fs from 'fs';
import path from 'path';
import { initFirebase } from '../backend/firebaseClient.js';

async function main() {
  const key = process.env.FIREBASE_SERVICE_KEY;
  if (!key) {
    console.log('FIREBASE_SERVICE_KEY not set — skipping seed (local dev/no-op)');
    return;
  }

  const fb = initFirebase();
  if (!fb || !fb.firestore) {
    console.error('Firestore not initialized — aborting seed');
    return;
  }

  const dataPath = path.join(process.cwd(), 'scripts', 'topics_seed.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Seed file not found:', dataPath);
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const colName = process.env.TOPICS_COLLECTION || 'topics2';
  const col = fb.firestore.collection(colName);

  for (const item of items) {
    try {
      // add documents with a deterministic id when possible
      const id = (item.topic || item.title || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || undefined;
      if (id) {
        const docRef = col.doc(id);
        const existing = await docRef.get();
        if (existing && existing.exists) {
          console.log('Skipping existing:', id);
          continue;
        }
        await docRef.set({ ...item, seeded_at: new Date().toISOString() });
        console.log('Seeded document:', id);
        continue;
      }
      const res = await col.add({ ...item, seeded_at: new Date().toISOString() });
      console.log('Seeded document id:', res.id || '(no id)');
    } catch (e) {
      console.warn('Failed to seed item', item, e.message || e);
    }
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
