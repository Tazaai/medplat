// backend/firebaseClient.js
import admin from "firebase-admin";
import fs from "fs";

// Cached references so repeated calls (or multiple mounts across routes)
// return the same firestore instance and we don't call settings() twice.
const _cache = {
  initialized: false,
  admin: null,
  firestore: null,
  settingsApplied: false,
};

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
  // If we've already initialized in this process, return cached instance.
  if (_cache.initialized && _cache.firestore) {
    return { initialized: true, admin: _cache.admin, firestore: _cache.firestore };
  }

  let raw = process.env.FIREBASE_SERVICE_KEY;
  let keyJson;

  try {
    if (!raw) {
      console.warn("⚠️ No FIREBASE_SERVICE_KEY found — using noop Firestore");
      return { initialized: false, firestore: makeNoopFirestore() };
    }

    // 🔍 If FIREBASE_SERVICE_KEY points to a file, read it
    try {
      if (fs.existsSync(raw)) {
        keyJson = fs.readFileSync(raw, "utf8");
        console.log("ℹ️ Loaded FIREBASE_SERVICE_KEY from file:", raw);
      } else {
        keyJson = raw;
      }
    } catch (e) {
      // fs.existsSync may throw if raw is not a string; fall back to treating raw as JSON
      keyJson = raw;
    }

    if (!keyJson) {
      console.warn("⚠️ FIREBASE_SERVICE_KEY empty after read — using noop Firestore");
      return { initialized: false, firestore: makeNoopFirestore() };
    }

    const cred = JSON.parse(keyJson);

    // Normalize escaped newlines in private key (common secret-manager upload issue)
    if (cred.private_key && typeof cred.private_key === "string" && cred.private_key.includes("\\n")) {
      cred.private_key = cred.private_key.replace(/\\n/g, "\n");
    }

    // Initialize admin SDK only once per process
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        projectId: cred.project_id,
        databaseURL: `https://${cred.project_id}.firebaseio.com`,
      });
      console.log("✅ Firebase initializeApp called for project:", cred.project_id);
    } else {
      console.log("ℹ️ Firebase admin already initialized (admin.apps.length > 0).");
    }

    // Cache admin and firestore so subsequent callers get the same instance
    _cache.admin = admin;
    _cache.firestore = admin.firestore();
    _cache.initialized = true;

    // Apply settings() once per process — guard with a module-level flag
    if (!_cache.settingsApplied) {
      try {
        _cache.firestore.settings({ ignoreUndefinedProperties: true });
        _cache.settingsApplied = true;
        console.log("✅ Firestore settings applied (ignoreUndefinedProperties=true)");
      } catch (se) {
        // settings() can only be called once; ignore that specific error.
        const msg = se && se.message ? se.message : String(se);
        if (msg.includes("You can only call settings() once") || msg.includes("settings() has already been called")) {
          console.warn("⚠️ Firestore settings() was already applied in this process; continuing");
          _cache.settingsApplied = true;
        } else {
          console.warn("⚠️ Firestore.settings() failed:", msg);
        }
      }
    }

    return { initialized: true, admin: _cache.admin, firestore: _cache.firestore };
  } catch (err) {
    console.error("🔥 Firebase initialization failed:", err && err.message ? err.message : err);
    return { initialized: false, firestore: makeNoopFirestore() };
  }
}

// Export a db instance for convenience (Phase 3)
const { firestore } = initFirebase();
export const db = firestore;
