import fs from "fs";
import admin from "firebase-admin";

const keyPath = "/home/rahpodcast2022/medplat/backend/serviceAccountKey.json";
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

try {
  const snap = await db.collection("topics").get();
  console.log("✅ Firestore access successful");
  console.log("📦 topics collection empty?", snap.empty);
} catch (err) {
  console.error("❌ Firestore test failed:", err.message || err);
}
