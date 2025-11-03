#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function loadCredentialJson() {
  // 1) FIREBASE_SERVICE_KEY env
  if (process.env.FIREBASE_SERVICE_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_KEY);
    } catch (e) {
      console.error('FIREBASE_SERVICE_KEY is set but invalid JSON:', e.message);
    }
  }

  // 2) /tmp/firebase_key.json or /tmp/key.json
  const tryPaths = ['/tmp/firebase_key.json', '/tmp/key.json'];
  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      // continue
    }
  }

  // 3) repo-local keys/serviceAccountKey.json (local dev convenience)
  try {
    const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');
    const repoKey = path.join(repoRoot, 'keys', 'serviceAccountKey.json');
    if (fs.existsSync(repoKey)) {
      const raw = fs.readFileSync(repoKey, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  return null;
}

function topicsList() {
  // 12 sample topics across specialties — keep fields matching repository expectations
  return [
    { category: 'Pulmonology', id: 'abg_interpretation', lang: 'en', topic: 'Arterial Blood Gas (ABG) Interpretation' },
    { category: 'Cardiology', id: 'acute_myocardial_infarction', lang: 'en', topic: 'Acute Myocardial Infarction' },
    { category: 'Endocrinology', id: 'diabetic_ketoacidosis', lang: 'en', topic: 'Diabetic Ketoacidosis (DKA)' },
    { category: 'Neurology', id: 'stroke_ischaemic', lang: 'en', topic: 'Ischemic Stroke: Initial Management' },
    { category: 'Infectious Disease', id: 'sepsis_management', lang: 'en', topic: 'Sepsis: Recognition and Initial Management' },
    { category: 'Gastroenterology', id: 'upper_gi_bleed', lang: 'en', topic: 'Upper Gastrointestinal Bleeding' },
    { category: 'Nephrology', id: 'acute_kidney_injury', lang: 'en', topic: 'Acute Kidney Injury (AKI) — Initial Evaluation' },
    { category: 'Obstetrics', id: 'pre_eclampsia', lang: 'en', topic: 'Pre-eclampsia: Diagnosis and Management' },
    { category: 'Dermatology', id: 'cellulitis', lang: 'en', topic: 'Cellulitis: Recognition and Antibiotic Choices' },
    { category: 'Hematology', id: 'pulmonary_embolism', lang: 'en', topic: 'Pulmonary Embolism: Diagnosis & Initial Treatment' },
    { category: 'Toxicology', id: 'acetaminophen_overdose', lang: 'en', topic: 'Acetaminophen (Paracetamol) Overdose' },
    { category: 'Orthopedics', id: 'achilles_tendon_rupture', lang: 'en', topic: 'Achilles Tendon Rupture: Assessment' },
  ];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');

  const cred = await loadCredentialJson();
  if (!cred) {
    console.error('No Firebase credential found. Provide FIREBASE_SERVICE_KEY env, /tmp/firebase_key.json, or keys/serviceAccountKey.json');
    process.exit(2);
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('firebase-admin is not installed. Install with: npm --prefix backend install firebase-admin');
    process.exit(2);
  }

  // Normalize private_key newlines if needed
  if (cred && cred.private_key && typeof cred.private_key === 'string' && cred.private_key.indexOf('\\n') !== -1) {
    cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  }

  try {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  } catch (e) {
    // If already initialized, continue
    if (!/already exists/.test(String(e))) {
      console.error('Failed to initialize firebase-admin:', e && e.message ? e.message : e);
      process.exit(2);
    }
  }

  const db = admin.firestore();
  const topics = topicsList();

  console.log(`Preparing to ${dryRun ? '[dry-run] ' : ''}write ${topics.length} topics to collection 'topics2'`);

  for (const t of topics) {
    const docId = t.id;
    if (dryRun) {
      console.log('[dry] would write', docId, JSON.stringify(t));
      continue;
    }
    try {
      await db.collection('topics2').doc(docId).set(t, { merge: true });
      console.log('WROTE:', docId);
    } catch (e) {
      console.error('FAILED writing', docId, e && e.message ? e.message : e);
    }
  }

  console.log('Done.');
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('populate_topics2.mjs')) {
  main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(2); });
}
