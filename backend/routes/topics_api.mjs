import express from 'express';

export default function topicsApi() {
  const router = express.Router();

  // POST /api/topics - list topics or categories
  router.post('/', async (req, res) => {
    // Minimal stub: return empty list to satisfy frontend and tests
    res.json({ ok: true, topics: [], categories: [] });
  });

  // POST /api/topics/categories - list categories (optional)
  router.post('/categories', async (req, res) => {
    res.json({ ok: true, categories: ['General'] });
  });

  return router;
}
