// backend/routes/translation_api.mjs - Translation API endpoints

import express from 'express';
import {
	translateCase,
	translateDifferential,
	getCachedTranslation,
	translateUIStrings,
	getRegionalGuideline,
	getLocalizedUnit,
} from '../ai/translation_service.mjs';
import {
	getSupportedLanguages,
	detectLanguage,
	SUPPORTED_LANGUAGES,
	getLanguageInfo,
	isRTL,
} from '../utils/translationClient.js';

const router = express.Router();

/**
 * GET /api/translation/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
	res.json({
		status: 'operational',
		module: 'translation',
		phase: '7-m2',
		supported_languages: Object.keys(SUPPORTED_LANGUAGES).length,
	});
});

/**
 * GET /api/translation/languages
 * Get list of supported languages with metadata
 */
router.get('/languages', (req, res) => {
	try {
		const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
			code,
			...info,
		}));

		res.json({
			success: true,
			languages,
			total: languages.length,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/translation/language/:code
 * Get metadata for specific language
 */
router.get('/language/:code', (req, res) => {
	try {
		const { code } = req.params;
		const info = getLanguageInfo(code);

		res.json({
			success: true,
			language: {
				code,
				...info,
				is_rtl: isRTL(code),
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/translation/detect
 * Detect language of text
 * Body: { text: string }
 */
router.post('/detect', async (req, res) => {
	try {
		const { text } = req.body;

		if (!text) {
			return res.status(400).json({
				success: false,
				error: 'Text is required',
			});
		}

		const detection = await detectLanguage(text);

		res.json({
			success: true,
			...detection,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/translation/translate
 * Translate text with medical term preservation
 * Body: { text: string, target_language: string, source_language?: string, category?: string }
 */
router.post('/translate', async (req, res) => {
	try {
		const { text, target_language, source_language, category } = req.body;

		if (!text || !target_language) {
			return res.status(400).json({
				success: false,
				error: 'Text and target_language are required',
			});
		}

		// Use cached translation if category provided
		const translation = category
			? await getCachedTranslation(text, target_language, category)
			: await translateText(text, target_language, source_language || 'en');

		res.json({
			success: true,
			original: text,
			translation,
			source_language: source_language || 'en',
			target_language,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/translation/translate_case
 * Translate entire case with medical term preservation
 * Body: { case_data: Object, target_language: string }
 */
router.post('/translate_case', async (req, res) => {
	try {
		const { case_data, target_language } = req.body;

		if (!case_data || !target_language) {
			return res.status(400).json({
				success: false,
				error: 'case_data and target_language are required',
			});
		}

		const translatedCase = await translateCase(case_data, target_language);

		res.json({
			success: true,
			case: translatedCase,
			language: target_language,
		});
	} catch (error) {
		console.error('Case translation error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/translation/translate_differential
 * Translate differential diagnosis
 * Body: { differential: Object, target_language: string }
 */
router.post('/translate_differential', async (req, res) => {
	try {
		const { differential, target_language } = req.body;

		if (!differential || !target_language) {
			return res.status(400).json({
				success: false,
				error: 'differential and target_language are required',
			});
		}

		const translated = await translateDifferential(differential, target_language);

		res.json({
			success: true,
			differential: translated,
			language: target_language,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/translation/translate_ui
 * Translate UI strings
 * Body: { ui_strings: Object, target_language: string }
 */
router.post('/translate_ui', async (req, res) => {
	try {
		const { ui_strings, target_language } = req.body;

		if (!ui_strings || !target_language) {
			return res.status(400).json({
				success: false,
				error: 'ui_strings and target_language are required',
			});
		}

		const translated = await translateUIStrings(ui_strings, target_language);

		res.json({
			success: true,
			ui_strings: translated,
			language: target_language,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/translation/guideline/:name/:language
 * Get regional guideline mapping
 */
router.get('/guideline/:name/:language', (req, res) => {
	try {
		const { name, language } = req.params;
		const regionalGuideline = getRegionalGuideline(name, language);

		res.json({
			success: true,
			original: name,
			regional: regionalGuideline,
			language,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/translation/unit/:measurement/:language
 * Get localized unit preference
 */
router.get('/unit/:measurement/:language', (req, res) => {
	try {
		const { measurement, language } = req.params;
		const unit = getLocalizedUnit(measurement, language);

		res.json({
			success: true,
			measurement,
			unit,
			language,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

export default router;
