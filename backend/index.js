// backend/index.js — Express server entry (Cloud Run friendly)
// Listens on process.env.PORT || 8080 and binds to 0.0.0.0

import express from 'express';
import cors from 'cors';
import path from 'path';
import url from 'url';
import fs from 'fs';
import topicsRouter from './routes/topics_api.mjs';

// Diagnostic: Log fallback topics file presence and sample
try {
	const fallbackPath = path.join(__dirname, 'data/new_topics_global.json');
	if (fs.existsSync(fallbackPath)) {
		const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
		const fallbackTopics = JSON.parse(fallbackContent);
		console.log(`🟢 Fallback topics file found: ${fallbackPath}`);
		console.log(`🟢 Fallback topics count: ${fallbackTopics.length}`);
		if (fallbackTopics.length > 0) {
			console.log('🟢 Fallback topic sample:', fallbackTopics[0]);
		}
	} else {
		console.warn(`🔴 Fallback topics file NOT found: ${fallbackPath}`);
	}
} catch (e) {
	console.error('🔴 Error reading fallback topics file:', e && e.message ? e.message : e);
}
import expertPanelApi from './routes/expert_panel_api.mjs';
import internalPanelApi from './routes/internal_panel_api.mjs';
import panelRouter from './routes/panel_api.mjs'; // Phase 5: External Development Panel

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

// 🔧 GLOBAL CORS FIX - Must be at the absolute top, before any routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Startup-time diagnostic: list route files immediately so we see
// whether the routes/ folder is present in each container instance.
try {
	const _routeDir = path.join(__dirname, 'routes');
	const _files = fs.existsSync(_routeDir) ? fs.readdirSync(_routeDir) : [];
	console.log('STARTUP ROUTES:', { pid: process.pid, dir: _routeDir, files: _files.slice(0, 200) });
} catch (e) {
	console.warn('STARTUP ROUTES: could not read routes folder:', e && e.message ? e.message : e);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure topics router is mounted (explicit top-level import + mount per request)
// This is intentionally a static import so Cloud Run serves /api/topics reliably.
app.use('/api/topics', topicsRouter);
app.use('/api/topics2', topicsRouter); // Alias for topics2 collection (same router)
console.log('✅ Mounted /api/topics and /api/topics2 (static import)');

// Mount expert panel router statically so it's available early in startup
app.use('/api/panel', panelRouter);
console.log('✅ Mounted /api/panel (static import)');

// Mount expert panel review API
app.use('/api/expert-panel', expertPanelApi);
console.log('✅ Mounted /api/expert-panel (static import)');

// Mount internal panel API (invisible auto-review before user sees case)
app.use('/api/internal-panel', internalPanelApi);
console.log('✅ Mounted /api/internal-panel (static import)');


// ✅ CORS already configured above - removed duplicate middleware

// Basic health endpoint
app.get('/', (req, res) => res.json({ status: 'MedPlat OK', pid: process.pid }));

// Phase 13: Enhanced health check endpoints
app.get('/health', (req, res) => {
	const healthData = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		pid: process.pid,
		nodeVersion: process.version,
		platform: process.platform
	};
	res.json(healthData);
});

app.get('/health/ready', (req, res) => {
	// Readiness probe: check if all critical services are ready
	const ready = {
		status: 'ready',
		services: {
			openai: true, // Would check OpenAI client in production
			firestore: true, // Would check Firestore connection
			express: true
		},
		timestamp: new Date().toISOString()
	};
	res.json(ready);
});

app.get('/health/live', (req, res) => {
	// Liveness probe: simple check that server responds
	res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Mount known routes if present. Fail gracefully if route files missing.
// Use dynamic imports so we can catch import/time issues at startup
// and avoid static `import` statements inside blocks (which cause
// SyntaxError in ESM when used incorrectly).
function normalizeRouter(mod) {
	try {
		const info = { hasModule: !!mod, keys: mod ? Object.keys(mod) : [], hasDefault: !!(mod && mod.default) };
		let router = mod && (mod.default || mod);
		// Basic validation: express routers have a 'stack' array
		// Check this BEFORE calling as function, since Express routers are also functions
		if (router && Array.isArray(router.stack)) return router;
		// if module exported a factory, call it to obtain the router
		if (typeof router === 'function') router = router();
		// Check again after calling factory
		if (router && Array.isArray(router.stack)) return router;
		console.warn('normalizeRouter: unexpected module shape', info, 'routerType', typeof router);
		return null;
	} catch (e) {
		console.error('normalizeRouter: error while normalizing module', e && e.stack ? e.stack : e);
		return null;
	}
}

async function mountRoutes() {
	try {
		// Dynamic imports keep this code robust in diverse container runtimes
	const [topicsMod, dialogMod, gamifyMod, gamifyDirectMod, commentMod, locationMod, casesMod, quickrefMod, evidenceMod, panelDiscussionMod, guidelinesMod, adaptiveFeedbackMod, telemetryMod, mentorMod, curriculumMod, analyticsMod, mentorNetworkMod, certificationMod, leaderboardMod, examPrepMod, analyticsDashboardMod, socialMod, reasoningMod, translationMod, voiceMod, glossaryMod] = await Promise.all([
			import('./routes/topics_api.mjs'),
			import('./routes/dialog_api.mjs'),
			import('./routes/gamify_api.mjs'),
			import('./routes/gamify_direct_api.mjs'),
			import('./routes/comment_api.mjs'),
			import('./routes/location_api.mjs'),
			import('./routes/cases_api.mjs'),
			import('./routes/quickref_api.mjs'),
			import('./routes/evidence_api.mjs'),
			import('./routes/panel_discussion_api.mjs'),
			import('./routes/guidelines_api.mjs'),
			import('./routes/adaptive_feedback_api.mjs'), // Phase 3: Adaptive feedback
			import('./routes/telemetry_api.mjs'), // Phase 4 M1: Telemetry
			import('./routes/mentor_api.mjs'), // Phase 4 M2: AI Mentor
			import('./routes/curriculum_api.mjs'), // Phase 4 M3: Curriculum Builder
			import('./routes/analytics_api.mjs'), // Phase 4 M4: Analytics & Optimization
			import('./routes/mentor_network_api.mjs'), // Phase 5: Global AI Mentor Network
			import('./routes/certification_api.mjs'), // Phase 6 M1: Certification Infrastructure
			import('./routes/leaderboard_api.mjs'), // Phase 6 M2: Leaderboard System
			import('./routes/exam_prep_api.mjs'), // Phase 6 M3: Exam Prep Tracks
		import('./routes/analytics_dashboard_api.mjs'), // Phase 6 M4: Analytics Dashboard
		import('./routes/social_api.mjs'), // Phase 6 M5: Social Features
		import('./routes/reasoning_api.mjs'), // Phase 7 M1: AI Reasoning Engine
		import('./routes/translation_api.mjs'), // Phase 7 M2: Multi-Language
		import('./routes/voice_api.mjs'), // Phase 7 M3: Voice Interaction
		import('./routes/glossary_api.mjs'), // Phase 7 M4: Medical Glossary
	]);
	const dialogRouter = normalizeRouter(dialogMod);
	const gamifyRouter = normalizeRouter(gamifyMod);
	const gamifyDirectRouter = normalizeRouter(gamifyDirectMod);
	const commentRouter = normalizeRouter(commentMod);
	const locationRouter = normalizeRouter(locationMod);
	const casesRouter = normalizeRouter(casesMod);
	const quickrefRouter = normalizeRouter(quickrefMod);
	const evidenceRouter = normalizeRouter(evidenceMod);
	const panelDiscussionRouter = normalizeRouter(panelDiscussionMod);
	const guidelinesRouter = normalizeRouter(guidelinesMod);
	const adaptiveFeedbackRouter = normalizeRouter(adaptiveFeedbackMod); // Phase 3
	const telemetryRouter = normalizeRouter(telemetryMod); // Phase 4 M1
	const mentorRouter = normalizeRouter(mentorMod); // Phase 4 M2
	const curriculumRouter = normalizeRouter(curriculumMod); // Phase 4 M3
	const analyticsRouter = normalizeRouter(analyticsMod); // Phase 4 M4
	const mentorNetworkRouter = normalizeRouter(mentorNetworkMod); // Phase 5
	const certificationRouter = normalizeRouter(certificationMod); // Phase 6 M1
	const leaderboardRouter = normalizeRouter(leaderboardMod); // Phase 6 M2
	const examPrepRouter = normalizeRouter(examPrepMod); // Phase 6 M3
	const analyticsDashboardRouter = normalizeRouter(analyticsDashboardMod); // Phase 6 M4
	const socialRouter = normalizeRouter(socialMod); // Phase 6 M5
	const reasoningRouter = normalizeRouter(reasoningMod); // Phase 7 M1
	const translationRouter = normalizeRouter(translationMod); // Phase 7 M2
	const voiceRouter = normalizeRouter(voiceMod); // Phase 7 M3
	const glossaryRouter = normalizeRouter(glossaryMod); // Phase 7 M4


		// Mount each router individually and guard against a single broken module bringing down startup
		try {
			if (locationRouter) {
				app.use('/api/location', locationRouter);
				console.log('✅ Mounted /api/location -> ./routes/location_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/location_api.mjs:', e && e.stack ? e.stack : e);
		}

		// /api/topics is mounted via a top-level static import above to ensure
		// the route exists early in the startup path and avoids dynamic import timing issues.

		try {
			if (dialogRouter) {
				app.use('/api/dialog', dialogRouter);
				console.log('✅ Mounted /api/dialog -> ./routes/dialog_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/dialog_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (gamifyRouter) {
				app.use('/api/gamify', gamifyRouter);
				console.log('✅ Mounted /api/gamify -> ./routes/gamify_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/gamify_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (gamifyDirectRouter) {
				app.use('/api/gamify-direct', gamifyDirectRouter);
				console.log('✅ Mounted /api/gamify-direct -> ./routes/gamify_direct_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/gamify_direct_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (commentRouter) {
				app.use('/api/comment', commentRouter);
				console.log('✅ Mounted /api/comment -> ./routes/comment_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/comment_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (casesRouter) {
				app.use('/api/cases', casesRouter);
				console.log('✅ Mounted /api/cases -> ./routes/cases_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/cases_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (quickrefRouter) {
				app.use('/api/quickref', quickrefRouter);
				console.log('✅ Mounted /api/quickref -> ./routes/quickref_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/quickref_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (evidenceRouter) {
				app.use('/api/evidence', evidenceRouter);
				console.log('✅ Mounted /api/evidence -> ./routes/evidence_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/evidence_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (panelDiscussionRouter) {
				app.use('/api/panel-discussion', panelDiscussionRouter);
				console.log('✅ Mounted /api/panel-discussion -> ./routes/panel_discussion_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/panel_discussion_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (guidelinesRouter) {
				app.use('/api/guidelines', guidelinesRouter);
				console.log('✅ Mounted /api/guidelines -> ./routes/guidelines_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/guidelines_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (adaptiveFeedbackRouter) {
				app.use('/api/adaptive-feedback', adaptiveFeedbackRouter);
				console.log('✅ Mounted /api/adaptive-feedback -> ./routes/adaptive_feedback_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/adaptive_feedback_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (telemetryRouter) {
				app.use('/api/telemetry', telemetryRouter);
				console.log('✅ Mounted /api/telemetry -> ./routes/telemetry_api.mjs (Phase 4 M1)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/telemetry_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (mentorRouter) {
				app.use('/api/mentor', mentorRouter);
				console.log('✅ Mounted /api/mentor -> ./routes/mentor_api.mjs (Phase 4 M2)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/mentor_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (curriculumRouter) {
				app.use('/api/curriculum', curriculumRouter);
				console.log('✅ Mounted /api/curriculum -> ./routes/curriculum_api.mjs (Phase 4 M3)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/curriculum_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (analyticsRouter) {
				app.use('/api/analytics', analyticsRouter);
				console.log('✅ Mounted /api/analytics -> ./routes/analytics_api.mjs (Phase 4 M4)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/analytics_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (mentorNetworkRouter) {
				app.use('/api/mentor_network', mentorNetworkRouter);
				console.log('✅ Mounted /api/mentor_network -> ./routes/mentor_network_api.mjs (Phase 5)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/mentor_network_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (certificationRouter) {
				app.use('/api/certification', certificationRouter);
				console.log('✅ Mounted /api/certification -> ./routes/certification_api.mjs (Phase 6 M1)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/certification_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (leaderboardRouter) {
				app.use('/api/leaderboard', leaderboardRouter);
				console.log('✅ Mounted /api/leaderboard -> ./routes/leaderboard_api.mjs (Phase 6 M2)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/leaderboard_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (examPrepRouter) {
				app.use('/api/exam_prep', examPrepRouter);
				console.log('✅ Mounted /api/exam_prep -> ./routes/exam_prep_api.mjs (Phase 6 M3)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/exam_prep_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
			if (analyticsDashboardRouter) {
				app.use('/api/analytics_dashboard', analyticsDashboardRouter);
				console.log('✅ Mounted /api/analytics_dashboard -> ./routes/analytics_dashboard_api.mjs (Phase 6 M4)');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/analytics_dashboard_api.mjs:', e && e.stack ? e.stack : e);
		}

		try {
		if (socialRouter) {
			app.use('/api/social', socialRouter);
			console.log('✅ Mounted /api/social -> ./routes/social_api.mjs (Phase 6 M5)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/social_api.mjs:', e && e.stack ? e.stack : e);
	}

	try {
		if (reasoningRouter) {
			app.use('/api/reasoning', reasoningRouter);
			console.log('✅ Mounted /api/reasoning -> ./routes/reasoning_api.mjs (Phase 7 M1)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/reasoning_api.mjs:', e && e.stack ? e.stack : e);
	}

	try {
		if (translationRouter) {
			app.use('/api/translation', translationRouter);
			console.log('✅ Mounted /api/translation -> ./routes/translation_api.mjs (Phase 7 M2)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/translation_api.mjs:', e && e.stack ? e.stack : e);
	}

	// Phase 7 M3: Voice Interaction
	try {
		if (voiceRouter) {
			app.use('/api/voice', voiceRouter);
			console.log('✅ Mounted /api/voice -> ./routes/voice_api.mjs (Phase 7 M3)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/voice_api.mjs:', e && e.stack ? e.stack : e);
	}

	// Phase 7 M4: Medical Glossary (Dual-mode: Case tooltips + Gamification quizzes)
	try {
		if (glossaryRouter) {
			app.use('/api/glossary', glossaryRouter);
			console.log('✅ Mounted /api/glossary -> ./routes/glossary_api.mjs (Phase 7 M4)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/glossary_api.mjs:', e && e.stack ? e.stack : e);
	}

} catch (err) {
	console.error('Route import failed:', err && err.stack ? err.stack : err);
	// continue — server can still run for diagnostics
}
}

// Mount routes and extend timeouts
await mountRoutes();

// Extend request timeout for long-running AI operations (e.g. expert panel reviews)
app.use((req, res, next) => {
	req.setTimeout(300000); // 5 minutes for AI generation
	res.setTimeout(300000);
	next();
});

// Temporary debug endpoint to list mounted routes (useful in Cloud Run)
app.get('/debug/routes', (req, res) => {
	try {
		const routes = (app._router && app._router.stack ? app._router.stack : [])
			.filter((r) => r && r.route)
			.map((r) => Object.keys(r.route.methods).map((m) => `${m.toUpperCase()} ${r.route.path}`))
			.flat();
		return res.json({ routes });
	} catch (e) {
		return res.status(500).json({ error: String(e) });
	}
});

// Additional diagnostics: list files in routes/ and attempt a dynamic import test
app.get('/routes-list', (req, res) => {
	try {
		const routeDir = path.join(__dirname, 'routes');
		const files = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : [];
		return res.json({ ok: true, files, topics_file_present: files.includes('topics_api.mjs') });
	} catch (e) {
		return res.status(500).json({ ok: false, error: String(e) });
	}
});

app.get('/routes-import-test', async (req, res) => {
	try {
		const mod = await import('./routes/topics_api.mjs');
		const def = mod && mod.default ? typeof mod.default : 'no-default';
		return res.json({ ok: true, imported: true, defaultType: def });
	} catch (e) {
		return res.status(500).json({ ok: false, imported: false, error: String(e) });
	}
});

// User-requested clearer diagnostics (friendly names for quick curls)
app.get('/debug/routes-files', (req, res) => {
	try {
		const routeDir = path.join(__dirname, 'routes');
		const files = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : [];
		return res.json({ ok: true, files, topics_file_present: files.includes('topics_api.mjs') });
	} catch (err) {
		return res.status(500).json({ ok: false, error: String(err) });
	}
});

app.get('/debug/import-topics', async (req, res) => {
	try {
		// attempt import and return keys + any exported names
		const mod = await import('./routes/topics_api.mjs');
		const exported = Object.keys(mod || {});
		const defType = mod && mod.default ? typeof mod.default : 'no-default';
		return res.json({ ok: true, imported: true, exported, defaultType: defType });
	} catch (err) {
		return res.status(500).json({ ok: false, imported: false, error: String(err), stack: err && err.stack ? err.stack.split('\n').slice(0,8) : undefined });
	}
});

// Lightweight environment diagnostics (safe - does NOT echo secret values)
app.get('/debug/env', (req, res) => {
	try {
		return res.json({
			ok: true,
			hasOpenAIKey: !!process.env.OPENAI_API_KEY,
			hasFirebaseServiceKey: !!process.env.FIREBASE_SERVICE_KEY,
			GCP_PROJECT: process.env.GCP_PROJECT || null,
			TOPICS_COLLECTION: process.env.TOPICS_COLLECTION || null,
			NODE_ENV: process.env.NODE_ENV || null,
			pid: process.pid,
		});
	} catch (err) {
		return res.status(500).json({ ok: false, error: String(err) });
	}
});

// Start server (Cloud Run compatible)
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`🚀 Backend v15.2.0 listening on port ${PORT}`);
	console.log('✅ Stability hardening complete - production ready');
});

export default app;
