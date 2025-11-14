/**
 * Exam Prep API - Phase 6 M3
 * Endpoints for exam track management, simulations, and score prediction
 */

import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  generateExamSession,
  startExamSession,
  submitAnswer,
  toggleMarkQuestion,
  completeExamSession,
  predictExamScore,
  getExamAnalytics
} from '../utils/exam_simulator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Load exam tracks
let examTracks = {};
try {
  const tracksPath = join(__dirname, '../data/exam_tracks.json');
  examTracks = JSON.parse(readFileSync(tracksPath, 'utf8'));
} catch (err) {
  console.error('Failed to load exam tracks:', err);
}

/**
 * GET /api/exam_prep/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'exam_prep',
    status: 'operational',
    tracks_loaded: Object.keys(examTracks).length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/exam_prep/tracks
 * List all exam tracks
 */
router.get('/tracks', (req, res) => {
  try {
    const tracks = Object.entries(examTracks).map(([id, track]) => ({
      id,
      name: track.name,
      description: track.description,
      exam_body: track.exam_body,
      country: track.country,
      total_questions: track.total_questions,
      duration_minutes: track.duration_minutes,
      passing_score: track.passing_score,
      difficulty: track.difficulty,
      estimated_prep_weeks: track.estimated_prep_weeks
    }));

    res.json({ ok: true, tracks });
  } catch (err) {
    console.error('Error listing tracks:', err);
    res.status(500).json({ ok: false, error: 'Failed to list exam tracks' });
  }
});

/**
 * GET /api/exam_prep/tracks/:id
 * Get exam track details
 */
router.get('/tracks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const track = examTracks[id];

    if (!track) {
      return res.status(404).json({ ok: false, error: 'Exam track not found' });
    }

    res.json({ ok: true, track });
  } catch (err) {
    console.error('Error getting track:', err);
    res.status(500).json({ ok: false, error: 'Failed to get exam track' });
  }
});

/**
 * POST /api/exam_prep/session/create
 * Create new exam session
 * Body: { uid, exam_track_id, question_count? }
 */
router.post('/session/create', async (req, res) => {
  try {
    const { uid, exam_track_id, question_count } = req.body;

    if (!uid || !exam_track_id) {
      return res.status(400).json({ ok: false, error: 'uid and exam_track_id are required' });
    }

    const track = examTracks[exam_track_id];
    if (!track) {
      return res.status(404).json({ ok: false, error: 'Exam track not found' });
    }

    const db = req.app.locals.db;
    const session = await generateExamSession(db, uid, exam_track_id, track, question_count);

    res.json({ ok: true, session });
  } catch (err) {
    console.error('Error creating exam session:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to create exam session' });
  }
});

/**
 * POST /api/exam_prep/session/start
 * Start exam timer
 * Body: { session_id }
 */
router.post('/session/start', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ ok: false, error: 'session_id is required' });
    }

    const db = req.app.locals.db;
    const session = await startExamSession(db, session_id);

    res.json({ ok: true, session });
  } catch (err) {
    console.error('Error starting exam session:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to start exam session' });
  }
});

/**
 * GET /api/exam_prep/session/:id
 * Get exam session details
 */
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const sessionDoc = await db.collection('exam_sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }

    res.json({ ok: true, session: sessionDoc.data() });
  } catch (err) {
    console.error('Error getting session:', err);
    res.status(500).json({ ok: false, error: 'Failed to get exam session' });
  }
});

/**
 * POST /api/exam_prep/session/answer
 * Submit answer for question
 * Body: { session_id, question_id, answer, time_spent }
 */
router.post('/session/answer', async (req, res) => {
  try {
    const { session_id, question_id, answer, time_spent } = req.body;

    if (!session_id || !question_id || answer === undefined) {
      return res.status(400).json({ ok: false, error: 'session_id, question_id, and answer are required' });
    }

    const db = req.app.locals.db;
    const result = await submitAnswer(db, session_id, question_id, answer, time_spent || 0);

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to submit answer' });
  }
});

/**
 * POST /api/exam_prep/session/mark
 * Toggle marked flag on question
 * Body: { session_id, question_id }
 */
router.post('/session/mark', async (req, res) => {
  try {
    const { session_id, question_id } = req.body;

    if (!session_id || !question_id) {
      return res.status(400).json({ ok: false, error: 'session_id and question_id are required' });
    }

    const db = req.app.locals.db;
    const result = await toggleMarkQuestion(db, session_id, question_id);

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Error marking question:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to mark question' });
  }
});

/**
 * POST /api/exam_prep/session/complete
 * Complete exam and get results
 * Body: { session_id }
 */
router.post('/session/complete', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ ok: false, error: 'session_id is required' });
    }

    const db = req.app.locals.db;
    const result = await completeExamSession(db, session_id);

    res.json({ ok: true, result });
  } catch (err) {
    console.error('Error completing exam:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to complete exam' });
  }
});

/**
 * GET /api/exam_prep/predict
 * Predict exam score for user
 * Query: uid, exam_track_id
 */
router.get('/predict', async (req, res) => {
  try {
    const { uid, exam_track_id } = req.query;

    if (!uid || !exam_track_id) {
      return res.status(400).json({ ok: false, error: 'uid and exam_track_id are required' });
    }

    const db = req.app.locals.db;
    const prediction = await predictExamScore(db, uid, exam_track_id);

    res.json({ ok: true, prediction });
  } catch (err) {
    console.error('Error predicting score:', err);
    res.status(500).json({ ok: false, error: 'Failed to predict exam score' });
  }
});

/**
 * GET /api/exam_prep/analytics
 * Get exam performance analytics
 * Query: uid, exam_track_id
 */
router.get('/analytics', async (req, res) => {
  try {
    const { uid, exam_track_id } = req.query;

    if (!uid || !exam_track_id) {
      return res.status(400).json({ ok: false, error: 'uid and exam_track_id are required' });
    }

    const db = req.app.locals.db;
    const analytics = await getExamAnalytics(db, uid, exam_track_id);

    res.json({ ok: true, analytics });
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({ ok: false, error: 'Failed to get exam analytics' });
  }
});

/**
 * GET /api/exam_prep/history
 * Get user's exam history across all tracks
 * Query: uid
 */
router.get('/history', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const db = req.app.locals.db;
    const historyQuery = await db.collection('exam_history')
      .where('user_id', '==', uid)
      .orderBy('completed_at', 'desc')
      .limit(50)
      .get();

    const history = historyQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ ok: true, history });
  } catch (err) {
    console.error('Error getting history:', err);
    res.status(500).json({ ok: false, error: 'Failed to get exam history' });
  }
});

export default router;
