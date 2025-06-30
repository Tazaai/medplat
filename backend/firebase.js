import admin from "firebase-admin";

let db = null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log("✅ Firebase initialized using Cloud Run credentials or local ADC");
  db = admin.firestore();
} else {
  console.warn("❗ Firebase already initialized");
}

export default db;
