// backend/ai/translation_service.mjs - Medical translation service with term preservation

import { translateText, translateBatch, getLanguageInfo } from '../utils/translationClient.js';
import { db } from '../firebaseClient.js';

/**
 * Medical terms that should NOT be translated (preserve in English)
 * These are universal medical terminology that maintains clarity across languages
 */
const MEDICAL_TERMS_PRESERVE = [
	// Scores and classifications
	'CHA2DS2-VASc', 'CURB-65', 'HEART score', 'Wells score', 'Glasgow Coma Scale', 'GCS',
	'APACHE', 'SOFA', 'qSOFA', 'CHADS2', 'HAS-BLED', 'TIMI', 'GRACE',
	
	// Drug names (generic names are universal)
	'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin', 'Warfarin', 'Heparin',
	'Insulin', 'Digoxin', 'Amiodarone', 'Levothyroxine', 'Omeprazole',
	
	// Abbreviations
	'ECG', 'EKG', 'MRI', 'CT', 'PET', 'X-ray', 'CBC', 'BMP', 'CMP', 'LFT',
	'ABG', 'VBG', 'PTT', 'PT', 'INR', 'TSH', 'T3', 'T4', 'HbA1c',
	'BP', 'HR', 'RR', 'SpO2', 'BMI', 'BSA',
	
	// Conditions (ICD codes universally use English)
	'STEMI', 'NSTEMI', 'MI', 'PE', 'DVT', 'AF', 'CHF', 'COPD', 'DKA', 'HHS',
	'ARDS', 'SIRS', 'DIC', 'ACS', 'TIA', 'CVA', 'IBS', 'IBD', 'GERD',
	
	// Anatomy (Latin terms)
	'Aorta', 'Atrium', 'Ventricle', 'Myocardium', 'Pericardium', 'Endocardium',
	
	// Units (universal)
	'mg', 'g', 'kg', 'mL', 'L', 'mmHg', 'mmol/L', 'mg/dL', 'IU', 'mcg',
];

/**
 * Protect medical terms before translation by replacing with placeholders
 * @param {string} text - Original text
 * @returns {{text: string, terms: Map<string, string>}} Protected text and term mapping
 */
function protectMedicalTerms(text) {
	const terms = new Map();
	let protectedText = text;
	let placeholderIndex = 0;

	// Sort by length (longest first) to avoid partial replacements
	const sortedTerms = [...MEDICAL_TERMS_PRESERVE].sort((a, b) => b.length - a.length);

	for (const term of sortedTerms) {
		// Case-insensitive replacement
		const regex = new RegExp(`\\b${term}\\b`, 'gi');
		const matches = text.match(regex);

		if (matches) {
			for (const match of matches) {
				const placeholder = `__MEDTERM${placeholderIndex}__`;
				terms.set(placeholder, match);
				protectedText = protectedText.replace(match, placeholder);
				placeholderIndex++;
			}
		}
	}

	return { text: protectedText, terms };
}

/**
 * Restore medical terms after translation
 * @param {string} translatedText - Translated text with placeholders
 * @param {Map<string, string>} terms - Term mapping
 * @returns {string} Text with medical terms restored
 */
function restoreMedicalTerms(translatedText, terms) {
	let restoredText = translatedText;

	for (const [placeholder, originalTerm] of terms.entries()) {
		restoredText = restoredText.replace(placeholder, originalTerm);
	}

	return restoredText;
}

/**
 * Translate case content with medical term preservation
 * @param {Object} caseData - Case data to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Translated case data
 */
export async function translateCase(caseData, targetLanguage) {
	if (!caseData || targetLanguage === 'en') {
		return caseData;
	}

	try {
		// Fields to translate
		const fieldsToTranslate = [
			'chief_complaint',
			'presentation',
			'history',
			'physical_exam',
			'question',
			'explanation',
		];

		const translatedCase = { ...caseData };

		for (const field of fieldsToTranslate) {
			if (caseData[field]) {
				const { text: protectedText, terms } = protectMedicalTerms(caseData[field]);
				const translated = await translateText(protectedText, targetLanguage, 'en');
				translatedCase[field] = restoreMedicalTerms(translated, terms);
			}
		}

		// Translate answer options (if present)
		if (caseData.options && Array.isArray(caseData.options)) {
			translatedCase.options = await Promise.all(
				caseData.options.map(async (option) => {
					const { text: protectedText, terms } = protectMedicalTerms(option);
					const translated = await translateText(protectedText, targetLanguage, 'en');
					return restoreMedicalTerms(translated, terms);
				})
			);
		}

		// Add language metadata
		translatedCase.language = targetLanguage;
		translatedCase.original_language = 'en';

		return translatedCase;
	} catch (error) {
		console.error(`Translation error for case:`, error);
		return caseData; // Fallback to original
	}
}

/**
 * Translate differential diagnosis
 * @param {Object} differential - Differential diagnosis object
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Translated differential
 */
export async function translateDifferential(differential, targetLanguage) {
	if (!differential || targetLanguage === 'en') {
		return differential;
	}

	try {
		const translated = { ...differential };

		// Translate supporting evidence
		if (differential.supporting_evidence && Array.isArray(differential.supporting_evidence)) {
			translated.supporting_evidence = await translateBatch(
				differential.supporting_evidence,
				targetLanguage,
				'en'
			);
		}

		// Translate recommended tests
		if (differential.recommended_tests && Array.isArray(differential.recommended_tests)) {
			translated.recommended_tests = await translateBatch(
				differential.recommended_tests,
				targetLanguage,
				'en'
			);
		}

		// Translate rationale (protect medical terms)
		if (differential.rationale) {
			const { text: protectedText, terms } = protectMedicalTerms(differential.rationale);
			const translatedRationale = await translateText(protectedText, targetLanguage, 'en');
			translated.rationale = restoreMedicalTerms(translatedRationale, terms);
		}

		return translated;
	} catch (error) {
		console.error('Differential translation error:', error);
		return differential;
	}
}

/**
 * Get translation from cache or translate and cache
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} category - Cache category (e.g., 'case', 'ui', 'guideline')
 * @returns {Promise<string>} Translated text
 */
export async function getCachedTranslation(text, targetLanguage, category = 'general') {
	if (targetLanguage === 'en') {
		return text;
	}

	const cacheKey = `${category}_${Buffer.from(text).toString('base64').substring(0, 50)}_${targetLanguage}`;

	try {
		// Check cache
		const cacheRef = db.collection('translation_cache').doc(cacheKey);
		const cacheDoc = await cacheRef.get();

		if (cacheDoc.exists) {
			const cachedData = cacheDoc.data();
			
			// Check if cache is still valid (30 days TTL)
			const now = Date.now();
			const cacheAge = now - cachedData.timestamp;
			const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

			if (cacheAge < TTL) {
				console.log(`✅ Translation cache hit: ${category} (${targetLanguage})`);
				return cachedData.translation;
			}
		}

		// Cache miss or expired - translate and cache
		console.log(`⚠️ Translation cache miss: ${category} (${targetLanguage})`);
		const { text: protectedText, terms } = protectMedicalTerms(text);
		const translated = await translateText(protectedText, targetLanguage, 'en');
		const finalTranslation = restoreMedicalTerms(translated, terms);

		// Save to cache
		await cacheRef.set({
			original: text,
			translation: finalTranslation,
			language: targetLanguage,
			category,
			timestamp: Date.now(),
		});

		return finalTranslation;
	} catch (error) {
		console.error('Cache translation error:', error);
		// Fallback to direct translation
		const { text: protectedText, terms } = protectMedicalTerms(text);
		const translated = await translateText(protectedText, targetLanguage, 'en');
		return restoreMedicalTerms(translated, terms);
	}
}

/**
 * Translate UI strings (common interface text)
 * @param {Object} uiStrings - Key-value pairs of UI text
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Translated UI strings
 */
export async function translateUIStrings(uiStrings, targetLanguage) {
	if (!uiStrings || targetLanguage === 'en') {
		return uiStrings;
	}

	try {
		const translated = {};
		const keys = Object.keys(uiStrings);
		const values = Object.values(uiStrings);

		// Batch translate all values
		const translatedValues = await translateBatch(values, targetLanguage, 'en');

		// Reconstruct object
		keys.forEach((key, index) => {
			translated[key] = translatedValues[index];
		});

		return translated;
	} catch (error) {
		console.error('UI translation error:', error);
		return uiStrings;
	}
}

/**
 * Get regional guideline mapping
 * Maps international guidelines to regional equivalents
 */
export function getRegionalGuideline(guidelineName, targetLanguage) {
	const languageInfo = getLanguageInfo(targetLanguage);
	const region = languageInfo.region;

	// Guideline mapping by region
	const guidelineMap = {
		// Cardiology
		'ESC_AF': {
			Global: 'ESC 2024 AF Guidelines',
			'EU': 'ESC 2024 AF Guidelines',
			'Americas': 'AHA/ACC 2024 AF Guidelines',
			'Asia': 'JCS/CSC AF Guidelines',
			'MENA': 'ESC 2024 AF Guidelines (adapted)',
		},
		'ESC_HF': {
			Global: 'ESC 2023 Heart Failure',
			'EU': 'ESC 2023 Heart Failure',
			'Americas': 'AHA/ACC 2022 Heart Failure',
			'Asia': 'JCS/APHRS Heart Failure',
		},
		// Add more mappings as needed
	};

	return guidelineMap[guidelineName]?.[region] || guidelineMap[guidelineName]?.Global || guidelineName;
}

/**
 * Get localized units (e.g., mg/dL vs mmol/L for glucose)
 * @param {string} measurement - Measurement type
 * @param {string} targetLanguage - Target language code
 * @returns {string} Preferred unit
 */
export function getLocalizedUnit(measurement, targetLanguage) {
	const languageInfo = getLanguageInfo(targetLanguage);
	const region = languageInfo.region;

	const unitPreferences = {
		glucose: {
			'Americas': 'mg/dL',
			default: 'mmol/L', // International standard
		},
		cholesterol: {
			'Americas': 'mg/dL',
			default: 'mmol/L',
		},
		temperature: {
			'Americas': '°F',
			default: '°C',
		},
	};

	return unitPreferences[measurement]?.[region] || unitPreferences[measurement]?.default || '';
}
