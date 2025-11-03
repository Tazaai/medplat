Topics2 Firestore collection fix

Summary
-------

If the frontend shows "Topics count: 0", the backend may be either: (A) querying the wrong Firestore collection, or (B) not initializing Firebase with credentials and therefore returning an empty noop client.

What I changed
--------------

1. backend/firebaseClient.js
   - Added a safe local-dev fallback that will load `keys/serviceAccountKey.json` from the repository (if present) when neither `FIREBASE_SERVICE_KEY` env nor `/tmp` keys are available. This makes local testing simpler for contributors.

Files changed/created
---------------------

- Modified: `backend/firebaseClient.js` — added repo-key fallback.
- Created: `docs/TOPICS2_FIX.md` (this file) — short explanation and paste-ready endpoint code.

Paste-ready endpoint snippet (for ChatGPT / Copilot review)
---------------------------------------------------------

```js
// GET /api/topics - returns all topics from Firestore 'topics2' (or TOPICS_COLLECTION env)
router.get('/api/topics', async (req, res) => {
  try {
    const fb = initFirebase();
    const firestore = fb && fb.firestore;
    const collectionName = process.env.TOPICS_COLLECTION || 'topics2';

    const snapshot = await firestore.collection(collectionName).get();
    const docs = snapshot && snapshot.docs ? snapshot.docs : [];
    const topics = docs.map((d) => {
      const data = typeof d.data === 'function' ? d.data() : d;
      return { id: d.id || data.id || null, topic: data.topic || data.title || '' };
    });
    return res.json({ ok: true, topics });
  } catch (err) {
    console.error('GET /api/topics failed:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, topics: [] });
  }
});
```

How to test locally
-------------------

1. If you have a service account JSON in `keys/serviceAccountKey.json`, the backend will pick it up automatically (local dev convenience).
2. Start the backend:

```bash
# from repo root
npm install --prefix backend
node backend/index.js
```

3. Query the topics endpoint (assuming backend runs on 8080):

```bash
curl -sS "http://localhost:8080/api/topics" | jq '.'
```

If your backend picks up credentials and `topics2` contains documents, the response will include the number of topics and their fields.

Notes
-----
- The `keys/serviceAccountKey.json` fallback is only for local development convenience. Do not commit production credentials to the repository in general. CI and GitHub Actions still rely on `FIREBASE_SERVICE_KEY` and Secret Manager.
- If the backend still returns zero topics after this change, check that the Firestore project and collection (`topics2`) are in the same GCP project as configured by `GCP_PROJECT` / `GOOGLE_CLOUD_PROJECT`.
