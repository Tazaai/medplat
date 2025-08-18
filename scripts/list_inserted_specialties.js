import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function listSpecialties() {
  const snapshot = await db.collection('topics2').get();
  const categories = new Set();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.category) categories.add(data.category);
  });

  console.log("✅ Inserted specialties in topics2:");
  Array.from(categories).sort().forEach(cat => console.log("•", cat));
}

listSpecialties().catch(console.error);
