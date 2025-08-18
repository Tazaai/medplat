import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

const main = async () => {
  const snapshot = await db.collection("topics2").get();

  const categorySet = new Set();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data?.category) {
      categorySet.add(data.category.trim());
    }
  }

  const categories = [...categorySet].sort();
  const seenPairs = new Set();

  console.log("🔍 Potentially duplicated or similar categories:\n");

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const catA = categories[i];
      const catB = categories[j];
      const normA = normalize(catA);
      const normB = normalize(catB);

      if (normA === normB && catA !== catB) {
        console.log();
      } else if (normA.includes(normB) || normB.includes(normA)) {
        console.log();
      }
    }
  }
};

main();
