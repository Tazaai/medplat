/**
 * Medical Glossary API - Phase 7 M4
 * Dual-purpose REST endpoints:
 * 1. Case study mode: term lookup, auto-linking, tooltips
 * 2. Gamification mode: quiz generation, grading, XP rewards
 */

import express from 'express';
import glossaryService from '../ai/glossary_service.mjs';

const router = express.Router();

/**
 * Health check
 * GET /api/glossary/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    module: 'glossary',
    phase: '7-m4',
    modes: {
      case_tooltips: true,
      quiz_generation: true,
      multi_language: true
    },
    features: [
      'term_lookup',
      'auto_linking',
      'search',
      'quiz_generation',
      'quiz_grading',
      'xp_rewards',
      'related_terms'
    ]
  });
});

/**
 * Get glossary statistics
 * GET /api/glossary/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await glossaryService.getGlossaryStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: 'Failed to get glossary statistics' });
  }
});

/**
 * Get term by ID
 * GET /api/glossary/term/:id
 */
router.get('/term/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en' } = req.query;

    const term = await glossaryService.getTermById(id);
    
    // Include translation if requested
    const response = {
      ...term,
      translation: language !== 'en' ? term.translations[language] : null
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Get term error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Search terms
 * POST /api/glossary/search
 * Body: { query, language?, specialty?, difficulty?, limit? }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, language, specialty, difficulty, limit } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await glossaryService.searchTerms(query, {
      language,
      specialty,
      difficulty,
      limit
    });

    res.json({
      query,
      result_count: results.length,
      results
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Auto-link terms in case text (for case study mode)
 * POST /api/glossary/auto-link
 * Body: { text, language?, includeCommon? }
 */
router.post('/auto-link', async (req, res) => {
  try {
    const { text, language, includeCommon } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await glossaryService.autoLinkTerms(text, {
      language,
      includeCommon
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Auto-link error:', error);
    res.status(500).json({ error: 'Auto-linking failed' });
  }
});

/**
 * Get related terms
 * GET /api/glossary/related/:id
 */
router.get('/related/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const related = await glossaryService.getRelatedTerms(id, parseInt(limit));

    res.json({
      term_id: id,
      related_count: related.length,
      related_terms: related
    });
  } catch (error) {
    console.error('❌ Related terms error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Get terms by specialty
 * GET /api/glossary/specialty/:specialty
 */
router.get('/specialty/:specialty', async (req, res) => {
  try {
    const { specialty } = req.params;
    const { difficulty, limit } = req.query;

    const terms = await glossaryService.getTermsBySpecialty(specialty, {
      difficulty,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      specialty,
      term_count: terms.length,
      terms
    });
  } catch (error) {
    console.error('❌ Get specialty terms error:', error);
    res.status(500).json({ error: 'Failed to get specialty terms' });
  }
});

/**
 * ===== GAMIFICATION QUIZ MODE =====
 */

/**
 * Generate quiz (gamification mode)
 * POST /api/glossary/quiz/generate
 * Body: { count?, difficulty?, specialty?, language?, exclude_terms? }
 */
router.post('/quiz/generate', async (req, res) => {
  try {
    const {
      count = 10,
      difficulty,
      specialty,
      language = 'en',
      exclude_terms = []
    } = req.body;

    const quiz = await glossaryService.generateQuiz({
      count,
      difficulty,
      specialty,
      language,
      exclude_terms
    });

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('❌ Quiz generation error:', error);
    res.status(500).json({ error: 'Quiz generation failed' });
  }
});

/**
 * Submit quiz answers and get grading + XP (gamification mode)
 * POST /api/glossary/quiz/submit
 * Body: { quiz_id, answers: { question_id: selected_index }, user_id }
 */
router.post('/quiz/submit', async (req, res) => {
  try {
    const { quiz_id, answers, user_id } = req.body;

    if (!quiz_id || !answers || !user_id) {
      return res.status(400).json({
        error: 'quiz_id, answers, and user_id are required'
      });
    }

    const result = await glossaryService.gradeQuiz(quiz_id, answers, user_id);

    res.json({
      success: true,
      grading: result
    });
  } catch (error) {
    console.error('❌ Quiz grading error:', error);
    res.status(500).json({ error: 'Quiz grading failed' });
  }
});

/**
 * Get quiz terms for study mode (show terms before quiz)
 * POST /api/glossary/quiz/study-terms
 * Body: { difficulty?, specialty?, count? }
 */
router.post('/quiz/study-terms', async (req, res) => {
  try {
    const { difficulty, specialty, count = 20 } = req.body;

    const quiz = await glossaryService.generateQuiz({
      count,
      difficulty,
      specialty,
      language: 'en'
    });

    // Extract just the terms (no questions) for study mode
    const studyTerms = quiz.questions.map(q => ({
      term_id: q.term_id,
      term: q.term,
      difficulty: q.difficulty,
      // Don't reveal the answer yet
      hint: q.hints[0]
    }));

    res.json({
      study_set_id: quiz.quiz_id,
      term_count: studyTerms.length,
      difficulty: quiz.difficulty,
      specialty: quiz.specialty,
      terms: studyTerms
    });
  } catch (error) {
    console.error('❌ Study terms error:', error);
    res.status(500).json({ error: 'Failed to generate study terms' });
  }
});

/**
 * Get difficulty-based term recommendations for weak areas
 * POST /api/glossary/quiz/recommendations
 * Body: { user_weak_areas?: [specialty], current_difficulty? }
 */
router.post('/quiz/recommendations', async (req, res) => {
  try {
    const {
      user_weak_areas = [],
      current_difficulty = 'intermediate',
      count = 15
    } = req.body;

    // Generate quiz focused on weak areas
    // If multiple specialties, distribute evenly
    const termsPerSpecialty = Math.ceil(count / Math.max(user_weak_areas.length, 1));
    
    let recommendations = [];

    if (user_weak_areas.length > 0) {
      for (const specialty of user_weak_areas) {
        const terms = await glossaryService.getTermsBySpecialty(specialty, {
          difficulty: current_difficulty,
          limit: termsPerSpecialty
        });
        recommendations.push(...terms);
      }
    } else {
      // No weak areas - general recommendations
      const quiz = await glossaryService.generateQuiz({
        count,
        difficulty: current_difficulty
      });
      recommendations = quiz.questions.map(q => ({
        term_id: q.term_id,
        term: q.term,
        difficulty: q.difficulty,
        xp_value: q.xp_value
      }));
    }

    res.json({
      recommendation_count: recommendations.length,
      target_difficulty: current_difficulty,
      weak_areas: user_weak_areas,
      recommendations: recommendations.slice(0, count)
    });
  } catch (error) {
    console.error('❌ Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * Get quiz leaderboard (top performers)
 * GET /api/glossary/quiz/leaderboard
 * Query: period=daily|weekly|all, limit=10
 */
router.get('/quiz/leaderboard', async (req, res) => {
  try {
    const { period = 'weekly', limit = 10 } = req.query;

    // Placeholder - would query user quiz performance from database
    // For now, return mock leaderboard
    const leaderboard = [
      {
        rank: 1,
        user_id: 'user_123',
        username: 'Dr. Smith',
        total_xp: 4580,
        quizzes_completed: 42,
        avg_accuracy: 94.5,
        streak_days: 15
      },
      {
        rank: 2,
        user_id: 'user_456',
        username: 'MedStudent2025',
        total_xp: 4120,
        quizzes_completed: 38,
        avg_accuracy: 91.2,
        streak_days: 12
      },
      {
        rank: 3,
        user_id: 'user_789',
        username: 'CardioExpert',
        total_xp: 3950,
        quizzes_completed: 35,
        avg_accuracy: 96.8,
        streak_days: 8
      }
    ];

    res.json({
      period,
      updated_at: new Date().toISOString(),
      leaderboard: leaderboard.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * Get user quiz history and performance
 * GET /api/glossary/quiz/history/:userId
 */
router.get('/quiz/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    // Placeholder - would query from database
    const history = [
      {
        quiz_id: 'quiz_001',
        completed_at: new Date(Date.now() - 3600000).toISOString(),
        difficulty: 'intermediate',
        specialty: 'cardiology',
        questions: 10,
        correct: 8,
        accuracy: 80,
        xp_earned: 165,
        time_taken_seconds: 420
      }
    ];

    res.json({
      user_id: userId,
      total_quizzes: history.length,
      history: history.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({ error: 'Failed to get quiz history' });
  }
});

export default router;
