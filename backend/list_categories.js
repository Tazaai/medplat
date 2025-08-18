import admin from "firebase-admin";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("./serviceAccountKey.json","utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const UI_CATEGORIES = [
  "Cardiology","Pulmonology","Endocrinology","Gastroenterology",
  "Nephrology","Hematology","Oncology","General Practice","Infectious Diseases"
];

const byCat = new Map();

const run = async () => {
  const snap = await db.collection("topics2").get();
  snap.forEach(d => {
    const { category } = d.data() || {};
    if (!category) return;
    byCat.set(category, (byCat.get(category) || 0) + 1);
  });

  console.log("=== Categories present in topics2 ===");
  [...byCat.entries()].sort().forEach(([cat, n]) => console.log(`${cat}: ${n} topics`));

  console.log("\n=== Missing from UI list (have in DB but not in UI) ===");
  const missingInUI = [...byCat.keys()].filter(c => !UI_CATEGORIES.includes(c));
  console.log(missingInUI.length ? missingInUI.join(", ") : "(none)");

  console.log("\n=== Missing in DB (shown in UI but empty/missing) ===");
  const missingInDB = UI_CATEGORIES.filter(c => !byCat.has(c));
  console.log(missingInDB.length ? missingInDB.join(", ") : "(none)");

  process.exit(0);
};
run().catch(e => { console.error(e); process.exit(1); });
