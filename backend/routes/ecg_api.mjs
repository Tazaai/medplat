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
 * Body: { question_data, user_answer }
 */
router.post('/grade', async (req, res) => {
	try {
		const { question_data, user_answer } = req.body;
		
		if (!question_data || !user_answer) {
			return res.status(400).json({ error: 'question_data and user_answer are required' });
		}
		
		const result = gradeECGAnswer(question_data, user_answer);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/ecg/grade error:', error);
		res.status(500).json({ error: error.message });
	}
});

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

export default router;
