import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const main = async () => {
  const snapshot = await db.collection("topics2").get();

  console.log("🔍 Listing first 10 documents:\n");

  let shown = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(data);
    shown++;
    if (shown >= 10) break;
  }

  console.log("\n📦 Total documents fetched:", snapshot.size);
};

main();
