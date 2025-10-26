import express from 'express';

export default function commentApi() {
  const router = express.Router();

  // POST /api/comment - accept feedback (stub)
  router.post('/', async (req, res) => {
    // In real implementation persist feedback to Firestore
    res.json({ ok: true });
  });

  return router;
}
