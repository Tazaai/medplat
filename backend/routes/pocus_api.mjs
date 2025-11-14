// backend/routes/pocus_api.mjs — Phase 8 M1: POCUS/Ultrasound Interpretation API
// REST API for POCUS library access and MCQ generation

import express from 'express';
import { getPOCUSCase, listPOCUSCases, generatePOCUSMCQ, generatePOCUSQuiz, gradePOCUSAnswer } from '../ai/pocus_mcq_generator.mjs';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
	res.json({ status: 'operational', module: 'pocus', phase: '8-m1' });
});

/**
 * GET /api/pocus/stats
 * Get POCUS library statistics
 */
router.get('/stats', async (req, res) => {
	try {
		const stats = await listPOCUSCases({});
		res.json({
			total_cases: stats.total,
			categories: stats.categories,
			difficulty_levels: stats.difficulty_levels
		});
	} catch (error) {
		console.error('❌ /api/pocus/stats error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/pocus/list
 * List POCUS cases with optional filters
 * Query params: category, difficulty, limit
 */
router.get('/list', async (req, res) => {
	try {
		const { category, difficulty, limit } = req.query;
		
		const result = await listPOCUSCases({
			category: category || null,
			difficulty: difficulty || null,
			limit: limit || null
		});
		
		res.json(result);
	} catch (error) {
		console.error('❌ /api/pocus/list error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/pocus/case/:id
 * Get single POCUS case by ID
 */
router.get('/case/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const pocusCase = await getPOCUSCase(id);
		res.json(pocusCase);
	} catch (error) {
		console.error(`❌ /api/pocus/case/${req.params.id} error:`, error);
		res.status(404).json({ error: error.message });
	}
});

/**
 * POST /api/pocus/mcq/generate
 * Generate MCQ from specific POCUS case
 * Body: { case_id, num_distractors?, include_explanation? }
 */
router.post('/mcq/generate', async (req, res) => {
	try {
		const { case_id, num_distractors, include_explanation } = req.body;
		
		if (!case_id) {
			return res.status(400).json({ error: 'case_id is required' });
		}
		
		const mcq = await generatePOCUSMCQ(case_id, {
			num_distractors: num_distractors || 3,
			include_explanation: include_explanation !== false // Default true
		});
		
		res.json(mcq);
	} catch (error) {
		console.error('❌ /api/pocus/mcq/generate error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/pocus/quiz/generate
 * Generate quiz with multiple POCUS MCQs
 * Body: { num_questions?, category?, difficulty?, include_explanations? }
 */
router.post('/quiz/generate', async (req, res) => {
	try {
		const { num_questions, category, difficulty, include_explanations } = req.body;
		
		const quiz = await generatePOCUSQuiz({
			num_questions: num_questions || 5,
			category: category || null,
			difficulty: difficulty || null,
			include_explanations: include_explanations || false
		});
		
		res.json(quiz);
	} catch (error) {
		console.error('❌ /api/pocus/quiz/generate error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/pocus/grade
 * Grade user's POCUS MCQ answer
 * Body: { question_data, user_answer }
 */
router.post('/grade', async (req, res) => {
	try {
		const { question_data, user_answer } = req.body;
		
		if (!question_data || !user_answer) {
			return res.status(400).json({ error: 'question_data and user_answer are required' });
		}
		
		const result = gradePOCUSAnswer(question_data, user_answer);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/pocus/grade error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/pocus/categories
 * Get list of available POCUS categories
 */
router.get('/categories', async (req, res) => {
	try {
		const stats = await listPOCUSCases({});
		res.json({
			categories: stats.categories.map(cat => ({
				id: cat,
				name: cat.toUpperCase(),
				description: getCategoryDescription(cat)
			}))
		});
	} catch (error) {
		console.error('❌ /api/pocus/categories error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Helper: Get category descriptions
 */
function getCategoryDescription(category) {
	const descriptions = {
		'FAST': 'Focused Assessment with Sonography for Trauma - detect free fluid',
		'lung': 'Lung ultrasound - pneumothorax, effusion, B-lines, consolidation',
		'cardiac': 'Cardiac POCUS - LV function, pericardial effusion, RV strain',
		'vascular': 'Vascular ultrasound - DVT, AAA, IVC assessment',
		'procedural': 'Procedural guidance - central lines, paracentesis, thoracentesis'
	};
	return descriptions[category] || category;
}

export default router;
