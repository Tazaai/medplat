// backend/ai/differential_builder.mjs — Differential diagnosis builder with ranking
// Supports Bayesian updating and probability calculations

import { openai } from '../openaiClient.js';

/**
 * Build differential diagnosis from clinical findings
 * @param {Object} findings - Clinical findings
 * @returns {Promise<Object>} Ranked differentials
 */
export async function buildDifferential(findings) {
	try {
		const prompt = `You are a clinical reasoning expert. Build a comprehensive differential diagnosis.

**CLINICAL FINDINGS:**
${JSON.stringify(findings, null, 2)}

**TASK:**
1. Generate TOP 10 differential diagnoses
2. Rank by pre-test probability (highest to lowest)
3. For each diagnosis provide:
   - Probability (0-1 scale)
   - Typical presentation
   - Key distinguishing features
   - Must-rule-out reasoning (if critical)
   - Initial diagnostic approach

**CATEGORIES:**
- Life-threatening (must not miss)
- Common (frequent causes)
- Zebras (rare but possible)

**OUTPUT FORMAT (JSON):**
{
  "differentials": [
    {
      "rank": 1,
      "diagnosis": "diagnosis name",
      "probability": 0.45,
      "category": "Life-threatening" or "Common" or "Zebra",
      "typical_presentation": "description",
      "distinguishing_features": ["feature1", "feature2"],
      "must_rule_out": true or false,
      "reasoning": "why this diagnosis",
      "initial_tests": ["test1", "test2"]
    }
  ],
  "total_probability": 0.95,
  "key_branch_points": ["decision point 1", "decision point 2"],
  "red_flags_present": ["red flag 1"] or [],
  "summary": "Overall diagnostic approach"
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
			response_format: { type: 'json_object' },
		});

		const result = JSON.parse(response.choices[0].message.content);

		return {
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error('❌ buildDifferential error:', error);
		return {
			success: false,
			error: error.message,
			differentials: [],
			total_probability: 0,
			key_branch_points: [],
			red_flags_present: [],
			summary: 'Error building differential. Please try again.',
		};
	}
}

/**
 * Update differential probabilities based on new information (Bayesian reasoning)
 * @param {Array} priorDifferentials - Previous differential list with probabilities
 * @param {Object} newInformation - New test result or clinical finding
 * @returns {Promise<Object>} Updated differentials with explanations
 */
export async function updateDifferentialBayesian(priorDifferentials, newInformation) {
	try {
		const prompt = `You are a clinical reasoning expert. Update differential probabilities using Bayesian reasoning.

**PRIOR DIFFERENTIALS:**
${JSON.stringify(priorDifferentials, null, 2)}

**NEW INFORMATION:**
${JSON.stringify(newInformation, null, 2)}

**TASK:**
1. Apply Bayesian updating to each diagnosis
2. Calculate post-test probabilities
3. Explain likelihood ratios
4. Show how probabilities changed
5. Identify diagnoses to add or remove

**BAYESIAN REASONING:**
- For each diagnosis, calculate:
  * Prior probability (from previous assessment)
  * Likelihood ratio (how much new information supports/opposes)
  * Post-test probability (updated probability)
- Explain the reasoning for each update

**OUTPUT FORMAT (JSON):**
{
  "updated_differentials": [
    {
      "diagnosis": "diagnosis name",
      "prior_probability": 0.45,
      "likelihood_ratio": 3.5,
      "post_probability": 0.72,
      "change": "+0.27",
      "interpretation": "Significantly more likely" or "Slightly more likely" or "Unchanged" or "Less likely" or "Ruled out",
      "reasoning": "explanation of Bayesian update"
    }
  ],
  "diagnoses_added": [
    {
      "diagnosis": "new diagnosis",
      "probability": 0.15,
      "reasoning": "why now considered"
    }
  ],
  "diagnoses_removed": ["diagnosis1"],
  "new_top_diagnosis": "most likely diagnosis",
  "confidence_level": "High" or "Medium" or "Low",
  "next_best_test": "recommended next diagnostic step",
  "teaching_point": "Educational note on Bayesian reasoning"
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
			response_format: { type: 'json_object' },
		});

		const result = JSON.parse(response.choices[0].message.content);

		return {
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error('❌ updateDifferentialBayesian error:', error);
		return {
			success: false,
			error: error.message,
			updated_differentials: [],
			diagnoses_added: [],
			diagnoses_removed: [],
			new_top_diagnosis: null,
			confidence_level: 'Low',
			next_best_test: null,
			teaching_point: 'Error updating differential. Please try again.',
		};
	}
}

/**
 * Compare student's differential with expert differential
 * @param {Array} studentDifferentials - Student's diagnosis list
 * @param {Array} expertDifferentials - Expert's diagnosis list
 * @returns {Promise<Object>} Comparison analysis
 */
export async function compareDifferentials(studentDifferentials, expertDifferentials) {
	try {
		const prompt = `Compare student's differential diagnosis with expert assessment.

**STUDENT'S DIFFERENTIALS:**
${JSON.stringify(studentDifferentials, null, 2)}

**EXPERT'S DIFFERENTIALS:**
${JSON.stringify(expertDifferentials, null, 2)}

**ANALYZE:**
1. Overlap between lists (what student got right)
2. Critical misses (life-threatening diagnoses missed)
3. Inappropriate inclusions (unlikely diagnoses included)
4. Ranking accuracy (are probabilities reasonable)
5. Educational gaps (what areas need improvement)

**OUTPUT FORMAT (JSON):**
{
  "overlap_score": 75,
  "ranking_accuracy": 80,
  "matches": [
    {
      "diagnosis": "diagnosis name",
      "student_rank": 2,
      "expert_rank": 1,
      "comment": "Good recognition, slightly underestimated probability"
    }
  ],
  "critical_misses": [
    {
      "diagnosis": "life-threatening diagnosis",
      "expert_probability": 0.35,
      "why_critical": "explanation",
      "teaching_point": "what to learn"
    }
  ],
  "inappropriate_inclusions": [
    {
      "diagnosis": "unlikely diagnosis",
      "student_probability": 0.25,
      "expert_probability": 0.01,
      "why_unlikely": "explanation"
    }
  ],
  "overall_score": 85,
  "performance_level": "Excellent" or "Good" or "Fair" or "Needs Improvement",
  "strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1", "area2"],
  "recommended_study": ["topic1", "topic2"],
  "feedback": "Detailed educational feedback"
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
			response_format: { type: 'json_object' },
		});

		const result = JSON.parse(response.choices[0].message.content);

		return {
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error('❌ compareDifferentials error:', error);
		return {
			success: false,
			error: error.message,
			overlap_score: 0,
			ranking_accuracy: 0,
			matches: [],
			critical_misses: [],
			inappropriate_inclusions: [],
			overall_score: 0,
			performance_level: 'Error',
			strengths: [],
			areas_for_improvement: [],
			recommended_study: [],
			feedback: 'Error comparing differentials. Please try again.',
		};
	}
}
