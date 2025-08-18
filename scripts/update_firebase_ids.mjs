// ~/medplat/scripts/update_firebase_ids.mjs
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function updateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const topic = data.topic || data.id;
    if (!topic) continue;
    const newId = topic.toLowerCase().replace(/[^\w]/g, "_").slice(0, 40);
    await doc.ref.update({ id: newId });
    console.log(`✅ Updated ${doc.id} → ${newId}`);
  }
}

await updateCollection("topics");
await updateCollection("topics2");
