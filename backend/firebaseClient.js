// backend/firebaseClient.js
import admin from "firebase-admin";
import fs from "fs";

function makeNoopFirestore() {
  return {
    collection: () => ({
      doc: () => ({
        async get() {
          return { exists: false, data: () => null };
        },
        async set() {
          return { ok: true };
        },
      }),
      async get() {
        return { docs: [] };
      },
      async add() {
        return { id: "stub-id" };
      },
    }),
  };
}

export function initFirebase() {
  let raw = process.env.FIREBASE_SERVICE_KEY;
  let keyJson;

  try {
    // 🔍 If FIREBASE_SERVICE_KEY points to a file, read it
    if (fs.existsSync(raw)) {
      keyJson = fs.readFileSync(raw, "utf8");
      console.log("ℹ️ Loaded FIREBASE_SERVICE_KEY from file:", raw);
    } else {
      keyJson = raw;
    }

    if (!keyJson) {
      console.warn("⚠️ No FIREBASE_SERVICE_KEY found — using noop Firestore");
      return { initialized: false, firestore: makeNoopFirestore() };
    }

    let cred = JSON.parse(keyJson);

    // Normalize escaped newlines in private key
    if (
      cred.private_key &&
      typeof cred.private_key === "string" &&
      cred.private_key.includes("\\n")
    ) {
      cred.private_key = cred.private_key.replace(/\\n/g, "\n");
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        projectId: cred.project_id,
        databaseURL: `https://${cred.project_id}.firebaseio.com`,
      });
      console.log("✅ Firebase initialized for project:", cred.project_id);
    } else {
      console.log("ℹ️ Firebase already initialized.");
    }

    const firestore = admin.firestore();
    firestore.settings({ ignoreUndefinedProperties: true });

    return { initialized: true, admin, firestore };
  } catch (err) {
    console.error("�� Firebase initialization failed:", err.message);
    return { initialized: false, firestore: makeNoopFirestore() };
  }
}
