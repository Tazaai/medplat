// backend/ai/reasoning_engine.mjs — Core AI reasoning engine for Phase 7 M1
// Provides advanced clinical reasoning, differential diagnosis, and pattern recognition

import { getOpenAIClient } from '../openaiClient.js';
const openai = getOpenAIClient();

/**
 * Generate expert differential diagnosis with probabilities
 * @param {Object} caseData - Patient case information
 * @param {Array} studentDifferentials - Student's proposed diagnoses
 * @returns {Promise<Object>} Expert differentials with feedback
 */
export async function generateExpertDifferential(caseData, studentDifferentials = []) {
	try {
		const { chief_complaint, history, vitals, physical_exam, labs } = caseData;

		const prompt = `You are a professor of medicine. Generate a ranked differential diagnosis with Bayesian probabilities.

**PATIENT CASE:**
Chief Complaint: ${chief_complaint || 'Not provided'}
History: ${JSON.stringify(history || {}, null, 2)}
Vitals: ${JSON.stringify(vitals || {}, null, 2)}
Physical Exam: ${JSON.stringify(physical_exam || {}, null, 2)}
Labs: ${JSON.stringify(labs || {}, null, 2)}

**STUDENT'S DIFFERENTIALS:**
${studentDifferentials.length > 0 ? studentDifferentials.join(', ') : 'None provided'}

**TASK:**
1. Generate TOP 5 differential diagnoses ranked by probability
2. For each diagnosis provide:
   - Pre-test probability (0-1 scale)
   - Key supporting findings
   - Key contradicting findings
   - Next diagnostic step
   - Red flags if applicable
3. Score student's differentials (0-100)
4. Identify missed critical diagnoses
5. Identify over-weighted unlikely diagnoses
6. Provide educational feedback

**OUTPUT FORMAT (JSON):**
{
  "expert_differentials": [
    {
      "condition": "diagnosis name",
      "probability": 0.75,
      "supporting_findings": ["finding1", "finding2"],
      "contradicting_findings": ["finding1"],
      "next_step": "diagnostic test or action",
      "red_flags": ["red flag 1"] or null,
      "reasoning": "brief clinical reasoning"
    }
  ],
  "student_score": 85,
  "missed_critical": ["STEMI", "PE"],
  "over_weighted": ["Common cold"],
  "feedback": "Detailed educational feedback on reasoning process"
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
		console.error('❌ generateExpertDifferential error:', error);
		return {
			success: false,
			error: error.message,
			expert_differentials: [],
			student_score: 0,
			missed_critical: [],
			over_weighted: [],
			feedback: 'Error generating differential diagnosis. Please try again.',
		};
	}
}

/**
 * Analyze clinical reasoning pattern
 * @param {Object} reasoningData - Student's reasoning process
 * @returns {Promise<Object>} Pattern analysis with recommendations
 */
export async function analyzeReasoningPattern(reasoningData) {
	try {
		const { case_id, steps, final_diagnosis, time_taken } = reasoningData;

		const prompt = `You are an expert in clinical reasoning education. Analyze this student's diagnostic process.

**REASONING PROCESS:**
${JSON.stringify(steps, null, 2)}

**FINAL DIAGNOSIS:** ${final_diagnosis}
**TIME TAKEN:** ${time_taken} seconds

**ANALYZE:**
1. Reasoning pattern used (System 1 vs System 2, Pattern Recognition, Hypothetico-Deductive)
2. Cognitive biases detected (Anchoring, Confirmation, Availability, Premature Closure)
3. Strengths in the approach
4. Areas for improvement
5. Recommended learning resources

**OUTPUT FORMAT (JSON):**
{
  "primary_pattern": "Hypothetico-Deductive" or "Pattern Recognition" or "Mixed",
  "system_type": "System 1 (Fast)" or "System 2 (Slow)" or "Balanced",
  "biases_detected": [
    {
      "bias": "Anchoring Bias",
      "evidence": "explanation",
      "mitigation": "how to avoid"
    }
  ],
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "reasoning_score": 85,
  "recommendations": ["resource1", "resource2"],
  "expert_comment": "Overall assessment"
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
		console.error('❌ analyzeReasoningPattern error:', error);
		return {
			success: false,
			error: error.message,
			primary_pattern: 'Unknown',
			system_type: 'Unknown',
			biases_detected: [],
			strengths: [],
			improvements: [],
			reasoning_score: 0,
			recommendations: [],
			expert_comment: 'Error analyzing reasoning pattern. Please try again.',
		};
	}
}

/**
 * Generate multi-step case with progressive disclosure
 * @param {Object} params - Case generation parameters
 * @returns {Promise<Object>} Multi-step case structure
 */
export async function generateMultiStepCase(params) {
	try {
		const { specialty, difficulty, topic } = params;

		const prompt = `Generate a multi-step clinical case for diagnostic reasoning training.

**REQUIREMENTS:**
- Specialty: ${specialty || 'General Medicine'}
- Difficulty: ${difficulty || 'Intermediate'}
- Topic: ${topic || 'Any'}

**STRUCTURE:**
The case should unfold in 4 steps:
1. Initial Presentation (Chief complaint + brief history)
2. History & Physical (Detailed history, vitals, physical exam)
3. Initial Workup (Basic labs, imaging)
4. Advanced Testing (Specialized tests if needed)

**At each step:**
- Present new information
- Ask student to update differential probabilities
- Require selection of next diagnostic action
- Provide immediate feedback on reasoning

**OUTPUT FORMAT (JSON):**
{
  "case_id": "unique_id",
  "specialty": "specialty",
  "difficulty": "level",
  "steps": [
    {
      "step_number": 1,
      "title": "Initial Presentation",
      "content": "case content",
      "available_information": {
        "chief_complaint": "...",
        "brief_history": "..."
      },
      "question": "What are your top 3 differential diagnoses?",
      "correct_thinking": "Expected reasoning process",
      "next_actions": ["Action 1", "Action 2", "Action 3"]
    }
  ],
  "final_diagnosis": "actual diagnosis",
  "learning_objectives": ["objective1", "objective2"],
  "difficulty_factors": ["factor1", "factor2"]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.7,
			response_format: { type: 'json_object' },
		});

		const result = JSON.parse(response.choices[0].message.content);

		return {
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error('❌ generateMultiStepCase error:', error);
		return {
			success: false,
			error: error.message,
			case_id: null,
			steps: [],
			final_diagnosis: null,
			learning_objectives: [],
			difficulty_factors: [],
		};
	}
}

/**
 * Evaluate clinical decision-making
 * @param {Object} decision - Student's clinical decision
 * @param {Object} context - Case context
 * @returns {Promise<Object>} Decision evaluation
 */
export async function evaluateClinicalDecision(decision, context) {
	try {
		const { action, reasoning, case_state } = decision;

		const prompt = `Evaluate this clinical decision in the context of the case.

**CASE STATE:**
${JSON.stringify(case_state, null, 2)}

**STUDENT'S DECISION:**
Action: ${action}
Reasoning: ${reasoning}

**EVALUATE:**
1. Appropriateness of action (0-100)
2. Quality of reasoning (0-100)
3. Safety considerations
4. Cost-effectiveness
5. Alternative actions (better/safer/cheaper)
6. Educational feedback

**OUTPUT FORMAT (JSON):**
{
  "appropriateness_score": 85,
  "reasoning_score": 90,
  "safety_score": 95,
  "cost_effectiveness": "High" or "Medium" or "Low",
  "is_safe": true,
  "is_appropriate": true,
  "alternatives": [
    {
      "action": "alternative action",
      "advantage": "why this might be better",
      "disadvantage": "potential downside"
    }
  ],
  "expert_comment": "Detailed feedback",
  "learning_points": ["point1", "point2"]
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
		console.error('❌ evaluateClinicalDecision error:', error);
		return {
			success: false,
			error: error.message,
			appropriateness_score: 0,
			reasoning_score: 0,
			safety_score: 0,
			cost_effectiveness: 'Unknown',
			is_safe: false,
			is_appropriate: false,
			alternatives: [],
			expert_comment: 'Error evaluating decision. Please try again.',
			learning_points: [],
		};
	}
}
