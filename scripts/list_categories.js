import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const main = async () => {
  const snapshot = await db.collection("topics2").get();

  const categorySet = new Set();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data?.category) {
      categorySet.add(data.category);
    }
  }

  const sorted = [...categorySet].sort();
  console.log("✅ Distinct categories in topics2:\n");
  for (const cat of sorted) {
    console.log("•", cat);
  }

  console.log("\n🔢 Total:", sorted.length);
};

main();
