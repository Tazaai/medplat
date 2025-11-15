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

/**
 * GET /api/ecg/admin/usage
 * Admin analytics: ECG module usage statistics
 * Phase 12: Analytics & Admin Dashboard
 */
router.get('/admin/usage', async (req, res) => {
	try {
		// Simulated analytics (in production, would query Firestore telemetry)
		const usage = {
			total_users: 1247,
			active_last_7_days: 421,
			active_last_30_days: 856,
			total_sessions: 5632,
			avg_session_duration_minutes: 12.4,
			total_cases_attempted: 12847,
			total_quizzes_completed: 4521,
			total_exams_taken: 287,
			exam_pass_rate: 68.3,
			most_popular_categories: [
				{ category: 'arrhythmias', sessions: 2134 },
				{ category: 'ischemia', sessions: 1876 },
				{ category: 'blocks', sessions: 1421 },
				{ category: 'electrolyte', sessions: 1098 },
				{ category: 'congenital', sessions: 589 }
			],
			difficulty_distribution: {
				beginner: 4521,
				intermediate: 3876,
				advanced: 2234,
				expert: 1216
			},
			peak_usage_hours: [
				{ hour: 9, sessions: 456 },
				{ hour: 14, sessions: 521 },
				{ hour: 20, sessions: 612 }
			],
			timestamp: new Date().toISOString()
		};
		
		res.json({ success: true, usage });
	} catch (error) {
		console.error('❌ /api/ecg/admin/usage error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/ecg/admin/progress
 * Admin analytics: User progress trends
 * Phase 12: Analytics & Admin Dashboard
 */
router.get('/admin/progress', async (req, res) => {
	try {
		// Simulated progress analytics
		const progress = {
			avg_level: 4.2,
			avg_xp: 1245,
			level_distribution: [
				{ level: 1, users: 234 },
				{ level: 2, users: 198 },
				{ level: 3, users: 167 },
				{ level: 4, users: 145 },
				{ level: 5, users: 121 },
				{ level: 6, users: 98 },
				{ level: 7, users: 76 },
				{ level: 8, users: 54 },
				{ level: 9, users: 32 },
				{ level: 10, users: 22 }
			],
			avg_accuracy_by_category: {
				arrhythmias: 72.4,
				ischemia: 68.1,
				blocks: 65.3,
				electrolyte: 71.2,
				congenital: 58.7
			},
			streak_distribution: {
				'0_days': 421,
				'1-3_days': 289,
				'4-7_days': 167,
				'8-14_days': 98,
				'15-30_days': 54,
				'30+_days': 12
			},
			certification_stats: {
				total_attempts: 287,
				total_passes: 196,
				avg_score: 74.8,
				avg_time_minutes: 18.3
			},
			timestamp: new Date().toISOString()
		};
		
		res.json({ success: true, progress });
	} catch (error) {
		console.error('❌ /api/ecg/admin/progress error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/ecg/admin/weaknesses
 * Admin analytics: Common weak areas heatmap
 * Phase 12: Analytics & Admin Dashboard
 */
router.get('/admin/weaknesses', async (req, res) => {
	try {
		// Simulated weakness analytics
		const weaknesses = {
			by_category: [
				{ category: 'congenital', avg_accuracy: 58.7, users_struggling: 421 },
				{ category: 'blocks', avg_accuracy: 65.3, users_struggling: 367 },
				{ category: 'ischemia', avg_accuracy: 68.1, users_struggling: 298 },
				{ category: 'electrolyte', avg_accuracy: 71.2, users_struggling: 234 },
				{ category: 'arrhythmias', avg_accuracy: 72.4, users_struggling: 189 }
			],
			by_difficulty: {
				beginner: { avg_accuracy: 81.2, completion_rate: 92.1 },
				intermediate: { avg_accuracy: 69.4, completion_rate: 78.3 },
				advanced: { avg_accuracy: 54.7, completion_rate: 61.2 },
				expert: { avg_accuracy: 42.1, completion_rate: 48.9 }
			},
			most_failed_questions: [
				{ question_id: 'ecg_187', diagnosis: 'Brugada Syndrome Type 1', failure_rate: 67.8 },
				{ question_id: 'ecg_142', diagnosis: '3rd Degree AV Block with VT', failure_rate: 64.2 },
				{ question_id: 'ecg_093', diagnosis: 'Hyperkalemia (K+ >7)', failure_rate: 62.1 },
				{ question_id: 'ecg_201', diagnosis: 'WPW with AVRT', failure_rate: 59.4 },
				{ question_id: 'ecg_156', diagnosis: 'Posterior STEMI', failure_rate: 57.8 }
			],
			improvement_recommendations: [
				'Add more Brugada pattern examples',
				'Create dedicated AV block tutorial',
				'Expand electrolyte ECG changes module',
				'Add WPW syndrome practice cases',
				'Improve posterior MI ECG recognition'
			],
			timestamp: new Date().toISOString()
		};
		
		res.json({ success: true, weaknesses });
	} catch (error) {
		console.error('❌ /api/ecg/admin/weaknesses error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
