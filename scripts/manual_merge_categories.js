import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Define explicit merges: fromCategory → toCategory
const merges = {
  "ENT": "ENT / Otolaryngology",
  "General Practice ": "General Practice"
};

const main = async () => {
  console.log("🔁 Starting manual category merges...\n");

  for (const [fromCat, toCat] of Object.entries(merges)) {
    const snapshot = await db.collection("topics2")
      .where("category", "==", fromCat)
      .get();

    if (snapshot.empty) {
      console.log();
      continue;
    }

    console.log();

    for (const doc of snapshot.docs) {
      await doc.ref.update({ category: toCat });
      console.log();
    }
  }

  console.log("\n✅ Manual merges completed.");
};

main();
