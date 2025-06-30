// upload_ai_topics.mjs
import fs from 'fs';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup __dirname (ESM style)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Init Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read and split ai_topics.txt safely
const filePath = path.join(__dirname, 'ai_topics.txt');
const rawData = fs.readFileSync(filePath, 'utf8');

// Split on both Unix (\n) and Windows (\r\n) line endings
const topics = rawData.split(/\r?\n/).map(t => t.trim()).filter(t => t.length > 0);

let count = 0;
const upload = async () => {
  for (const topic of topics) {
    await db.collection('ai_case_topics').add({
      topic: topic,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Uploadet: ${topic}`);
    count++;
  }
  console.log(`\n🎉 Færdig: ${count} emner uploadet!`);
};

upload();
