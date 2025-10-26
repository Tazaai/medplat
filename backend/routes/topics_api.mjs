import express from 'express';
import firebaseClient from '../firebaseClient.js';

export default function topicsApi() {
  const router = express.Router();

  // POST /api/topics - returns topics list filtered by { area }
  router.post('/', async (req, res) => {
    try {
      const area = req.body?.area || null;
      const db = firebaseClient.getFirestore();
      if (!db) {
        // Fallback sample data when Firestore not configured
        const sample = [
          { id: 'abg_interpretation', topic: 'Arterial Blood Gas (ABG) Interpretation', category: 'Pulmonology', lang: 'en' },
        ];
        const filtered = area ? sample.filter((t) => t.category === area) : sample;
        return res.json({ ok: true, topics: filtered });
      }

      let q = db.collection('topics2');
      if (area) q = q.where('category', '==', area);
      const snap = await q.get();
      const topics = [];
      snap.forEach((doc) => {
        const data = doc.data();
        topics.push({ id: doc.id, topic: data.topic || data.name || '', category: data.category || '', lang: data.lang || 'en' });
      });
      return res.json({ ok: true, topics });
    } catch (e) {
      console.error('topics_api error:', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/topics/categories - list distinct categories
  router.post('/categories', async (req, res) => {
    try {
      const db = firebaseClient.getFirestore();
      if (!db) return res.json({ ok: true, categories: ['General'] });
      const snap = await db.collection('topics2').get();
      const cats = new Set();
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.category) cats.add(data.category);
      });
      return res.json({ ok: true, categories: Array.from(cats).sort() });
    } catch (e) {
      console.error('categories error:', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
