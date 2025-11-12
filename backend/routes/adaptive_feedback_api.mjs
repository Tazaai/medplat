// backend/routes/adaptive_feedback_api.mjs
// Phase 3: Adaptive feedback with 60/40 remedial/new quiz logic
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

// POST /api/adaptive-feedback/update-weak-areas
router.post('/update-weak-areas', async (req, res) => {
  const { uid, topic, weakAreas } = req.body;

  if (!uid || !topic || !weakAreas) {
    return res.status(400).json({ ok: false, error: 'uid, topic, and weakAreas are required' });
  }

  try {
    if (!db) {
      return res.json({ ok: true, warning: 'Firestore unavailable - weak areas not persisted' });
    }

    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      weak_areas: {
        [topic]: weakAreas
      }
    }, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update weak areas:', err);
    res.json({ ok: true, warning: 'Failed to persist weak areas: ' + err.message });
  }
});

// POST /api/adaptive-feedback/next-quiz-topics
router.post('/next-quiz-topics', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ ok: false, error: 'uid is required' });
  }

  try {
    if (!db) {
      return res.json({ ok: true, remedialTopics: [], newTopics: [], warning: 'Firestore unavailable' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const weakAreas = userDoc.data()?.weak_areas || {};

    // Calculate topics with >50% miss rate (remedial)
    const remedialTopics = Object.entries(weakAreas)
      .map(([topic, areas]) => {
        const totalMissed = Object.values(areas).reduce((sum, a) => sum + (a.missed || 0), 0);
        const totalQuestions = Object.values(areas).reduce((sum, a) => sum + (a.total || 0), 0);
        const missRate = totalQuestions > 0 ? totalMissed / totalQuestions : 0;
        return { topic, missRate, totalMissed, totalQuestions };
      })
      .filter(({ missRate }) => missRate > 0.5)
      .sort((a, b) => b.missRate - a.missRate) // Highest miss rate first
      .map(({ topic }) => topic);

    // For demonstration, suggest some new topics (in real implementation, fetch from topics collection)
    const newTopics = ['Heart Failure', 'Myocardial Infarction', 'Hypertension', 'Pneumonia'];

    // 60% remedial, 40% new
    const remedialCount = Math.ceil(12 * 0.6); // 8 questions
    const newCount = 12 - remedialCount; // 4 questions

    res.json({ 
      ok: true, 
      remedialTopics: remedialTopics.slice(0, remedialCount),
      newTopics: newTopics.slice(0, newCount),
      distribution: { remedial: remedialCount, new: newCount }
    });
  } catch (err) {
    console.error('Failed to fetch next quiz topics:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/adaptive-feedback/update-progress
router.post('/update-progress', async (req, res) => {
  const { uid, xp, streak, quizCompleted, tier } = req.body;

  if (!uid) {
    return res.status(400).json({ ok: false, error: 'uid is required' });
  }

  try {
    if (!db) {
      return res.json({ ok: true, warning: 'Firestore unavailable - progress not persisted' });
    }

    const userRef = db.collection('users').doc(uid);
    const today = new Date().toISOString().split('T')[0];

    const updates = {
      lastQuizDate: today,
      totalQuizzes: (await userRef.get()).data()?.totalQuizzes || 0 + 1
    };

    if (xp !== undefined) updates.xp = xp;
    if (streak !== undefined) updates.streak = streak;
    if (tier) {
      updates[`${tier.toLowerCase()}Count`] = ((await userRef.get()).data()?.[`${tier.toLowerCase()}Count`] || 0) + 1;
    }

    await userRef.set({ progress: updates }, { merge: true });

    res.json({ ok: true, progress: updates });
  } catch (err) {
    console.error('Failed to update progress:', err);
    res.json({ ok: true, warning: 'Failed to persist progress: ' + err.message });
  }
});

export default router;
