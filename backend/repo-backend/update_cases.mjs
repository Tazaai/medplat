import db from "./firebaseClient.js";

const updates = [
  { id: "case_001", topic: "Appendicitis", category: "Akut", subcategory: "Abdomen" },
  { id: "case_002", topic: "Pneumoni", category: "Akut", subcategory: "Lunger" },
];

async function main() {
  for (const c of updates) {
    await db.collection("topics").doc(c.id).set(c);
    console.log("✅ Updated:", c.id);
  }
  process.exit(0);
}

main();
