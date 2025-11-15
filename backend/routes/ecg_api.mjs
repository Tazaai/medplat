// backend/routes/ecg_api.mjs — Phase 8 M1: ECG Interpretation API
// REST API for ECG library access and MCQ generation

import express from 'express';
import { getECGCase, listECGCases, generateECGMCQ, generateECGQuiz, gradeECGAnswer } from '../ai/ecg_mcq_generator.mjs';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
	res.json({ status: 'operational', module: 'ecg', phase: '8-m1' });
});

/**
 * GET /api/ecg/stats
 * Get ECG library statistics
 */
router.get('/stats', async (req, res) => {
	try {
		const stats = await listECGCases({});
		res.json({
			total_cases: stats.total,
			categories: stats.categories,
			difficulty_levels: stats.difficulty_levels
		});
	} catch (error) {
		console.error('❌ /api/ecg/stats error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/ecg/list
 * List ECG cases with optional filters
 * Query params: category, difficulty, limit
 */
router.get('/list', async (req, res) => {
	try {
		const { category, difficulty, limit } = req.query;
		
		const result = await listECGCases({
			category: category || null,
			difficulty: difficulty || null,
			limit: limit || null
		});
		
		res.json(result);
	} catch (error) {
		console.error('❌ /api/ecg/list error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/ecg/case/:id
 * Get single ECG case by ID
 */
router.get('/case/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const ecgCase = await getECGCase(id);
		res.json(ecgCase);
	} catch (error) {
		console.error(`❌ /api/ecg/case/${req.params.id} error:`, error);
		res.status(404).json({ error: error.message });
	}
});

/**
 * POST /api/ecg/mcq/generate
 * Generate MCQ from specific ECG case
 * Body: { case_id, num_distractors?, include_explanation? }
 */
router.post('/mcq/generate', async (req, res) => {
	try {
		const { case_id, num_distractors, include_explanation } = req.body;
		
		if (!case_id) {
			return res.status(400).json({ error: 'case_id is required' });
		}
		
		const mcq = await generateECGMCQ(case_id, {
			num_distractors: num_distractors || 3,
			include_explanation: include_explanation !== false // Default true
		});
		
		res.json(mcq);
	} catch (error) {
		console.error('❌ /api/ecg/mcq/generate error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/ecg/quiz/generate
 * Generate quiz with multiple ECG MCQs
 * Body: { num_questions?, category?, difficulty?, include_explanations? }
 */
router.post('/quiz/generate', async (req, res) => {
	try {
		const { num_questions, category, difficulty, include_explanations } = req.body;
		
		const quiz = await generateECGQuiz({
			num_questions: num_questions || 5,
			category: category || null,
			difficulty: difficulty || null,
			include_explanations: include_explanations || false
		});
		
		res.json(quiz);
	} catch (error) {
		console.error('❌ /api/ecg/quiz/generate error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/ecg/grade
 * Grade user's ECG MCQ answer
 * Body: { question_data, user_answer, user_id }
 */
router.post('/grade', async (req, res) => {
	try {
		const { question_data, user_answer, user_id } = req.body;
		
		if (!question_data || !user_answer) {
			return res.status(400).json({ error: 'question_data and user_answer are required' });
		}
		
		const result = gradeECGAnswer(question_data, user_answer);
		
		// Phase 8 M2: Track performance for adaptive difficulty
		if (user_id && result.correct !== undefined) {
			const category = question_data.category || 'unknown';
			const difficulty = question_data.difficulty || 'unknown';
			
			// Store performance in telemetry (non-blocking)
			try {
				await fetch(`${process.env.API_BASE || 'http://localhost:5000'}/api/telemetry/log`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						event_type: 'ecg_answer',
						user_id,
						metadata: {
							case_id: question_data.case_id,
							category,
							difficulty,
							correct: result.correct,
							timestamp: new Date().toISOString()
						}
					})
				}).catch(err => console.warn('Telemetry log failed (non-critical):', err.message));
			} catch (e) {
				// Telemetry failure is non-critical
			}
		}
		
		res.json(result);
	} catch (error) {
		console.error('❌ /api/ecg/grade error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/ecg/recommend
 * Get recommended ECG case based on user performance
 * Body: { user_id, user_level, performance_data }
 */
router.post('/recommend', async (req, res) => {
	try {
		const { user_id, user_level = 1, performance_data = {} } = req.body;
		
		// Phase 8 M2: Adaptive difficulty progression
		const { weak_categories = [], total_correct = 0, total_wrong = 0 } = performance_data;
		
		// Calculate accuracy
		const total_attempts = total_correct + total_wrong;
		const accuracy = total_attempts > 0 ? total_correct / total_attempts : 0.5;
		
		// Determine difficulty based on level and accuracy
		let recommended_difficulty = 'beginner';
		if (user_level >= 15 || accuracy >= 0.85) {
			recommended_difficulty = 'expert';
		} else if (user_level >= 10 || accuracy >= 0.75) {
			recommended_difficulty = 'advanced';
		} else if (user_level >= 5 || accuracy >= 0.65) {
			recommended_difficulty = 'intermediate';
		}
		
		// Weak-area targeting: 60% weak areas, 40% new topics
		let recommended_category = null;
		if (weak_categories.length > 0 && Math.random() < 0.6) {
			// Pick random weak category
			recommended_category = weak_categories[Math.floor(Math.random() * weak_categories.length)];
		}
		
		res.json({
			recommended_difficulty,
			recommended_category,
			reason: weak_categories.length > 0 
				? `Focusing on weak area: ${recommended_category}` 
				: 'Exploring new topics',
			unlocked_difficulties: getUnlockedDifficulties(user_level)
		});
	} catch (error) {
		console.error('❌ /api/ecg/recommend error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Helper: Get unlocked difficulty levels based on user level
 */
function getUnlockedDifficulties(user_level) {
	const unlocked = ['beginner'];
	if (user_level >= 5) unlocked.push('intermediate');
	if (user_level >= 10) unlocked.push('advanced');
	if (user_level >= 15) unlocked.push('expert');
	return unlocked;
}

/**
 * GET /api/ecg/categories
 * Get list of available ECG categories
 */
router.get('/categories', async (req, res) => {
	try {
		const stats = await listECGCases({});
		res.json({
			categories: stats.categories.map(cat => ({
				id: cat,
				name: cat.charAt(0).toUpperCase() + cat.slice(1),
				description: getCategoryDescription(cat)
			}))
		});
	} catch (error) {
		console.error('❌ /api/ecg/categories error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Helper: Get category descriptions
 */
function getCategoryDescription(category) {
	const descriptions = {
		'arrhythmias': 'Abnormal heart rhythms including AF, flutter, SVT, VT',
		'blocks': 'Conduction abnormalities (AV blocks, bundle branch blocks)',
		'ischemia': 'Acute coronary syndromes (STEMI, NSTEMI, angina)',
		'electrolyte': 'ECG changes from electrolyte imbalances (K+, Ca2+, Mg2+)',
		'congenital': 'Inherited cardiac conditions (WPW, Brugada, Long QT)'
	};
	return descriptions[category] || category;
}

/**
 * POST /api/ecg/exam
 * Generate certification exam (20 mixed-difficulty questions, 20-minute timer)
 * Phase 11: Certification Mode
 * Body: { user_level?, include_all_categories? }
 */
router.post('/exam', async (req, res) => {
	try {
		const { user_level = 5, include_all_categories = true } = req.body;
		
		// Mix of difficulties based on user level
		const difficultyDistribution = {
			beginner: user_level < 5 ? 8 : 4,
			intermediate: user_level < 10 ? 8 : 6,
			advanced: user_level < 15 ? 4 : 6,
			expert: user_level >= 15 ? 2 : 4
		};
		
		const exam_questions = [];
		
		// Generate questions for each difficulty level
		for (const [difficulty, count] of Object.entries(difficultyDistribution)) {
			if (count > 0) {
				const quiz = await generateECGQuiz({
					num_questions: count,
					difficulty: difficulty,
					include_explanations: true,
					category: null // Mix all categories
				});
				
				exam_questions.push(...quiz.questions);
			}
		}
		
		// Shuffle exam questions
		const shuffled_exam = exam_questions.sort(() => 0.5 - Math.random());
		const final_exam = shuffled_exam.slice(0, 20); // Exactly 20 questions
		
		res.json({
			success: true,
			exam: {
				id: `exam_${Date.now()}`,
				total_questions: final_exam.length,
				time_limit_minutes: 20,
				passing_score: 70,
				questions: final_exam,
				difficulty_breakdown: difficultyDistribution,
				instructions: [
					'Answer all 20 questions within 20 minutes',
					'Each question is worth 5 points (100 points total)',
					'Passing score: 70% (14/20 correct)',
					'No backward navigation allowed',
					'Certificate available upon passing'
				]
			},
			meta: {
				user_level,
				exam_type: 'ecg_certification',
				created_at: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('❌ /api/ecg/exam error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
