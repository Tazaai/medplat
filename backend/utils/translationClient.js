// backend/utils/translationClient.js - Google Cloud Translation API client

import { v2 } from '@google-cloud/translate';

const { Translate } = v2;
let translateClient = null;

/**
 * Initialize Google Cloud Translation API client
 * Supports 100+ languages for medical education content
 */
export function getTranslationClient() {
	if (!translateClient) {
		try {
			// Use service account from firebase_key.json
			translateClient = new Translate({
				projectId: 'medplat-458911',
				keyFilename: './firebase_key.json',
			});
			console.log('✅ Translation API client initialized');
		} catch (error) {
			console.error('❌ Translation API initialization failed:', error.message);
			throw error;
		}
	}
	return translateClient;
}

/**
 * Get list of supported languages
 * Returns language codes and native names
 */
export async function getSupportedLanguages() {
	const translate = getTranslationClient();
	try {
		const [languages] = await translate.getLanguages();
		return languages;
	} catch (error) {
		console.error('Error fetching supported languages:', error);
		throw error;
	}
}

/**
 * Detect language of text
 * @param {string} text - Text to analyze
 * @returns {Promise<{language: string, confidence: number}>}
 */
export async function detectLanguage(text) {
	const translate = getTranslationClient();
	try {
		const [detection] = await translate.detect(text);
		return {
			language: detection.language,
			confidence: detection.confidence,
		};
	} catch (error) {
		console.error('Language detection error:', error);
		return { language: 'en', confidence: 0 }; // Fallback to English
	}
}

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code (e.g., 'es', 'fr', 'ar')
 * @param {string} sourceLanguage - Source language (optional, auto-detect if not provided)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLanguage, sourceLanguage = null) {
	if (!text || !targetLanguage) {
		throw new Error('Text and target language are required');
	}

	// No translation needed if target is English (our base language)
	if (targetLanguage === 'en') {
		return text;
	}

	const translate = getTranslationClient();
	try {
		const options = {
			to: targetLanguage,
		};

		if (sourceLanguage) {
			options.from = sourceLanguage;
		}

		const [translation] = await translate.translate(text, options);
		return translation;
	} catch (error) {
		console.error(`Translation error (${sourceLanguage || 'auto'} → ${targetLanguage}):`, error);
		// Fallback: return original text if translation fails
		return text;
	}
}

/**
 * Translate multiple texts in batch (more efficient)
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language (optional)
 * @returns {Promise<string[]>} Array of translated texts
 */
export async function translateBatch(texts, targetLanguage, sourceLanguage = null) {
	if (!texts || texts.length === 0) {
		return [];
	}

	if (targetLanguage === 'en') {
		return texts; // No translation needed
	}

	const translate = getTranslationClient();
	try {
		const options = {
			to: targetLanguage,
		};

		if (sourceLanguage) {
			options.from = sourceLanguage;
		}

		const [translations] = await translate.translate(texts, options);
		return Array.isArray(translations) ? translations : [translations];
	} catch (error) {
		console.error(`Batch translation error:`, error);
		// Fallback: return original texts
		return texts;
	}
}

/**
 * Priority languages for MedPlat (30+ languages covering 90% of global medical students)
 */
export const SUPPORTED_LANGUAGES = {
	// European languages
	en: { name: 'English', native: 'English', rtl: false, region: 'Global' },
	es: { name: 'Spanish', native: 'Español', rtl: false, region: 'EU/LATAM' },
	fr: { name: 'French', native: 'Français', rtl: false, region: 'EU/Africa' },
	de: { name: 'German', native: 'Deutsch', rtl: false, region: 'EU' },
	it: { name: 'Italian', native: 'Italiano', rtl: false, region: 'EU' },
	pt: { name: 'Portuguese', native: 'Português', rtl: false, region: 'EU/LATAM' },
	pl: { name: 'Polish', native: 'Polski', rtl: false, region: 'EU' },
	ro: { name: 'Romanian', native: 'Română', rtl: false, region: 'EU' },
	nl: { name: 'Dutch', native: 'Nederlands', rtl: false, region: 'EU' },
	ru: { name: 'Russian', native: 'Русский', rtl: false, region: 'EU/Asia' },
	tr: { name: 'Turkish', native: 'Türkçe', rtl: false, region: 'EU/Asia' },

	// Arabic (RTL)
	ar: { name: 'Arabic', native: 'العربية', rtl: true, region: 'MENA' },
	fa: { name: 'Persian', native: 'فارسی', rtl: true, region: 'Asia' },
	he: { name: 'Hebrew', native: 'עברית', rtl: true, region: 'MENA' },
	ur: { name: 'Urdu', native: 'اردو', rtl: true, region: 'Asia' },

	// Asian languages
	zh: { name: 'Chinese (Simplified)', native: '简体中文', rtl: false, region: 'Asia' },
	'zh-TW': { name: 'Chinese (Traditional)', native: '繁體中文', rtl: false, region: 'Asia' },
	ja: { name: 'Japanese', native: '日本語', rtl: false, region: 'Asia' },
	ko: { name: 'Korean', native: '한국어', rtl: false, region: 'Asia' },
	hi: { name: 'Hindi', native: 'हिन्दी', rtl: false, region: 'Asia' },
	bn: { name: 'Bengali', native: 'বাংলা', rtl: false, region: 'Asia' },
	vi: { name: 'Vietnamese', native: 'Tiếng Việt', rtl: false, region: 'Asia' },
	th: { name: 'Thai', native: 'ไทย', rtl: false, region: 'Asia' },
	id: { name: 'Indonesian', native: 'Bahasa Indonesia', rtl: false, region: 'Asia' },
	ms: { name: 'Malay', native: 'Bahasa Melayu', rtl: false, region: 'Asia' },
	tl: { name: 'Filipino', native: 'Filipino', rtl: false, region: 'Asia' },

	// African languages
	sw: { name: 'Swahili', native: 'Kiswahili', rtl: false, region: 'Africa' },
	am: { name: 'Amharic', native: 'አማርኛ', rtl: false, region: 'Africa' },

	// Other
	el: { name: 'Greek', native: 'Ελληνικά', rtl: false, region: 'EU' },
	cs: { name: 'Czech', native: 'Čeština', rtl: false, region: 'EU' },
	sv: { name: 'Swedish', native: 'Svenska', rtl: false, region: 'EU' },
	no: { name: 'Norwegian', native: 'Norsk', rtl: false, region: 'EU' },
	da: { name: 'Danish', native: 'Dansk', rtl: false, region: 'EU' },
	fi: { name: 'Finnish', native: 'Suomi', rtl: false, region: 'EU' },
};

/**
 * Check if language uses RTL (right-to-left) script
 */
export function isRTL(languageCode) {
	const lang = SUPPORTED_LANGUAGES[languageCode];
	return lang ? lang.rtl : false;
}

/**
 * Get language metadata
 */
export function getLanguageInfo(languageCode) {
	return SUPPORTED_LANGUAGES[languageCode] || SUPPORTED_LANGUAGES.en;
}
