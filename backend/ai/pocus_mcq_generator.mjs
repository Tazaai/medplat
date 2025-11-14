// backend/ai/pocus_mcq_generator.mjs — Phase 8 M1: POCUS MCQ Generation Service
// Generates educational MCQs from POCUS/ultrasound library cases using AI reasoning

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOpenAIClient } from '../openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pocusLibrary = null;

/**
 * Load POCUS library from JSON file
 */
async function loadPOCUSLibrary() {
	if (pocusLibrary) return pocusLibrary;
	
	try {
		const libraryPath = path.join(__dirname, '../data/pocus_library.json');
		const data = await fs.readFile(libraryPath, 'utf-8');
		pocusLibrary = JSON.parse(data);
		console.log(`✅ Loaded ${pocusLibrary.cases.length} POCUS cases`);
		return pocusLibrary;
	} catch (error) {
		console.error('❌ Failed to load POCUS library:', error);
		throw new Error('POCUS library not available');
	}
}

/**
 * Get POCUS case by ID
 */
export async function getPOCUSCase(caseId) {
	const library = await loadPOCUSLibrary();
	const pocusCase = library.cases.find(c => c.id === caseId);
	
	if (!pocusCase) {
		throw new Error(`POCUS case ${caseId} not found`);
	}
	
	return pocusCase;
}

/**
 * List all POCUS cases with optional filters
 */
export async function listPOCUSCases(filters = {}) {
	const library = await loadPOCUSLibrary();
	let cases = library.cases;
	
	// Filter by category
	if (filters.category) {
		cases = cases.filter(c => c.category === filters.category);
	}
	
	// Filter by difficulty
	if (filters.difficulty) {
		cases = cases.filter(c => c.difficulty === filters.difficulty);
	}
	
	// Limit results
	if (filters.limit) {
		cases = cases.slice(0, parseInt(filters.limit));
	}
	
	return {
		total: cases.length,
		categories: library.metadata.categories,
		difficulty_levels: library.metadata.difficulty_levels,
		cases: cases
	};
}

/**
 * Generate distractors (incorrect answers) for POCUS MCQ
 */
function generateDistractors(correctDiagnosis, allCases, count = 3) {
	// Get diagnoses from similar category cases
	const otherDiagnoses = allCases
		.filter(c => c.diagnosis !== correctDiagnosis)
		.map(c => c.diagnosis);
	
	// Shuffle and take first N
	const shuffled = otherDiagnoses.sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}

/**
 * Generate MCQ from POCUS case using AI
 */
export async function generatePOCUSMCQ(caseId, options = {}) {
	const pocusCase = await getPOCUSCase(caseId);
	const library = await loadPOCUSLibrary();
	
	const {
		num_distractors = 3,
		include_explanation = true,
		difficulty_match = true
	} = options;
	
	// Generate distractors
	let candidateCases = library.cases;
	if (difficulty_match) {
		candidateCases = candidateCases.filter(c => c.difficulty === pocusCase.difficulty);
	}
	
	const distractors = generateDistractors(pocusCase.diagnosis, candidateCases, num_distractors);
	
	// Create answer options (correct + distractors)
	const allOptions = [pocusCase.diagnosis, ...distractors];
	const shuffled = allOptions.sort(() => 0.5 - Math.random());
	
	const correctIndex = shuffled.indexOf(pocusCase.diagnosis);
	
	// Generate AI-enhanced explanation if requested
	let explanation = null;
	if (include_explanation) {
		try {
			const prompt = `You are an emergency medicine and point-of-care ultrasound (POCUS) educator. Explain this ultrasound finding for medical students and residents.

Ultrasound Diagnosis: ${pocusCase.diagnosis}
Category: ${pocusCase.category.toUpperCase()}
Key Features: ${pocusCase.key_features.join(', ')}
Clinical Context: ${pocusCase.clinical_context}
Management: ${pocusCase.management}

Provide a concise 3-4 sentence explanation focusing on:
1. What the ultrasound shows
2. Clinical significance
3. Key management point

Be educational, accurate, and evidence-based.`;

			const openaiClient = getOpenAIClient();
			const completion = await openaiClient.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.7,
				max_tokens: 300
			});
			
			explanation = completion.choices[0].message.content.trim();
		} catch (error) {
			console.error('❌ AI explanation generation failed:', error);
			// Fallback to manual explanation
			explanation = `${pocusCase.diagnosis}: ${pocusCase.clinical_context}`;
		}
	}
	
	return {
		question_id: `pocus_mcq_${caseId}_${Date.now()}`,
		case_id: caseId,
		type: 'pocus_interpretation',
		difficulty: pocusCase.difficulty,
		category: pocusCase.category,
		image_url: pocusCase.image_url,
		video_url: pocusCase.video_url || null,
		question_stem: `Review the following ultrasound image${pocusCase.video_url ? ' or video' : ''}. What is the most likely diagnosis?`,
		options: shuffled.map((opt, idx) => ({
			label: String.fromCharCode(65 + idx), // A, B, C, D
			text: opt
		})),
		correct_answer: String.fromCharCode(65 + correctIndex),
		explanation: explanation,
		key_features: pocusCase.key_features,
		views: pocusCase.views || null,
		differential: pocusCase.differential,
		clinical_context: pocusCase.clinical_context,
		management: pocusCase.management,
		source: pocusCase.source,
		xp_reward: {
			beginner: 15,
			intermediate: 25,
			advanced: 40
		}[pocusCase.difficulty] || 20
	};
}

/**
 * Generate quiz with multiple POCUS MCQs
 */
export async function generatePOCUSQuiz(options = {}) {
	const {
		num_questions = 5,
		category = null,
		difficulty = null,
		include_explanations = false
	} = options;
	
	const library = await loadPOCUSLibrary();
	let candidateCases = library.cases;
	
	// Apply filters
	if (category) {
		candidateCases = candidateCases.filter(c => c.category === category);
	}
	if (difficulty) {
		candidateCases = candidateCases.filter(c => c.difficulty === difficulty);
	}
	
	// Randomly select cases
	const shuffled = candidateCases.sort(() => 0.5 - Math.random());
	const selectedCases = shuffled.slice(0, num_questions);
	
	// Generate MCQs for each case
	const mcqs = await Promise.all(
		selectedCases.map(c => generatePOCUSMCQ(c.id, {
			include_explanation: include_explanations
		}))
	);
	
	return {
		quiz_id: `pocus_quiz_${Date.now()}`,
		type: 'pocus_interpretation',
		total_questions: mcqs.length,
		category: category || 'mixed',
		difficulty: difficulty || 'mixed',
		questions: mcqs,
		total_xp: mcqs.reduce((sum, q) => sum + q.xp_reward, 0)
	};
}

/**
 * Grade POCUS MCQ answer
 */
export function gradePOCUSAnswer(questionData, userAnswer) {
	const isCorrect = userAnswer.toUpperCase() === questionData.correct_answer.toUpperCase();
	
	return {
		correct: isCorrect,
		user_answer: userAnswer,
		correct_answer: questionData.correct_answer,
		xp_earned: isCorrect ? questionData.xp_reward : 0,
		explanation: questionData.explanation,
		key_features: questionData.key_features,
		management: questionData.management
	};
}
