/**
 * voice_api.mjs
 * Phase 7 M3: Voice Interaction REST API
 * 
 * Endpoints:
 * - POST /api/voice/transcribe - Convert audio to text
 * - POST /api/voice/synthesize - Convert text to speech
 * - POST /api/voice/command - Parse voice command
 * - POST /api/voice/read-case - Generate case audio narration
 * - GET /api/voice/languages - List supported voice languages
 * - GET /api/voice/health - Health check
 */

import express from 'express';
import multer from 'multer';
import {
	transcribeAudio,
	parseVoiceCommand,
	synthesizeSpeech,
	readCase,
	getSupportedVoiceLanguages
} from '../ai/voice_service.mjs';

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB max
	},
	fileFilter: (req, file, cb) => {
		// Accept audio files only
		const allowedMimes = [
			'audio/wav',
			'audio/wave',
			'audio/x-wav',
			'audio/mpeg',
			'audio/mp3',
			'audio/flac',
			'audio/webm',
			'audio/ogg'
		];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error(`Unsupported audio format: ${file.mimetype}`));
		}
	}
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio file to text
 * 
 * Body (multipart/form-data):
 * - audio: Audio file (WAV, MP3, FLAC, WebM)
 * - language: BCP-47 language code (optional, default: en-US)
 * - encoding: Audio encoding (optional, default: LINEAR16)
 * - sampleRate: Sample rate in Hz (optional, default: 16000)
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				error: 'No audio file provided'
			});
		}

		const languageCode = req.body.language || 'en-US';
		const encoding = req.body.encoding || 'LINEAR16';
		const sampleRate = parseInt(req.body.sampleRate) || 16000;

		console.log('[voice_api] Transcribing audio:', {
			size: req.file.size,
			mimetype: req.file.mimetype,
			language: languageCode
		});

		const result = await transcribeAudio(req.file.buffer, languageCode, {
			encoding: encoding,
			sampleRate: sampleRate
		});

		if (!result.success) {
			return res.status(400).json(result);
		}

		// Parse for voice commands
		const command = parseVoiceCommand(result.transcript);

		res.json({
			success: true,
			transcript: result.transcript,
			confidence: result.confidence,
			language: result.language,
			wordTimings: result.wordTimings,
			command: command,
			segments: result.segments
		});
	} catch (error) {
		console.error('[voice_api] Transcribe error:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

/**
 * POST /api/voice/synthesize
 * Convert text to speech
 * 
 * Body (JSON):
 * {
 *   "text": "Medical text to synthesize",
 *   "language": "en-US",
 *   "gender": "FEMALE",
 *   "speakingRate": 1.0,
 *   "pitch": 0.0
 * }
 */
router.post('/synthesize', async (req, res) => {
	try {
		const { text, language, gender, speakingRate, pitch } = req.body;

		if (!text) {
			return res.status(400).json({
				success: false,
				error: 'No text provided'
			});
		}

		console.log('[voice_api] Synthesizing speech:', {
			textLength: text.length,
			language: language || 'en-US'
		});

		const result = await synthesizeSpeech(text, language || 'en-US', {
			gender: gender,
			speakingRate: speakingRate,
			pitch: pitch,
			encoding: 'MP3'
		});

		if (!result.success) {
			return res.status(400).json(result);
		}

		// Send audio as base64 for web playback
		res.json({
			success: true,
			audio: result.audioContent.toString('base64'),
			encoding: result.encoding,
			language: result.language,
			voice: result.voice,
			duration: result.duration,
			metadata: result.metadata
		});
	} catch (error) {
		console.error('[voice_api] Synthesize error:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

/**
 * POST /api/voice/command
 * Parse voice command from text
 * 
 * Body (JSON):
 * {
 *   "text": "next question"
 * }
 */
router.post('/command', async (req, res) => {
	try {
		const { text } = req.body;

		if (!text) {
			return res.status(400).json({
				success: false,
				error: 'No text provided'
			});
		}

		const command = parseVoiceCommand(text);

		res.json({
			success: true,
			command: command
		});
	} catch (error) {
		console.error('[voice_api] Command parse error:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

/**
 * POST /api/voice/read-case
 * Generate audio narration for clinical case
 * 
 * Body (JSON):
 * {
 *   "caseId": "case123",
 *   "caseData": { ... },
 *   "language": "en-US"
 * }
 */
router.post('/read-case', async (req, res) => {
	try {
		const { caseData, language } = req.body;

		if (!caseData) {
			return res.status(400).json({
				success: false,
				error: 'No case data provided'
			});
		}

		console.log('[voice_api] Reading case:', {
			caseId: caseData._id,
			language: language || 'en-US'
		});

		const result = await readCase(caseData, language || 'en-US');

		if (!result.success) {
			return res.status(400).json(result);
		}

		res.json({
			success: true,
			audio: result.audioContent.toString('base64'),
			encoding: result.encoding,
			language: result.language,
			voice: result.voice,
			duration: result.duration,
			caseId: result.caseId,
			sections: result.sections
		});
	} catch (error) {
		console.error('[voice_api] Read case error:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

/**
 * GET /api/voice/languages
 * Get list of supported voice languages
 */
router.get('/languages', async (req, res) => {
	try {
		const languages = getSupportedVoiceLanguages();

		res.json({
			success: true,
			languages: languages,
			count: languages.length
		});
	} catch (error) {
		console.error('[voice_api] Languages error:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

/**
 * GET /api/voice/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
	res.json({
		status: 'operational',
		module: 'voice',
		phase: '7-m3',
		features: {
			stt: true,
			tts: true,
			commands: true,
			case_narration: true
		},
		supported_languages: 20
	});
});

export default router;
