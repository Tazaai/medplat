import { readFile } from 'fs/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Init Firebase
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Upload function
async function uploadTopics() {
  const filePath = path.join(process.cwd(), 'acut_topics.json');
  const fileContent = await readFile(filePath, 'utf-8');
  const topics = JSON.parse(fileContent);

  const batch = db.batch();

  topics.forEach((topicObj) => {
    // Nyttig auto-ID for hver topic
    const docRef = db.collection('topics').doc(); // Firestore auto-id
    batch.set(docRef, topicObj);
  });

  await batch.commit();
  console.log(`✅ Uploaded ${topics.length} topics to Firestore.`);
}

uploadTopics();
