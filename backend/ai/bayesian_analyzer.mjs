// backend/ai/bayesian_analyzer.mjs — Bayesian probability analysis for clinical reasoning
// Calculates likelihood ratios, post-test probabilities, and diagnostic test performance

/**
 * Calculate post-test probability using Bayes' theorem
 * @param {number} priorProbability - Pre-test probability (0-1)
 * @param {number} likelihoodRatio - Likelihood ratio for positive test
 * @returns {number} Post-test probability (0-1)
 */
export function calculatePostTestProbability(priorProbability, likelihoodRatio) {
	// Convert probability to odds
	const priorOdds = priorProbability / (1 - priorProbability);
	
	// Apply likelihood ratio
	const postOdds = priorOdds * likelihoodRatio;
	
	// Convert odds back to probability
	const postProbability = postOdds / (1 + postOdds);
	
	return Math.min(Math.max(postProbability, 0), 1); // Clamp to [0, 1]
}

/**
 * Calculate likelihood ratio from sensitivity and specificity
 * @param {number} sensitivity - Test sensitivity (0-1)
 * @param {number} specificity - Test specificity (0-1)
 * @param {boolean} testPositive - Whether test result is positive
 * @returns {number} Likelihood ratio
 */
export function calculateLikelihoodRatio(sensitivity, specificity, testPositive = true) {
	if (testPositive) {
		// LR+ = sensitivity / (1 - specificity)
		return sensitivity / (1 - specificity);
	} else {
		// LR- = (1 - sensitivity) / specificity
		return (1 - sensitivity) / specificity;
	}
}

/**
 * Analyze multiple test results with sequential Bayesian updating
 * @param {number} initialProbability - Starting pre-test probability
 * @param {Array} testResults - Array of test results with sensitivity/specificity
 * @returns {Object} Sequential probability updates
 */
export function analyzeSequentialTests(initialProbability, testResults) {
	const updates = [];
	let currentProbability = initialProbability;
	
	for (const test of testResults) {
		const { test_name, sensitivity, specificity, result_positive } = test;
		
		// Calculate likelihood ratio
		const lr = calculateLikelihoodRatio(sensitivity, specificity, result_positive);
		
		// Calculate post-test probability
		const postProbability = calculatePostTestProbability(currentProbability, lr);
		
		// Store update
		updates.push({
			test_name,
			prior_probability: currentProbability,
			likelihood_ratio: lr,
			post_probability: postProbability,
			change: postProbability - currentProbability,
			interpretation: interpretChange(postProbability - currentProbability),
		});
		
		// Use this as prior for next test
		currentProbability = postProbability;
	}
	
	return {
		initial_probability: initialProbability,
		final_probability: currentProbability,
		total_change: currentProbability - initialProbability,
		updates,
		confidence_level: classifyConfidence(currentProbability),
	};
}

/**
 * Interpret probability change
 * @param {number} change - Change in probability
 * @returns {string} Interpretation
 */
function interpretChange(change) {
	if (change > 0.3) return 'Significantly more likely';
	if (change > 0.1) return 'Moderately more likely';
	if (change > 0.02) return 'Slightly more likely';
	if (change > -0.02) return 'Essentially unchanged';
	if (change > -0.1) return 'Slightly less likely';
	if (change > -0.3) return 'Moderately less likely';
	return 'Significantly less likely (likely ruled out)';
}

/**
 * Classify confidence level based on probability
 * @param {number} probability - Current probability
 * @returns {string} Confidence classification
 */
function classifyConfidence(probability) {
	if (probability > 0.9) return 'Very High (diagnosis confirmed)';
	if (probability > 0.75) return 'High (likely diagnosis)';
	if (probability > 0.5) return 'Moderate (probable)';
	if (probability > 0.25) return 'Low (possible)';
	if (probability > 0.1) return 'Very Low (unlikely)';
	return 'Negligible (effectively ruled out)';
}

/**
 * Calculate number needed to diagnose (NND)
 * @param {number} sensitivity - Test sensitivity
 * @param {number} specificity - Test specificity
 * @param {number} prevalence - Disease prevalence
 * @returns {Object} NND and related metrics
 */
export function calculateNND(sensitivity, specificity, prevalence) {
	// Positive predictive value
	const ppv = (sensitivity * prevalence) / 
		((sensitivity * prevalence) + ((1 - specificity) * (1 - prevalence)));
	
	// Negative predictive value
	const npv = (specificity * (1 - prevalence)) / 
		((specificity * (1 - prevalence)) + ((1 - sensitivity) * prevalence));
	
	// Number needed to diagnose (1 / PPV for positive test)
	const nnd = ppv > 0 ? 1 / ppv : Infinity;
	
	return {
		positive_predictive_value: ppv,
		negative_predictive_value: npv,
		number_needed_to_diagnose: nnd,
		interpretation: `Need to test ${Math.ceil(nnd)} patients with positive result to find 1 true case`,
	};
}

/**
 * Generate Bayesian reasoning explanation for teaching
 * @param {Object} analysis - Bayesian analysis result
 * @returns {string} Educational explanation
 */
export function generateBayesianExplanation(analysis) {
	const { prior_probability, likelihood_ratio, post_probability } = analysis;
	
	const priorPercent = (prior_probability * 100).toFixed(1);
	const postPercent = (post_probability * 100).toFixed(1);
	const lrFormatted = likelihood_ratio.toFixed(2);
	
	let explanation = `**Bayesian Reasoning:**\n\n`;
	explanation += `1. **Pre-test probability:** ${priorPercent}% (based on clinical presentation)\n`;
	explanation += `2. **Likelihood ratio:** ${lrFormatted} (how much this test result changes the odds)\n`;
	explanation += `3. **Post-test probability:** ${postPercent}% (updated probability after test)\n\n`;
	
	if (likelihood_ratio > 10) {
		explanation += `This is a **very strong positive** test result (LR > 10), substantially increasing disease probability.\n`;
	} else if (likelihood_ratio > 5) {
		explanation += `This is a **strong positive** test result (LR > 5), significantly increasing disease probability.\n`;
	} else if (likelihood_ratio > 2) {
		explanation += `This is a **moderate positive** test result (LR > 2), moderately increasing disease probability.\n`;
	} else if (likelihood_ratio > 1) {
		explanation += `This is a **weak positive** test result (LR > 1), slightly increasing disease probability.\n`;
	} else if (likelihood_ratio < 0.1) {
		explanation += `This is a **very strong negative** test result (LR < 0.1), substantially decreasing disease probability.\n`;
	} else if (likelihood_ratio < 0.2) {
		explanation += `This is a **strong negative** test result (LR < 0.2), significantly decreasing disease probability.\n`;
	} else if (likelihood_ratio < 0.5) {
		explanation += `This is a **moderate negative** test result (LR < 0.5), moderately decreasing disease probability.\n`;
	} else {
		explanation += `This test result has minimal impact on disease probability.\n`;
	}
	
	return explanation;
}

/**
 * Recommend next diagnostic test based on current probability
 * @param {number} currentProbability - Current disease probability
 * @param {Array} availableTests - Available diagnostic tests
 * @returns {Object} Recommended test with reasoning
 */
export function recommendNextTest(currentProbability, availableTests) {
	// If probability is very high (>0.9) or very low (<0.1), no more testing needed
	if (currentProbability > 0.9) {
		return {
			recommendation: 'No further testing needed',
			reasoning: 'Diagnosis is highly likely (>90%). Proceed with treatment.',
			probability_range: 'Very High',
		};
	}
	
	if (currentProbability < 0.1) {
		return {
			recommendation: 'No further testing needed',
			reasoning: 'Diagnosis is highly unlikely (<10%). Consider alternative diagnoses.',
			probability_range: 'Very Low',
		};
	}
	
	// Find test with highest potential to change probability (highest LR+ or lowest LR-)
	let bestTest = null;
	let maxUtility = 0;
	
	for (const test of availableTests) {
		const lrPlus = calculateLikelihoodRatio(test.sensitivity, test.specificity, true);
		const lrMinus = calculateLikelihoodRatio(test.sensitivity, test.specificity, false);
		
		// Utility = how much test could change probability in either direction
		const utilityPlus = Math.abs(calculatePostTestProbability(currentProbability, lrPlus) - currentProbability);
		const utilityMinus = Math.abs(calculatePostTestProbability(currentProbability, lrMinus) - currentProbability);
		const utility = Math.max(utilityPlus, utilityMinus);
		
		if (utility > maxUtility) {
			maxUtility = utility;
			bestTest = {
				...test,
				expected_utility: utility,
				lr_plus: lrPlus,
				lr_minus: lrMinus,
			};
		}
	}
	
	return {
		recommendation: bestTest?.test_name || 'Clinical judgment needed',
		reasoning: `This test has the highest potential to change probability (±${(maxUtility * 100).toFixed(1)}%)`,
		test_details: bestTest,
		probability_range: classifyConfidence(currentProbability),
	};
}
