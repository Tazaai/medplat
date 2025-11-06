// Lightweight Firebase client shim for local dev and CI checks.
// Do NOT commit real credentials. CI creates/uses Secret Manager.
import admin from 'firebase-admin';
import fs from 'fs';

function makeNoopFirestore() {
  return {
    collection: (name) => ({
      doc: (id) => ({
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
      async add(doc) {
        return { id: 'stub-id' };
      },
    }),
  };
}

// Initialize Firebase Admin SDK using the FIREBASE_SERVICE_KEY env secret.
// Returns an object { initialized, admin, firestore } where firestore is either
// a real Firestore instance or a noop fallback.
function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_KEY;
  let key = raw;

  // If no env var, try common runtime paths as a fallback (CI may write to /tmp)
  if (!key) {
    const path1 = '/tmp/firebase_key.json';
    const path2 = '/tmp/key.json';
    try {
      if (fs.existsSync(path1)) {
        key = fs.readFileSync(path1, 'utf8');
        console.log('ℹ️ Loaded Firebase key from', path1);
      } else if (fs.existsSync(path2)) {
        key = fs.readFileSync(path2, 'utf8');
        console.log('ℹ️ Loaded Firebase key from', path2);
      }
    } catch (e) {
      console.warn('⚠️ Could not read firebase key files:', e && e.message ? e.message : e);
    }
  }

  if (!key) {
    console.warn('⚠️ FIREBASE_SERVICE_KEY not set — Firebase not initialized (fallback noop)');
    return { initialized: false, firestore: makeNoopFirestore() };
  }

  try {
    let cred = typeof key === 'string' ? JSON.parse(key) : key;
    // Normalize private_key newlines if necessary
    if (cred && cred.private_key && typeof cred.private_key === 'string' && cred.private_key.indexOf('\\n') !== -1) {
      cred = Object.assign({}, cred, { private_key: cred.private_key.replace(/\\n/g, '\n') });
    }

    // Initialize firebase-admin if not already initialized
    try {
      // Log non-secret metadata to help debugging (do not log private_key)
      try {
        console.log('ℹ️ Firebase credential parsed for project:', cred.project_id, 'client_email:', cred.client_email);
      } catch (logErr) {
        // ignore
      }
      if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(cred),
          projectId: cred.project_id,
          databaseURL: `https://${cred.project_id}.firebaseio.com`,
        });
        console.log('✅ Firebase initialized for project:', cred.project_id);
      }
      const firestore = admin.firestore();
      // Recommended Firestore setting to ignore undefined properties
      try {
        firestore.settings && firestore.settings({ ignoreUndefinedProperties: true });
      } catch (e) {
        // ignore if settings not supported in this env
      }
      return { initialized: true, admin, firestore };
    } catch (inner) {
      console.error('🔥 Firebase initialization failed:', inner && inner.message ? inner.message : inner);
      return { initialized: false, firestore: makeNoopFirestore() };
    }
  } catch (e) {
    console.error('❌ Invalid FIREBASE_SERVICE_KEY JSON:', e && e.message ? e.message : e);
    return { initialized: false, firestore: makeNoopFirestore() };
  }
}

export { initFirebase };
