// Lightweight Firebase client shim for local dev and CI checks.
// Do NOT commit real credentials. CI creates/uses Secret Manager.

function initFirebase() {
  const key = process.env.FIREBASE_SERVICE_KEY;
  if (!key) {
    console.warn('⚠️ FIREBASE_SERVICE_KEY not set — Firebase not initialized (expected for local dev)');
    return null;
  }
  try {
    const cred = JSON.parse(key);
    // In a full implementation you'd initialize firebase-admin here.
    console.log('✅ Firebase key present (not shown)');
    return cred;
  } catch (e) {
    console.error('❌ Invalid FIREBASE_SERVICE_KEY JSON:', e.message);
    return null;
  }
}

module.exports = { initFirebase };
