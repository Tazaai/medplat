import express from 'express';
import { initFirebase } from '../firebaseClient.js';

export default function topicsApi() {
  const router = express.Router();

  const fb = initFirebase();
  const firestore = fb && fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || 'topics2';

  // Helper: safely read all docs from topics collection (noop firestore returns empty list)
  async function readAllTopics() {
    try {
      const col = firestore.collection(collectionName);
      const snapshot = await col.get();
      // firestore-admin returns QuerySnapshot with docs; noop returns { docs: [] }
      const docs = snapshot && snapshot.docs ? snapshot.docs : [];
      return docs.map((d) => {
        // d.data() when real Firestore; noop docs may already be plain objects
        const data = typeof d.data === 'function' ? d.data() : d;
        return { id: d.id || data.id || null, ...data };
      });
    } catch (e) {
      console.warn('Failed to read topics collection:', e.message || e);
      return [];
    }
  }

  // POST /api/topics/categories - return list of categories/areas
  router.post('/categories', async (req, res) => {
    const docs = await readAllTopics();
    const seen = new Set();
    for (const d of docs) {
      const area = d.area || d.category || d.topic_area || d.section || 'General';
      if (area) seen.add(String(area));
    }
    const categories = Array.from(seen).sort();
    res.json({ ok: true, categories });
  });

  // POST /api/topics - accept { area } and return matching topics
  router.post('/', async (req, res) => {
    const { area, search } = req.body || {};
    const docs = await readAllTopics();
    let filtered = docs;
    if (area) {
      filtered = filtered.filter((d) => {
        const a = (d.area || d.category || d.topic_area || d.section || '').toString();
        return a.toLowerCase() === String(area).toLowerCase();
      });
    }
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((d) => (d.topic || d.title || '').toString().toLowerCase().includes(s));
    }

    // Normalize to objects with id and topic fields expected by frontend
    const topics = filtered.map((d) => ({ id: d.id || d._id || null, topic: d.topic || d.title || d.name || '' }));
    res.json({ ok: true, topics });
  });

  return router;
}
