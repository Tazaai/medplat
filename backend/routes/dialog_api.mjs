import express from 'express';
import { logOpenAICall } from '../telemetry/telemetry_logger.mjs';

export default function dialogApi() {
  const router = express.Router();

  // POST /api/dialog - generate or fetch a case (stub)
  router.post('/', async (req, res) => {
    // Return a minimal AI reply structure expected by frontend
    res.json({
      ok: true,
      aiReply: {
        json: {
          Topic: req.body.topic || 'sample topic',
          Patient_History: 'No history (stub)',
          meta: { case_id: 'stub-1', region: req.body.userLocation || 'global' },
        },
      },
    });
  });

  return router;
}
