const assert = require('assert');

(async () => {
  console.log('Running Firebase integration test...');
  const key = process.env.FIREBASE_SERVICE_KEY;
  if (!key) {
    console.error('FIREBASE_SERVICE_KEY not set — cannot run integration test');
    process.exit(2);
  }

  let cred;
  try {
    cred = JSON.parse(key);
  } catch (e) {
    console.error('Invalid FIREBASE_SERVICE_KEY JSON:', e.message);
    process.exit(3);
  }

  try {
  const { createRequire } = require('module');
  const require = createRequire(__filename);
  const admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    const db = admin.firestore();

    // write a small doc and delete it to verify write permissions
    const ref = await db.collection('integration-tests').add({ ping: 'pong', ts: Date.now() });
    assert(ref && ref.id, 'Failed to create test doc');
    await db.collection('integration-tests').doc(ref.id).delete();
    console.log('✅ Firebase integration test passed — write/delete OK');
    process.exit(0);
  } catch (e) {
    console.error('Firebase integration test failed:', e.message || e);
    process.exit(4);
  }
})();
