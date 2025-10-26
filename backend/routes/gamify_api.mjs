import express from 'express';

export default function gamifyApi() {
  const router = express.Router();

  // POST /api/gamify - return MCQs (stub)
  router.post('/', async (req, res) => {
    // Minimal MCQ set: one question with choices
    const mcqs = [
      {
        id: 'q1',
        question: 'What is the most likely diagnosis?',
        choices: ['A', 'B', 'C', 'D'],
        correct: 'A',
        explanation: 'Stub explanation',
      },
    ];

    res.json({ ok: true, mcqs });
  });

  return router;
}
