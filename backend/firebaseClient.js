// ~/medplat/backend/firebaseClient.js
import admin from "firebase-admin";

// Cloud Run / local: use default credentials if available
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ✅ Drop any `undefined` fields automatically
db.settings({ ignoreUndefinedProperties: true });

export { admin, db };
export default db;
