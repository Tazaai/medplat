import express from 'express';
import { initFirebase } from '../firebaseClient.js';

export default function casesApi() {
  const router = express.Router();
  const fb = initFirebase();
  const firestore = fb && fb.firestore;
  const collectionName = process.env.CASES_COLLECTION || 'cases';

  // POST /api/cases - save a case document
  router.post('/', async (req, res) => {
    try {
      const payload = req.body || {};
      // attach metadata
      const doc = { ...payload, created_at: new Date().toISOString() };
      const col = firestore.collection(collectionName);
      const addRes = await col.add(doc);
      res.json({ ok: true, id: addRes && addRes.id ? addRes.id : null });
    } catch (e) {
      console.error('Failed to save case:', e.message || e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // GET /api/cases - list recent cases (optional)
  router.get('/', async (req, res) => {
    try {
      const col = firestore.collection(collectionName);
      const snapshot = await col.get();
      const docs = snapshot && snapshot.docs ? snapshot.docs : [];
      const items = docs.map((d) => ({ id: d.id || null, ...(typeof d.data === 'function' ? d.data() : d) }));
      res.json({ ok: true, cases: items });
    } catch (e) {
      console.warn('Failed to list cases:', e.message || e);
      res.json({ ok: true, cases: [] });
    }
  });

  return router;
}
