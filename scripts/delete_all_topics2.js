// delete_all_topics2.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function deleteAllTopics2() {
  const snapshot = await db.collection("topics2").get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    console.log("⚠️ No documents found in topics2.");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    console.log(`🗑️ Deleting: ${doc.id}`);
  });

  await batch.commit();
  console.log(`✅ Deleted ${batchSize} documents from topics2.`);
}

deleteAllTopics2().catch(console.error);
