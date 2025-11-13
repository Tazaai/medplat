// ~/medplat/backend/routes/curriculum_api.mjs
// Phase 4 Milestone 3: Curriculum Builder
// Adaptive exam paths for USMLE, MRCP, FRCA, and regional certifications

import express from 'express';
import { db } from '../firebaseClient.js';
import { getOpenAIClient } from '../openaiClient.js';
import { logOpenAICall, logEngagementEvent } from '../telemetry/telemetry_logger.mjs';
import { registerTelemetry } from '../engagement/engagement_core.mjs';

const router = express.Router();

/**
 * POST /api/curriculum/path
 * Creates an adaptive exam path based on user's weak areas, target exam, and timeline
 */
router.post('/path', async (req, res) => {
	try {
		const { uid, examType = 'USMLE', targetWeeks = 12, region = 'unspecified', language = 'en' } = req.body;

		if (!uid) {
			return res.status(400).json({ ok: false, error: 'Missing required field: uid' });
		}

		const startTime = Date.now();
		const sessionId = `curriculum_${uid}_${Date.now()}`;

		// Fetch user's weak areas from Firestore
		const weakAreasRef = db.collection('weak_areas').doc(uid);
		const weakAreasDoc = await weakAreasRef.get();
		const weakTopics = weakAreasDoc.exists ? (weakAreasDoc.data().topics || []) : [];

		// Fetch user's progress history
		const progressRef = db.collection('users').doc(uid).collection('progress');
		const progressSnapshot = await progressRef.orderBy('timestamp', 'desc').limit(20).get();
		
		const completedTopics = [];
		const averageScores = {};
		
		progressSnapshot.forEach(doc => {
			const data = doc.data();
			if (data.topic && data.score !== undefined) {
				if (!completedTopics.includes(data.topic)) {
					completedTopics.push(data.topic);
				}
				if (!averageScores[data.topic]) {
					averageScores[data.topic] = [];
				}
				averageScores[data.topic].push(data.score);
			}
		});

		// Calculate average scores per topic
		const topicStrengths = {};
		for (const [topic, scores] of Object.entries(averageScores)) {
			const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
			topicStrengths[topic] = avg;
		}

		// Define exam-specific focus areas
		const examProfiles = {
			USMLE: {
				name: 'United States Medical Licensing Examination',
				areas: [
					'Cardiovascular System', 'Respiratory System', 'Gastrointestinal System',
					'Renal & Urinary System', 'Endocrine System', 'Hematology & Oncology',
					'Infectious Diseases', 'Musculoskeletal System', 'Nervous System',
					'Psychiatry & Behavioral Science', 'Reproductive System', 'Immunology',
					'Pharmacology', 'Biostatistics & Epidemiology', 'Ethics & Professionalism'
				],
				weeksPerArea: 1,
				reviewWeeks: 2
			},
			MRCP: {
				name: 'Membership of the Royal Colleges of Physicians',
				areas: [
					'Cardiology', 'Respiratory Medicine', 'Gastroenterology & Hepatology',
					'Nephrology', 'Endocrinology & Diabetes', 'Haematology',
					'Infectious Diseases & GUM', 'Rheumatology', 'Neurology',
					'Dermatology', 'Ophthalmology', 'Palliative Care',
					'Clinical Pharmacology', 'Medical Statistics', 'Clinical Ethics'
				],
				weeksPerArea: 1,
				reviewWeeks: 3
			},
			FRCA: {
				name: 'Fellowship of the Royal College of Anaesthetists',
				areas: [
					'Physiology', 'Pharmacology', 'Physics & Clinical Measurement',
					'Anaesthetic Equipment', 'General Anaesthesia', 'Regional Anaesthesia',
					'Acute & Chronic Pain', 'Intensive Care Medicine', 'Resuscitation',
					'Airway Management', 'Cardiovascular Anaesthesia', 'Neuroanaesthesia',
					'Obstetric Anaesthesia', 'Paediatric Anaesthesia', 'Safety & Quality'
				],
				weeksPerArea: 1,
				reviewWeeks: 2
			},
			DK_NATIONAL: {
				name: 'Danish National Medical Exam',
				areas: [
					'Intern Medicin', 'Kardiologi', 'Pneumologi', 'Gastroenterologi',
					'Nefrologi', 'Endokrinologi', 'Infektionsmedicin', 'Hæmatologi',
					'Neurologi', 'Kirurgi', 'Psykiatri', 'Pædiatri',
					'Gynækologi & Obstetrik', 'Almen Medicin', 'Sundhedsstyrelsen Guidelines'
				],
				weeksPerArea: 1,
				reviewWeeks: 2
			}
		};

		const profile = examProfiles[examType] || examProfiles.USMLE;
		
		// Generate personalized curriculum using OpenAI
		const client = getOpenAIClient();
		const model = 'gpt-4o-mini';

		const systemPrompt = `You are an expert medical education curriculum designer specializing in ${profile.name}. 
Create a personalized study roadmap that:
1. Prioritizes weak areas (${weakTopics.length > 0 ? weakTopics.join(', ') : 'balanced coverage'})
2. Builds progressively from fundamentals to advanced topics
3. Integrates completed topics (${completedTopics.length} so far) for review
4. Structures content for ${targetWeeks}-week timeline
5. Includes region-specific guidelines (${region})

Output a structured JSON curriculum with:
- Weekly modules (title, topics[], focus, estimatedHours, resources[])
- Milestone assessments (at 25%, 50%, 75%, 100%)
- Review sessions integrating prior weak areas
- Final exam preparation week

Be specific with clinical scenarios and decision-making skills.`;

		const userMessage = `Create a ${targetWeeks}-week ${examType} curriculum for:
- Weak areas: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None identified'}
- Completed topics: ${completedTopics.length > 0 ? completedTopics.slice(0, 10).join(', ') : 'Starting fresh'}
- Topic strengths: ${Object.keys(topicStrengths).length > 0 ? JSON.stringify(topicStrengths).slice(0, 200) : 'None yet'}
- Language: ${language}
- Region: ${region}

Focus areas for ${examType}: ${profile.areas.join(', ')}`;

		const completion = await client.chat.completions.create({
			model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userMessage }
			],
			temperature: 0.7,
			max_tokens: 2500,
			response_format: { type: 'json_object' }
		});

		const latencyMs = Date.now() - startTime;
		const responseText = completion.choices[0]?.message?.content || '{}';
		let curriculum;

		try {
			curriculum = JSON.parse(responseText);
		} catch (parseErr) {
			console.error('Failed to parse OpenAI curriculum response:', parseErr);
			curriculum = {
				examType,
				totalWeeks: targetWeeks,
				modules: profile.areas.slice(0, targetWeeks - 2).map((area, idx) => ({
					week: idx + 1,
					title: area,
					topics: [area],
					focus: 'Core concepts and clinical applications',
					estimatedHours: 10,
					resources: []
				})),
				milestones: [
					{ week: Math.floor(targetWeeks * 0.25), type: 'assessment', title: 'First Quarter Assessment' },
					{ week: Math.floor(targetWeeks * 0.5), type: 'assessment', title: 'Midpoint Assessment' },
					{ week: Math.floor(targetWeeks * 0.75), type: 'assessment', title: 'Third Quarter Assessment' },
					{ week: targetWeeks, type: 'final_exam', title: 'Final Exam Preparation' }
				]
			};
		}

		// Add metadata
		const curriculumData = {
			...curriculum,
			uid,
			examType,
			targetWeeks,
			region,
			language,
			weakAreasAddressed: weakTopics,
			completedTopics: completedTopics.slice(0, 20),
			sessionId,
			createdAt: new Date().toISOString(),
			status: 'active',
			progress: 0,
			completedModules: []
		};

		// Save to Firestore
		const curriculumRef = db.collection('users').doc(uid).collection('curriculum').doc(sessionId);
		await curriculumRef.set(curriculumData);

		// Log telemetry
		const usage = completion.usage || { total_tokens: 1000 };
		const estimatedCost = (usage.total_tokens / 1000) * 0.0001; // gpt-4o-mini pricing

		await logOpenAICall({
			model,
			tokens: usage.total_tokens,
			latencyMs,
			costUSD: estimatedCost,
			endpoint: '/api/curriculum/path'
		});

		await logEngagementEvent({
			uid,
			eventType: 'curriculum_created',
			topic: examType,
			details: {
				sessionId,
				targetWeeks,
				weakAreasCount: weakTopics.length,
				region
			}
		});

		// Register with engagement core
		await registerTelemetry({
			uid,
			eventType: 'curriculum_created',
			topic: examType,
			timestamp: new Date().toISOString(),
			metadata: { sessionId, targetWeeks }
		});

		res.json({
			ok: true,
			sessionId,
			curriculum: curriculumData,
			examProfile: {
				name: profile.name,
				totalAreas: profile.areas.length,
				estimatedTotalHours: targetWeeks * 10
			}
		});

	} catch (err) {
		console.error('Curriculum path creation error:', err);
		res.status(500).json({ 
			ok: false, 
			error: 'Failed to create curriculum path',
			details: err.message 
		});
	}
});

/**
 * GET /api/curriculum/:uid
 * Retrieves user's active curriculum roadmap
 */
router.get('/:uid', async (req, res) => {
	try {
		const { uid } = req.params;

		if (!uid) {
			return res.status(400).json({ ok: false, error: 'Missing uid parameter' });
		}

		// Fetch all curricula for user
		const curriculaRef = db.collection('users').doc(uid).collection('curriculum');
		const snapshot = await curriculaRef.orderBy('createdAt', 'desc').limit(10).get();

		if (snapshot.empty) {
			return res.json({
				ok: true,
				curricula: [],
				message: 'No curriculum found. Create one with POST /api/curriculum/path'
			});
		}

		const curricula = [];
		snapshot.forEach(doc => {
			curricula.push({
				id: doc.id,
				...doc.data()
			});
		});

		// Get the most recent active curriculum
		const activeCurriculum = curricula.find(c => c.status === 'active') || curricula[0];

		res.json({
			ok: true,
			activeCurriculum,
			allCurricula: curricula,
			totalCount: curricula.length
		});

	} catch (err) {
		console.error('Curriculum retrieval error:', err);
		res.status(500).json({ 
			ok: false, 
			error: 'Failed to retrieve curriculum',
			details: err.message 
		});
	}
});

/**
 * PATCH /api/curriculum/:uid/:sessionId/progress
 * Updates progress on a specific curriculum module
 */
router.patch('/:uid/:sessionId/progress', async (req, res) => {
	try {
		const { uid, sessionId } = req.params;
		const { moduleIndex, completed = true } = req.body;

		if (!uid || !sessionId) {
			return res.status(400).json({ ok: false, error: 'Missing uid or sessionId' });
		}

		const curriculumRef = db.collection('users').doc(uid).collection('curriculum').doc(sessionId);
		const doc = await curriculumRef.get();

		if (!doc.exists) {
			return res.status(404).json({ ok: false, error: 'Curriculum not found' });
		}

		const data = doc.data();
		const completedModules = data.completedModules || [];

		if (completed && !completedModules.includes(moduleIndex)) {
			completedModules.push(moduleIndex);
		}

		const totalModules = data.modules?.length || data.totalWeeks || 12;
		const progress = Math.round((completedModules.length / totalModules) * 100);

		await curriculumRef.update({
			completedModules,
			progress,
			lastUpdated: new Date().toISOString()
		});

		// Log engagement
		await logEngagementEvent({
			uid,
			eventType: 'curriculum_progress',
			topic: data.examType,
			details: { sessionId, moduleIndex, progress }
		});

		res.json({
			ok: true,
			progress,
			completedModules: completedModules.length,
			totalModules
		});

	} catch (err) {
		console.error('Curriculum progress update error:', err);
		res.status(500).json({ 
			ok: false, 
			error: 'Failed to update progress',
			details: err.message 
		});
	}
});

/**
 * GET /api/curriculum/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
	res.json({
		ok: true,
		service: 'curriculum_builder',
		status: 'operational',
		examTypes: ['USMLE', 'MRCP', 'FRCA', 'DK_NATIONAL'],
		timestamp: new Date().toISOString()
	});
});

export default router;
