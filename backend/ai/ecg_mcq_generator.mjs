// backend/ai/ecg_mcq_generator.mjs — Phase 8 M1: ECG MCQ Generation Service
// Generates educational MCQs from ECG library cases using AI reasoning

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOpenAIClient } from '../openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ecgLibrary = null;

/**
 * Load ECG library from JSON file
 */
async function loadECGLibrary() {
	if (ecgLibrary) return ecgLibrary;
	
	try {
		const libraryPath = path.join(__dirname, '../data/ecg_library.json');
		const data = await fs.readFile(libraryPath, 'utf-8');
		ecgLibrary = JSON.parse(data);
		console.log(`✅ Loaded ${ecgLibrary.cases.length} ECG cases`);
		return ecgLibrary;
	} catch (error) {
		console.error('❌ Failed to load ECG library:', error);
		throw new Error('ECG library not available');
	}
}

/**
 * Get ECG case by ID
 */
export async function getECGCase(caseId) {
	const library = await loadECGLibrary();
	const ecgCase = library.cases.find(c => c.id === caseId);
	
	if (!ecgCase) {
		throw new Error(`ECG case ${caseId} not found`);
	}
	
	return ecgCase;
}

/**
 * List all ECG cases with optional filters
 */
export async function listECGCases(filters = {}) {
	const library = await loadECGLibrary();
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
 * Generate distractors (incorrect answers) for ECG MCQ
 */
function generateDistractors(correctDiagnosis, allCases, count = 3) {
	// Get diagnoses from similar difficulty cases
	const otherDiagnoses = allCases
		.filter(c => c.diagnosis !== correctDiagnosis)
		.map(c => c.diagnosis);
	
	// Shuffle and take first N
	const shuffled = otherDiagnoses.sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}

/**
 * Generate MCQ from ECG case using AI
 */
export async function generateECGMCQ(caseId, options = {}) {
	const ecgCase = await getECGCase(caseId);
	const library = await loadECGLibrary();
	
	const {
		num_distractors = 3,
		include_explanation = true,
		difficulty_match = true
	} = options;
	
	// Generate distractors
	let candidateCases = library.cases;
	if (difficulty_match) {
		candidateCases = candidateCases.filter(c => c.difficulty === ecgCase.difficulty);
		// If not enough cases at same difficulty, fall back to all cases
		if (candidateCases.length <= num_distractors) {
			console.log(`⚠️ Not enough ${ecgCase.difficulty} cases (${candidateCases.length}), using all difficulty levels`);
			candidateCases = library.cases;
		}
	}
	
	const distractors = generateDistractors(ecgCase.diagnosis, candidateCases, num_distractors);
	
	console.log(`DEBUG MCQ: case=${caseId}, correct="${ecgCase.diagnosis}", distractors=${JSON.stringify(distractors)}, count=${distractors.length}`);
	
	// Create answer options (correct + distractors)
	const allOptions = [ecgCase.diagnosis, ...distractors];
	console.log(`DEBUG MCQ: allOptions=${JSON.stringify(allOptions)}, count=${allOptions.length}`);
	const shuffled = allOptions.sort(() => 0.5 - Math.random());
	
	const correctIndex = shuffled.indexOf(ecgCase.diagnosis);
	
	// Generate AI-enhanced explanation if requested
	let explanation = null;
	if (include_explanation) {
		try {
		const prompt = `You are a cardiology educator. Explain this ECG finding for medical students.

ECG: ${ecgCase.title}
Diagnosis: ${ecgCase.diagnosis}
Key Features: ${ecgCase.key_features.join(', ')}
Clinical Context: ${ecgCase.clinical_context}
Management: ${ecgCase.management}

Provide a concise 3-4 sentence explanation focusing on:
1. What the ECG shows
2. Why it matters clinically
3. Key learning point

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
			explanation = `${ecgCase.diagnosis}: ${ecgCase.clinical_context}`;
		}
	}
	
	return {
		question_id: `ecg_mcq_${caseId}_${Date.now()}`,
		case_id: caseId,
		type: 'ecg_interpretation',
		difficulty: ecgCase.difficulty,
		category: ecgCase.category,
		image_url: ecgCase.image_url,
		question_stem: `A patient presents with the following ECG. What is the most likely diagnosis?`,
		options: shuffled.map((opt, idx) => ({
			label: String.fromCharCode(65 + idx), // A, B, C, D
			text: opt
		})),
		correct_answer: String.fromCharCode(65 + correctIndex),
		explanation: explanation,
		key_features: ecgCase.key_features,
		differential: ecgCase.differential,
		clinical_context: ecgCase.clinical_context,
		management: ecgCase.management,
		source: ecgCase.source,
		xp_reward: {
			beginner: 15,
			intermediate: 25,
			advanced: 40,
			expert: 60
		}[ecgCase.difficulty] || 20
	};
}

/**
 * Generate quiz with multiple ECG MCQs
 */
export async function generateECGQuiz(options = {}) {
	const {
		num_questions = 5,
		category = null,
		difficulty = null,
		include_explanations = false
	} = options;
	
	const library = await loadECGLibrary();
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
		selectedCases.map(c => generateECGMCQ(c.id, {
			include_explanation: include_explanations
		}))
	);
	
	return {
		quiz_id: `ecg_quiz_${Date.now()}`,
		type: 'ecg_interpretation',
		total_questions: mcqs.length,
		category: category || 'mixed',
		difficulty: difficulty || 'mixed',
		questions: mcqs,
		total_xp: mcqs.reduce((sum, q) => sum + q.xp_reward, 0)
	};
}

/**
 * Grade ECG MCQ answer
 */
export function gradeECGAnswer(questionData, userAnswer) {
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
