import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const normalize = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const categoryTopics = {};

const main = async () => {
  const snapshot = await db.collection("topics2").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const category = data?.category;
    const topic = data?.topic;

    if (!category || !topic) continue;

    if (!categoryTopics[category]) {
      categoryTopics[category] = {};
    }

    const norm = normalize(topic);
    categoryTopics[category][norm] = (categoryTopics[category][norm] || 0) + 1;
  }

  const sortedCategories = Object.keys(categoryTopics).sort();
  console.log("📊 Topics per category in topics2:\n");

  for (const category of sortedCategories) {
    const topics = categoryTopics[category];
    const total = Object.values(topics).reduce((a, b) => a + b, 0);
    const duplicates = Object.entries(topics).filter(([_, count]) => count > 1);

    console.log();

    for (const [topicId, count] of duplicates) {
      console.log();
    }
  }

  console.log("\n✅ Total categories:", sortedCategories.length);
};

main();
