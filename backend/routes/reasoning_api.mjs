// backend/routes/reasoning_api.mjs — Phase 7 M1: AI Reasoning Engine API
// Provides endpoints for differential diagnosis, Bayesian analysis, and clinical reasoning

import express from 'express';
import { generateExpertDifferential, analyzeReasoningPattern, generateMultiStepCase, evaluateClinicalDecision } from '../ai/reasoning_engine.mjs';
import { buildDifferential, updateDifferentialBayesian, compareDifferentials } from '../ai/differential_builder.mjs';
import { calculatePostTestProbability, analyzeSequentialTests, recommendNextTest } from '../ai/bayesian_analyzer.mjs';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
	res.json({ status: 'operational', module: 'reasoning', phase: '7-m1' });
});

/**
 * POST /api/reasoning/differential
 * Generate expert differential diagnosis with probabilities
 */
router.post('/differential', async (req, res) => {
	try {
		const { case_data, student_differentials } = req.body;

		if (!case_data) {
			return res.status(400).json({ error: 'case_data is required' });
		}

		const result = await generateExpertDifferential(case_data, student_differentials || []);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/differential error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/build_differential
 * Build differential diagnosis from clinical findings
 */
router.post('/build_differential', async (req, res) => {
	try {
		const { findings } = req.body;

		if (!findings) {
			return res.status(400).json({ error: 'findings are required' });
		}

		const result = await buildDifferential(findings);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/build_differential error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/bayesian_update
 * Update differential probabilities using Bayesian reasoning
 */
router.post('/bayesian_update', async (req, res) => {
	try {
		const { prior_differentials, new_information } = req.body;

		if (!prior_differentials || !new_information) {
			return res.status(400).json({ error: 'prior_differentials and new_information are required' });
		}

		const result = await updateDifferentialBayesian(prior_differentials, new_information);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/bayesian_update error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/compare_differentials
 * Compare student's differential with expert assessment
 */
router.post('/compare_differentials', async (req, res) => {
	try {
		const { student_differentials, expert_differentials } = req.body;

		if (!student_differentials || !expert_differentials) {
			return res.status(400).json({ error: 'student_differentials and expert_differentials are required' });
		}

		const result = await compareDifferentials(student_differentials, expert_differentials);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/compare_differentials error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/analyze_pattern
 * Analyze clinical reasoning pattern and detect cognitive biases
 */
router.post('/analyze_pattern', async (req, res) => {
	try {
		const { reasoning_data } = req.body;

		if (!reasoning_data) {
			return res.status(400).json({ error: 'reasoning_data is required' });
		}

		const result = await analyzeReasoningPattern(reasoning_data);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/analyze_pattern error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/multi_step_case
 * Generate multi-step case with progressive disclosure
 */
router.post('/multi_step_case', async (req, res) => {
	try {
		const { specialty, difficulty, topic } = req.body;

		const result = await generateMultiStepCase({ specialty, difficulty, topic });
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/multi_step_case error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/evaluate_decision
 * Evaluate clinical decision-making
 */
router.post('/evaluate_decision', async (req, res) => {
	try {
		const { decision, context } = req.body;

		if (!decision || !context) {
			return res.status(400).json({ error: 'decision and context are required' });
		}

		const result = await evaluateClinicalDecision(decision, context);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/evaluate_decision error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/bayesian_calculate
 * Calculate post-test probability using Bayes' theorem
 */
router.post('/bayesian_calculate', async (req, res) => {
	try {
		const { prior_probability, sensitivity, specificity, test_positive } = req.body;

		if (prior_probability === undefined || sensitivity === undefined || specificity === undefined) {
			return res.status(400).json({ error: 'prior_probability, sensitivity, and specificity are required' });
		}

		// Calculate likelihood ratio
		const lr = test_positive !== false
			? sensitivity / (1 - specificity)  // LR+
			: (1 - sensitivity) / specificity;   // LR-

		// Calculate post-test probability
		const postProbability = calculatePostTestProbability(prior_probability, lr);

		res.json({
			prior_probability,
			likelihood_ratio: lr,
			post_probability: postProbability,
			change: postProbability - prior_probability,
			interpretation: interpretChange(postProbability - prior_probability),
		});
	} catch (error) {
		console.error('❌ /api/reasoning/bayesian_calculate error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/sequential_tests
 * Analyze multiple test results with sequential Bayesian updating
 */
router.post('/sequential_tests', async (req, res) => {
	try {
		const { initial_probability, test_results } = req.body;

		if (initial_probability === undefined || !test_results) {
			return res.status(400).json({ error: 'initial_probability and test_results are required' });
		}

		const result = analyzeSequentialTests(initial_probability, test_results);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/sequential_tests error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/reasoning/recommend_test
 * Recommend next diagnostic test based on current probability
 */
router.post('/recommend_test', async (req, res) => {
	try {
		const { current_probability, available_tests } = req.body;

		if (current_probability === undefined || !available_tests) {
			return res.status(400).json({ error: 'current_probability and available_tests are required' });
		}

		const result = recommendNextTest(current_probability, available_tests);
		res.json(result);
	} catch (error) {
		console.error('❌ /api/reasoning/recommend_test error:', error);
		res.status(500).json({ error: error.message });
	}
});

// Helper function to interpret probability change
function interpretChange(change) {
	if (change > 0.3) return 'Significantly more likely';
	if (change > 0.1) return 'Moderately more likely';
	if (change > 0.02) return 'Slightly more likely';
	if (change > -0.02) return 'Essentially unchanged';
	if (change > -0.1) return 'Slightly less likely';
	if (change > -0.3) return 'Moderately less likely';
	return 'Significantly less likely (likely ruled out)';
}

export default router;
