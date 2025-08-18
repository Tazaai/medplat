import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const normalize = (str) =>
  str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const main = async () => {
  const snapshot = await db.collection("topics2").get();

  const byCategory = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const category = data?.category?.trim();
    const topic = data?.topic?.trim();

    if (!category || !topic) continue;

    const norm = normalize(topic);

    if (!byCategory[category]) byCategory[category] = {};
    if (!byCategory[category][norm]) byCategory[category][norm] = [];

    byCategory[category][norm].push({
      id: doc.id,
      topic
    });
  }

  console.log("🔍 Duplicate topics inside the same category:\n");

  let foundAny = false;

  for (const [category, topics] of Object.entries(byCategory)) {
    for (const [norm, entries] of Object.entries(topics)) {
      if (entries.length > 1) {
        foundAny = true;
        console.log();
        for (const e of entries) {
          console.log();
        }
      }
    }
  }

  if (!foundAny) {
    console.log("✅ No duplicate topics found inside any category.");
  } else {
    console.log("\n☝️ You can now proceed to delete duplicates if needed.");
  }
};

main();
