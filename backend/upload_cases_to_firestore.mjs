import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

initializeApp({ credential: applicationDefault(), projectId: 'medplat-458911' });
const db = getFirestore();

const raw = fs.readFileSync('./upload_cases_firestore.json');
const cases = JSON.parse(raw);

async function upload() {
  for (const c of cases) {
    await db.collection('cases').add({
      content: c.content
    });
    console.log("✅ Uploaded:", c.content.slice(0, 40));
  }
}

upload();
