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

  // GET /api/topics/search - read-only search endpoint (use query params: ?area=...&search=...)
  // We intentionally expose only a GET-based search to keep topics read-only.
  router.get('/search', async (req, res) => {
    const { area, search } = req.query || {};
    const docs = await readAllTopics();
    let filtered = docs;
    // Treat area='all' as a wildcard (no filter)
    if (area && String(area).toLowerCase() !== 'all') {
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

  // POST /api/topics/search - read-only advanced search accepting JSON body
  router.post('/search', async (req, res) => {
    try {
      const { area, search, tags } = req.body || {};
      const docs = await readAllTopics();
      let filtered = docs;
      // Treat area='all' as a wildcard (no filter)
      if (area && String(area).toLowerCase() !== 'all') {
        filtered = filtered.filter((d) => {
          const a = (d.area || d.category || d.topic_area || d.section || '').toString();
          return a.toLowerCase() === String(area).toLowerCase();
        });
      }
      if (search) {
        const s = String(search).toLowerCase();
        filtered = filtered.filter((d) => (d.topic || d.title || '').toString().toLowerCase().includes(s));
      }
      if (Array.isArray(tags) && tags.length) {
        filtered = filtered.filter((d) => {
          const t = Array.isArray(d.tags) ? d.tags : (d.tags || '').toString().split(/[, ]+/).filter(Boolean);
          return tags.every((tag) => t.includes(tag));
        });
      }

      const topics = filtered.map((d) => ({ id: d.id || d._id || null, topic: d.topic || d.title || d.name || '' }));
      return res.json({ ok: true, topics });
    } catch (err) {
      console.error('POST /api/topics/search failed:', err && err.stack ? err.stack : err);
      return res.status(500).json({ ok: false, topics: [] });
    }
  });

  // Guard: enforce read-only for the root topics endpoint
  // This rejects any non-GET methods to the base '/' path to avoid accidental writes.
  router.all('/', (req, res, next) => {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Read-only endpoint' });
    return next();
  });

  // GET /api/topics - convenience endpoint for diagnostics and browsers
  // Returns same shape as POST '/' but ignores filters (returns all topics)
  router.get('/', async (req, res) => {
    try {
      const docs = await readAllTopics();
      const topics = docs.map((d) => ({ id: d.id || d._id || null, topic: d.topic || d.title || d.name || '' }));
      res.json({ ok: true, topics });
    } catch (e) {
      console.warn('GET /api/topics failed:', e && e.message ? e.message : e);
      res.status(500).json({ ok: false, topics: [] });
    }
  });

  return router;
}
