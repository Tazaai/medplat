// delete_gastro_topics.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function deleteGastro() {
  const snapshot = await db.collection('topics2').get();
  let deleted = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.category === "Gastroenterology") {
      await db.doc(`topics2/${doc.id}`).delete();
      console.log("🗑️ Deleted:", doc.id);
      deleted++;
    }
  }

  console.log(`✅ Deleted ${deleted} Gastroenterology documents.`);
}

deleteGastro().catch(console.error);
