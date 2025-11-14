/**
 * voice_service.mjs
 * Phase 7 M3: Voice Interaction System
 * 
 * Google Cloud Speech-to-Text and Text-to-Speech service for medical education.
 * Features:
 * - Multi-language speech recognition with medical vocabulary
 * - Clinical term pronunciation (STEMI, myocardial infarction, etc.)
 * - Voice commands for hands-free navigation
 * - Audio visualization data for frontend
 */

import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import { promisify } from 'util';

// Initialize Google Cloud clients
const speechClient = new speech.SpeechClient();
const ttsClient = new textToSpeech.TextToSpeechClient();

// Medical terminology for enhanced recognition
const MEDICAL_PHRASES = [
	'myocardial infarction',
	'STEMI',
	'NSTEMI',
	'pulmonary embolism',
	'deep vein thrombosis',
	'atrial fibrillation',
	'ventricular tachycardia',
	'congestive heart failure',
	'chronic obstructive pulmonary disease',
	'diabetes mellitus',
	'hypertension',
	'hyperlipidemia',
	'coronary artery disease',
	'acute coronary syndrome',
	'cerebrovascular accident',
	'transient ischemic attack',
	'aortic dissection',
	'pneumothorax',
	'pleural effusion',
	'meningitis',
	'encephalitis',
	'sepsis',
	'anaphylaxis',
	'diabetic ketoacidosis',
	'hyperosmolar hyperglycemic state',
	'acute kidney injury',
	'chronic kidney disease',
	'liver cirrhosis',
	'hepatic encephalopathy',
	'gastrointestinal bleeding',
	'appendicitis',
	'cholecystitis',
	'pancreatitis',
	'diverticulitis',
	'inflammatory bowel disease',
	'Crohn disease',
	'ulcerative colitis',
	'rheumatoid arthritis',
	'systemic lupus erythematosus',
	'osteoarthritis',
	'gout',
	'anemia',
	'thrombocytopenia',
	'neutropenia',
	'leukemia',
	'lymphoma',
	'multiple myeloma'
];

// Voice command patterns
const VOICE_COMMANDS = {
	navigation: [
		{ pattern: /^(next|skip|continue)$/i, action: 'next' },
		{ pattern: /^(back|previous|go back)$/i, action: 'previous' },
		{ pattern: /^(submit|finish|done)$/i, action: 'submit' },
		{ pattern: /^(hint|help|clue)$/i, action: 'hint' },
		{ pattern: /^(read case|read question)$/i, action: 'read_case' },
		{ pattern: /^(read options|read answers)$/i, action: 'read_options' },
		{ pattern: /^(pause|stop)$/i, action: 'pause' },
		{ pattern: /^(resume|play)$/i, action: 'resume' }
	],
	answers: [
		{ pattern: /^(answer |option |select )?([a-e]|[1-5])$/i, action: 'select_answer' }
	]
};

/**
 * Transcribe audio to text with medical term recognition
 * @param {Buffer} audioBuffer - Audio file buffer (WAV/MP3/FLAC)
 * @param {string} languageCode - BCP-47 language code (e.g., 'en-US', 'es-ES')
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Transcription result with confidence scores
 */
export async function transcribeAudio(audioBuffer, languageCode = 'en-US', options = {}) {
	try {
		const audioBytes = audioBuffer.toString('base64');

		const request = {
			audio: {
				content: audioBytes
			},
			config: {
				encoding: options.encoding || 'LINEAR16',
				sampleRateHertz: options.sampleRate || 16000,
				languageCode: languageCode,
				enableAutomaticPunctuation: true,
				enableWordTimeOffsets: true,
				// Boost medical terminology recognition
				speechContexts: [{
					phrases: MEDICAL_PHRASES,
					boost: 20.0 // Significantly increase probability of medical terms
				}],
				// Alternative language codes for better recognition
				alternativeLanguageCodes: options.alternativeLanguages || [],
				// Enhanced model for medical/technical vocabulary
				model: 'default',
				useEnhanced: true
			}
		};

		const [response] = await speechClient.recognize(request);
		const transcription = response.results
			.map(result => result.alternatives[0])
			.filter(alt => alt);

		if (transcription.length === 0) {
			return {
				success: false,
				error: 'No speech detected',
				transcript: '',
				confidence: 0
			};
		}

		// Combine all transcription segments
		const fullTranscript = transcription.map(alt => alt.transcript).join(' ');
		const avgConfidence = transcription.reduce((sum, alt) => sum + alt.confidence, 0) / transcription.length;

		// Extract word-level timing for visualization
		const wordTimings = transcription.flatMap(alt => 
			(alt.words || []).map(word => ({
				word: word.word,
				startTime: parseFloat(word.startTime?.seconds || 0) + parseFloat(word.startTime?.nanos || 0) / 1e9,
				endTime: parseFloat(word.endTime?.seconds || 0) + parseFloat(word.endTime?.nanos || 0) / 1e9,
				confidence: alt.confidence
			}))
		);

		return {
			success: true,
			transcript: fullTranscript,
			confidence: avgConfidence,
			language: languageCode,
			wordTimings: wordTimings,
			segments: transcription.map(alt => ({
				text: alt.transcript,
				confidence: alt.confidence
			}))
		};
	} catch (error) {
		console.error('[voice_service] Transcription error:', error);
		return {
			success: false,
			error: error.message,
			transcript: '',
			confidence: 0
		};
	}
}

/**
 * Parse voice command from transcribed text
 * @param {string} transcript - Transcribed text
 * @returns {Object} Parsed command with action and parameters
 */
export function parseVoiceCommand(transcript) {
	const normalized = transcript.trim().toLowerCase();

	// Check navigation commands
	for (const cmd of VOICE_COMMANDS.navigation) {
		const match = normalized.match(cmd.pattern);
		if (match) {
			return {
				type: 'navigation',
				action: cmd.action,
				originalText: transcript,
				confidence: 'high'
			};
		}
	}

	// Check answer selection commands
	for (const cmd of VOICE_COMMANDS.answers) {
		const match = normalized.match(cmd.pattern);
		if (match) {
			const option = match[2]?.toUpperCase();
			return {
				type: 'answer',
				action: 'select_answer',
				option: option,
				originalText: transcript,
				confidence: 'high'
			};
		}
	}

	// Not a recognized command - treat as dictation
	return {
		type: 'dictation',
		action: 'text_input',
		text: transcript,
		originalText: transcript,
		confidence: 'medium'
	};
}

/**
 * Synthesize text to speech
 * @param {string} text - Text to convert to speech
 * @param {string} languageCode - BCP-47 language code
 * @param {Object} options - Voice and audio options
 * @returns {Promise<Object>} Audio data and metadata
 */
export async function synthesizeSpeech(text, languageCode = 'en-US', options = {}) {
	try {
		// Determine voice parameters based on language
		const voiceParams = getVoiceParameters(languageCode, options.gender);

		const request = {
			input: { text: text },
			voice: {
				languageCode: voiceParams.languageCode,
				name: voiceParams.name,
				ssmlGender: voiceParams.gender
			},
			audioConfig: {
				audioEncoding: options.encoding || 'MP3',
				speakingRate: options.speakingRate || 1.0, // 0.5-2.0
				pitch: options.pitch || 0.0, // -20.0 to 20.0
				volumeGainDb: options.volumeGain || 0.0, // -96.0 to 16.0
				effectsProfileId: options.deviceProfile || ['headphone-class-device']
			}
		};

		const [response] = await ttsClient.synthesizeSpeech(request);

		// Calculate approximate duration (rough estimate)
		const wordsPerMinute = 150 * (options.speakingRate || 1.0);
		const wordCount = text.split(/\s+/).length;
		const durationSeconds = (wordCount / wordsPerMinute) * 60;

		return {
			success: true,
			audioContent: response.audioContent,
			encoding: options.encoding || 'MP3',
			language: languageCode,
			voice: voiceParams.name,
			duration: durationSeconds,
			metadata: {
				text: text,
				wordCount: wordCount,
				speakingRate: options.speakingRate || 1.0
			}
		};
	} catch (error) {
		console.error('[voice_service] TTS error:', error);
		return {
			success: false,
			error: error.message,
			audioContent: null
		};
	}
}

/**
 * Get optimal voice parameters for language
 * @param {string} languageCode - Language code
 * @param {string} preferredGender - 'MALE', 'FEMALE', or 'NEUTRAL'
 * @returns {Object} Voice parameters
 */
function getVoiceParameters(languageCode, preferredGender = 'NEUTRAL') {
	// Map of language codes to high-quality voices
	const voiceMap = {
		'en-US': { name: 'en-US-Neural2-C', gender: 'FEMALE', languageCode: 'en-US' },
		'en-GB': { name: 'en-GB-Neural2-B', gender: 'MALE', languageCode: 'en-GB' },
		'es-ES': { name: 'es-ES-Neural2-A', gender: 'FEMALE', languageCode: 'es-ES' },
		'es-MX': { name: 'es-US-Neural2-A', gender: 'FEMALE', languageCode: 'es-US' },
		'fr-FR': { name: 'fr-FR-Neural2-A', gender: 'FEMALE', languageCode: 'fr-FR' },
		'de-DE': { name: 'de-DE-Neural2-B', gender: 'MALE', languageCode: 'de-DE' },
		'pt-BR': { name: 'pt-BR-Neural2-A', gender: 'FEMALE', languageCode: 'pt-BR' },
		'pt-PT': { name: 'pt-PT-Wavenet-A', gender: 'FEMALE', languageCode: 'pt-PT' },
		'it-IT': { name: 'it-IT-Neural2-A', gender: 'FEMALE', languageCode: 'it-IT' },
		'ar': { name: 'ar-XA-Wavenet-A', gender: 'FEMALE', languageCode: 'ar-XA' },
		'zh-CN': { name: 'cmn-CN-Wavenet-A', gender: 'FEMALE', languageCode: 'cmn-CN' },
		'ja-JP': { name: 'ja-JP-Neural2-B', gender: 'FEMALE', languageCode: 'ja-JP' },
		'ko-KR': { name: 'ko-KR-Neural2-A', gender: 'FEMALE', languageCode: 'ko-KR' },
		'ru-RU': { name: 'ru-RU-Wavenet-A', gender: 'FEMALE', languageCode: 'ru-RU' },
		'hi-IN': { name: 'hi-IN-Neural2-A', gender: 'FEMALE', languageCode: 'hi-IN' }
	};

	// Extract base language code (e.g., 'en' from 'en-US')
	const baseCode = languageCode.split('-')[0];
	
	return voiceMap[languageCode] || 
	       voiceMap[`${baseCode}-${baseCode.toUpperCase()}`] || 
	       { name: 'en-US-Neural2-C', gender: 'NEUTRAL', languageCode: 'en-US' };
}

/**
 * Read case aloud with proper medical term pronunciation
 * @param {Object} caseData - Case object with title, presentation, etc.
 * @param {string} languageCode - Target language
 * @returns {Promise<Object>} Audio data for entire case
 */
export async function readCase(caseData, languageCode = 'en-US') {
	try {
		// Build comprehensive case narration
		const narration = buildCaseNarration(caseData);

		// Synthesize with enhanced medical pronunciation
		const audioResult = await synthesizeSpeech(narration, languageCode, {
			speakingRate: 0.9, // Slightly slower for complex medical terms
			pitch: 0.0,
			volumeGain: 2.0
		});

		return {
			...audioResult,
			caseId: caseData._id,
			sections: {
				title: caseData.title,
				presentation: caseData.presentation,
				questionCount: caseData.questions?.length || 0
			}
		};
	} catch (error) {
		console.error('[voice_service] Read case error:', error);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Build natural-sounding case narration
 * @param {Object} caseData - Case object
 * @returns {string} Formatted narration text
 */
function buildCaseNarration(caseData) {
	let narration = '';

	// Case title
	if (caseData.title) {
		narration += `Case: ${caseData.title}. `;
	}

	// Clinical presentation
	if (caseData.presentation) {
		narration += `${caseData.presentation} `;
	}

	// Patient demographics
	if (caseData.demographics) {
		const demo = caseData.demographics;
		narration += `The patient is a ${demo.age}-year-old ${demo.sex}. `;
	}

	// Vital signs
	if (caseData.vital_signs) {
		const vitals = caseData.vital_signs;
		narration += `Vital signs: `;
		if (vitals.bp) narration += `Blood pressure ${vitals.bp}. `;
		if (vitals.hr) narration += `Heart rate ${vitals.hr}. `;
		if (vitals.rr) narration += `Respiratory rate ${vitals.rr}. `;
		if (vitals.temp) narration += `Temperature ${vitals.temp}. `;
		if (vitals.o2sat) narration += `Oxygen saturation ${vitals.o2sat}%. `;
	}

	// Physical exam findings
	if (caseData.physical_exam) {
		narration += `Physical examination reveals: ${caseData.physical_exam}. `;
	}

	// Lab results
	if (caseData.lab_results && caseData.lab_results.length > 0) {
		narration += `Laboratory results: ${caseData.lab_results.join(', ')}. `;
	}

	// Imaging
	if (caseData.imaging) {
		narration += `Imaging: ${caseData.imaging}. `;
	}

	// Questions
	if (caseData.questions && caseData.questions.length > 0) {
		narration += `There are ${caseData.questions.length} questions for this case. `;
	}

	return narration.trim();
}

/**
 * Get supported languages for voice interaction
 * @returns {Array} List of supported language codes with metadata
 */
export function getSupportedVoiceLanguages() {
	return [
		{ code: 'en-US', name: 'English (US)', stt: true, tts: true, quality: 'neural' },
		{ code: 'en-GB', name: 'English (UK)', stt: true, tts: true, quality: 'neural' },
		{ code: 'es-ES', name: 'Spanish (Spain)', stt: true, tts: true, quality: 'neural' },
		{ code: 'es-MX', name: 'Spanish (Mexico)', stt: true, tts: true, quality: 'neural' },
		{ code: 'fr-FR', name: 'French', stt: true, tts: true, quality: 'neural' },
		{ code: 'de-DE', name: 'German', stt: true, tts: true, quality: 'neural' },
		{ code: 'pt-BR', name: 'Portuguese (Brazil)', stt: true, tts: true, quality: 'neural' },
		{ code: 'pt-PT', name: 'Portuguese (Portugal)', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'it-IT', name: 'Italian', stt: true, tts: true, quality: 'neural' },
		{ code: 'ar-XA', name: 'Arabic', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'zh-CN', name: 'Chinese (Simplified)', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'ja-JP', name: 'Japanese', stt: true, tts: true, quality: 'neural' },
		{ code: 'ko-KR', name: 'Korean', stt: true, tts: true, quality: 'neural' },
		{ code: 'ru-RU', name: 'Russian', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'hi-IN', name: 'Hindi', stt: true, tts: true, quality: 'neural' },
		{ code: 'nl-NL', name: 'Dutch', stt: true, tts: true, quality: 'neural' },
		{ code: 'pl-PL', name: 'Polish', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'tr-TR', name: 'Turkish', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'sv-SE', name: 'Swedish', stt: true, tts: true, quality: 'wavenet' },
		{ code: 'da-DK', name: 'Danish', stt: true, tts: true, quality: 'wavenet' }
	];
}

export default {
	transcribeAudio,
	parseVoiceCommand,
	synthesizeSpeech,
	readCase,
	getSupportedVoiceLanguages
};
