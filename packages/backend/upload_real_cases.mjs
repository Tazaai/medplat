import fs from "fs";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Firebase setup
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Clean personal data
function clean(text) {
  return text
    .replace(/\b\d{6}-\d{4}\b/g, "[CPR fjernet]")
    .replace(/\b(\+45)?[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}\b/g, "[Tlf fjernet]")
    .replace(/(navn|adresse|vej|gade|allé)[^\n]{0,40}/gi, "[Personoplysning fjernet]");
}

// Load and split text
const raw = fs.readFileSync("raw_dagbog.txt", "utf8");
const parts = raw.split(/(?=# Case|\*{3,}|^Case\s+\d+)/i).map(p => p.trim()).filter(p => p.length > 30);

// Upload to Firestore
let count = 0;
for (const part of parts) {
  const doc = {
    id: uuidv4(),
    title: part.split("\n")[0].substring(0, 100),
    content: clean(part),
    created_at: new Date().toISOString(),
    source: "real"
  };

  await db.collection("real_cases").add(doc);
  console.log(`✅ Gemt: ${doc.title}`);
  count++;
}

console.log(`🎉 Færdig: ${count} cases gemt i 'real_cases'`);
