// backend/utils/clinical_scoring.mjs — Clinical pattern recognition and scoring utilities
// Provides risk scores, clinical decision rules, and pattern matching

/**
 * Calculate CHA2DS2-VASc score for AF stroke risk
 * @param {Object} patient - Patient data
 * @returns {Object} Score and interpretation
 */
export function calculateCHA2DS2VASc(patient) {
	let score = 0;
	const { age, sex, chf, hypertension, stroke_tia, vascular_disease, diabetes } = patient;

	// Age scoring
	if (age >= 75) score += 2;
	else if (age >= 65) score += 1;

	// Female sex
	if (sex === 'female') score += 1;

	// Clinical factors (each worth 1 point)
	if (chf) score += 1;
	if (hypertension) score += 1;
	if (diabetes) score += 1;
	if (vascular_disease) score += 1;

	// Stroke/TIA history (worth 2 points)
	if (stroke_tia) score += 2;

	// Interpretation
	let risk_level, annual_stroke_risk, recommendation;
	if (score === 0) {
		risk_level = 'Low';
		annual_stroke_risk = 0.2;
		recommendation = 'No antithrombotic therapy or aspirin';
	} else if (score === 1) {
		risk_level = 'Low-Moderate';
		annual_stroke_risk = 0.6;
		recommendation = 'Consider oral anticoagulation (OAC) or aspirin';
	} else {
		risk_level = 'Moderate-High';
		annual_stroke_risk = score >= 6 ? 9.6 : 2.2 + (score - 2) * 1.5;
		recommendation = 'Oral anticoagulation recommended (DOAC or warfarin)';
	}

	return {
		score,
		risk_level,
		annual_stroke_risk: `${annual_stroke_risk.toFixed(1)}%`,
		recommendation,
		components: {
			age: age >= 75 ? 2 : age >= 65 ? 1 : 0,
			sex: sex === 'female' ? 1 : 0,
			chf: chf ? 1 : 0,
			hypertension: hypertension ? 1 : 0,
			stroke_tia: stroke_tia ? 2 : 0,
			vascular_disease: vascular_disease ? 1 : 0,
			diabetes: diabetes ? 1 : 0,
		},
	};
}

/**
 * Calculate CURB-65 score for pneumonia severity
 * @param {Object} patient - Patient data
 * @returns {Object} Score and interpretation
 */
export function calculateCURB65(patient) {
	let score = 0;
	const { confusion, urea, respiratory_rate, sbp, dbp, age } = patient;

	if (confusion) score += 1;
	if (urea > 7) score += 1; // mmol/L (>19 mg/dL)
	if (respiratory_rate >= 30) score += 1;
	if (sbp < 90 || dbp <= 60) score += 1;
	if (age >= 65) score += 1;

	let risk_level, mortality, recommendation;
	if (score <= 1) {
		risk_level = 'Low';
		mortality = '<3%';
		recommendation = 'Outpatient treatment suitable';
	} else if (score === 2) {
		risk_level = 'Moderate';
		mortality = '9%';
		recommendation = 'Consider short hospital stay or close outpatient monitoring';
	} else {
		risk_level = 'High';
		mortality = score >= 4 ? '40%' : '15-40%';
		recommendation = 'Hospital admission required, consider ICU if score ≥4';
	}

	return {
		score,
		risk_level,
		mortality,
		recommendation,
		components: {
			confusion: confusion ? 1 : 0,
			urea: urea > 7 ? 1 : 0,
			respiratory_rate: respiratory_rate >= 30 ? 1 : 0,
			blood_pressure: (sbp < 90 || dbp <= 60) ? 1 : 0,
			age: age >= 65 ? 1 : 0,
		},
	};
}

/**
 * Calculate HEART score for chest pain risk stratification
 * @param {Object} patient - Patient data
 * @returns {Object} Score and interpretation
 */
export function calculateHEART(patient) {
	let score = 0;
	const { history, ecg, age, risk_factors, troponin } = patient;

	// History (0-2)
	if (history === 'highly_suspicious') score += 2;
	else if (history === 'moderately_suspicious') score += 1;

	// ECG (0-2)
	if (ecg === 'significant_st_depression') score += 2;
	else if (ecg === 'nonspecific_repolarization') score += 1;

	// Age (0-2)
	if (age >= 65) score += 2;
	else if (age >= 45) score += 1;

	// Risk factors (0-2): ≥3 risk factors = 2, 1-2 = 1, 0 = 0
	const numRiskFactors = risk_factors?.length || 0;
	if (numRiskFactors >= 3) score += 2;
	else if (numRiskFactors >= 1) score += 1;

	// Troponin (0-2)
	if (troponin === 'high' || troponin >= 3) score += 2;
	else if (troponin === 'moderate' || (troponin >= 1 && troponin < 3)) score += 1;

	let risk_level, mace_risk, recommendation;
	if (score <= 3) {
		risk_level = 'Low';
		mace_risk = '1.7%';
		recommendation = 'Early discharge with outpatient follow-up';
	} else if (score <= 6) {
		risk_level = 'Moderate';
		mace_risk = '20%';
		recommendation = 'Admit for observation and further testing';
	} else {
		risk_level = 'High';
		mace_risk = '50-65%';
		recommendation = 'Urgent intervention (cath lab), admit to CCU';
	}

	return {
		score,
		risk_level,
		mace_risk,
		recommendation,
		components: {
			history: history === 'highly_suspicious' ? 2 : history === 'moderately_suspicious' ? 1 : 0,
			ecg: ecg === 'significant_st_depression' ? 2 : ecg === 'nonspecific_repolarization' ? 1 : 0,
			age: age >= 65 ? 2 : age >= 45 ? 1 : 0,
			risk_factors: numRiskFactors >= 3 ? 2 : numRiskFactors >= 1 ? 1 : 0,
			troponin: troponin === 'high' || troponin >= 3 ? 2 : troponin === 'moderate' || (troponin >= 1 && troponin < 3) ? 1 : 0,
		},
	};
}

/**
 * Calculate Wells score for DVT probability
 * @param {Object} patient - Patient data
 * @returns {Object} Score and interpretation
 */
export function calculateWellsDVT(patient) {
	let score = 0;
	const {
		active_cancer,
		paralysis_paresis,
		recently_bedridden,
		localized_tenderness,
		entire_leg_swollen,
		calf_swelling,
		pitting_edema,
		collateral_veins,
		alternative_diagnosis,
	} = patient;

	if (active_cancer) score += 1;
	if (paralysis_paresis) score += 1;
	if (recently_bedridden) score += 1;
	if (localized_tenderness) score += 1;
	if (entire_leg_swollen) score += 1;
	if (calf_swelling) score += 1;
	if (pitting_edema) score += 1;
	if (collateral_veins) score += 1;
	if (alternative_diagnosis) score -= 2;

	let probability, recommendation;
	if (score <= 0) {
		probability = 'Low (5%)';
		recommendation = 'D-dimer test; if negative, DVT unlikely';
	} else if (score <= 2) {
		probability = 'Moderate (17%)';
		recommendation = 'D-dimer test; if positive, proceed to compression ultrasound';
	} else {
		probability = 'High (53%)';
		recommendation = 'Proceed directly to compression ultrasound';
	}

	return {
		score,
		probability,
		recommendation,
	};
}

/**
 * Detect clinical patterns from case findings
 * @param {Object} findings - Clinical findings
 * @returns {Array} Recognized patterns
 */
export function detectClinicalPatterns(findings) {
	const patterns = [];

	// Pattern: Acute coronary syndrome
	if (findings.chest_pain && (findings.troponin_elevated || findings.st_elevation)) {
		patterns.push({
			pattern: 'Acute Coronary Syndrome',
			confidence: 0.85,
			key_findings: ['chest_pain', findings.troponin_elevated ? 'troponin_elevated' : 'st_elevation'],
			urgency: 'CRITICAL',
		});
	}

	// Pattern: Sepsis
	if (findings.fever && findings.tachycardia && findings.hypotension) {
		patterns.push({
			pattern: 'Sepsis / Septic Shock',
			confidence: 0.80,
			key_findings: ['fever', 'tachycardia', 'hypotension'],
			urgency: 'CRITICAL',
		});
	}

	// Pattern: Diabetic ketoacidosis
	if (findings.hyperglycemia && findings.metabolic_acidosis && findings.ketones) {
		patterns.push({
			pattern: 'Diabetic Ketoacidosis',
			confidence: 0.90,
			key_findings: ['hyperglycemia', 'metabolic_acidosis', 'ketones'],
			urgency: 'HIGH',
		});
	}

	// Pattern: Pulmonary embolism
	if (findings.dyspnea && findings.chest_pain && findings.hypoxemia) {
		patterns.push({
			pattern: 'Pulmonary Embolism',
			confidence: 0.70,
			key_findings: ['dyspnea', 'chest_pain', 'hypoxemia'],
			urgency: 'HIGH',
		});
	}

	// Pattern: Stroke
	if (findings.focal_neurological_deficit && findings.acute_onset) {
		patterns.push({
			pattern: 'Acute Stroke',
			confidence: 0.85,
			key_findings: ['focal_neurological_deficit', 'acute_onset'],
			urgency: 'CRITICAL',
		});
	}

	return patterns;
}

/**
 * Get recommended clinical decision rule for case
 * @param {string} presentation - Clinical presentation
 * @returns {Object} Recommended scoring tool
 */
export function recommendScoringTool(presentation) {
	const tools = {
		'chest_pain': {
			tool: 'HEART Score',
			purpose: 'Risk stratification for acute coronary syndrome',
			calculator: calculateHEART,
		},
		'atrial_fibrillation': {
			tool: 'CHA2DS2-VASc',
			purpose: 'Stroke risk assessment in AF',
			calculator: calculateCHA2DS2VASc,
		},
		'pneumonia': {
			tool: 'CURB-65',
			purpose: 'Pneumonia severity and admission decision',
			calculator: calculateCURB65,
		},
		'dvt': {
			tool: 'Wells Score',
			purpose: 'DVT probability assessment',
			calculator: calculateWellsDVT,
		},
	};

	return tools[presentation] || {
		tool: 'Clinical Judgment',
		purpose: 'No specific scoring tool available',
		calculator: null,
	};
}
