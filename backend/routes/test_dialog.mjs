import express from 'express';

export default function dialogApi() {
  const router = express.Router();
  router.post('/', async (req, res) => {
    res.json({ ok: true });
  });
  return router;
}

