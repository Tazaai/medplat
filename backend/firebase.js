// ~/medplat/backend/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;

try {
  const keyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log("✅ Firebase initialized");
    }
    db = admin.firestore();
  } else {
    console.warn("⚠️ serviceAccountKey.json not found — Firebase disabled");
  }
} catch (err) {
  console.warn("⚠️ Firebase init skipped:", err.message);
}

export default db || admin;
