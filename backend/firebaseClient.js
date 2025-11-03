// Lightweight Firebase client shim for local dev and CI checks.
// Do NOT commit real credentials. CI creates/uses Secret Manager.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

function initFirebase() {
  const fs = require('fs');
  // First, prefer an explicit file mounted at GOOGLE_APPLICATION_CREDENTIALS
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/app/serviceAccountKey.json';
  console.log('Firebase credential path:', credPath, fs.existsSync(credPath) ? '✅ exists' : '❌ missing');

  // Prefer FIREBASE_SERVICE_KEY (env or /tmp) when present, otherwise try the mounted file
  let key = process.env.FIREBASE_SERVICE_KEY;
  try {
    if (!key) {
      // Try known runtime paths first
      const path1 = '/tmp/firebase_key.json';
      const path2 = '/tmp/key.json';
      if (fs.existsSync(path1)) {
        key = fs.readFileSync(path1, 'utf8');
        console.log('ℹ️ Loaded Firebase key from', path1);
      } else if (fs.existsSync(path2)) {
        key = fs.readFileSync(path2, 'utf8');
        console.log('ℹ️ Loaded Firebase key from', path2);
      } else if (fs.existsSync(credPath)) {
        // If the secret was mounted to the container (Secret Manager), read it directly
        key = fs.readFileSync(credPath, 'utf8');
        console.log('ℹ️ Loaded Firebase key from', credPath);
      } else {
        // Local repo fallback for contributors only
        try {
          const repoKeyUrl = new URL('../keys/serviceAccountKey.json', import.meta.url);
          if (fs.existsSync(repoKeyUrl.pathname)) {
            key = fs.readFileSync(repoKeyUrl.pathname, 'utf8');
            console.log('ℹ️ Loaded Firebase key from repo keys/serviceAccountKey.json (local dev)');
          }
        } catch (repoErr) {
          // ignore and continue
        }
      }
    }
  } catch (fileErr) {
    console.warn('⚠️ Could not read firebase key file:', fileErr.message);
  }

  if (!key) {
    console.warn('⚠️ FIREBASE_SERVICE_KEY not set and no mounted key found — Firebase not initialized (expected for local dev)');
    return { initialized: false, firestore: makeNoopFirestore() };
  }

  try {
    let cred = JSON.parse(key);
    // Some workflows/store formats may leave literal "\\n" sequences in the private_key.
    // Ensure private_key has real newlines before passing to firebase-admin.
    if (cred && cred.private_key && typeof cred.private_key === 'string' && cred.private_key.indexOf('\\n') !== -1) {
      cred = Object.assign({}, cred, { private_key: cred.private_key.replace(/\\n/g, '\n') });
    }
    // Attempt a real firebase-admin init if the package is installed.
    try {
      // use createRequire to load CommonJS firebase-admin when available
      const admin = require('firebase-admin');
      if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(cred) });
        console.log('✅ Firebase initialized using FIREBASE_SERVICE_KEY');
      }
      return { initialized: true, admin, firestore: admin.firestore() };
    } catch (innerErr) {
      // firebase-admin not installed or initialization failed — fallback to a noop client
      console.warn('⚠️ firebase-admin not available or failed to init — using noop Firebase client:', innerErr.message);
      return { initialized: false, cred, firestore: makeNoopFirestore() };
    }
  } catch (e) {
    console.error('❌ Invalid FIREBASE_SERVICE_KEY JSON:', e.message);
    return { initialized: false, firestore: makeNoopFirestore() };
  }
}

export { initFirebase };
