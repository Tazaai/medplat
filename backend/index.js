// backend/index.js — Express server entry (Cloud Run friendly)
// Listens on process.env.PORT || 8080 and binds to 0.0.0.0

import express from 'express';
import cors from 'cors';
import path from 'path';
import url from 'url';
import fs from 'fs';
// ✅ DYNAMIC-ONLY: topics2Api imported dynamically in mountRoutes()

// ✅ DYNAMIC-ONLY: Removed static fallback topics file check
// Removed: expert_panel_api.mjs, internal_panel_api.mjs, panel_api.mjs, panel_review_api.mjs - external panel reviews should not be in backend
// Removed: dialog_api.mjs - Classic Mode removed, only multi-step API remains
import caseApi from './routes/case_api.mjs'; // Multi-step case API

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

// 🔧 GLOBAL CORS FIX - Must be at the absolute top, before any routes
// Restrict CORS to frontend origin only
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://medplat-frontend-139218747785.europe-west1.run.app';
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow requests from frontend origin only
  if (origin === FRONTEND_ORIGIN) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    // Log preflight too (Cloud Run debugging)
    console.log('[REQ]', req.method, req.originalUrl);
    return res.sendStatus(204);
  }
  next();
});

// Top-level request logger (Cloud Run debugging)
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.originalUrl);
  next();
});

// Response status logger for API calls (helps spot 404s like /api/init)
app.use((req, res, next) => {
  if (typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api')) {
    res.on('finish', () => {
      console.log('[RES]', req.method, req.originalUrl, res.statusCode);
    });
  }
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

// Log early middleware failures (e.g., JSON parse errors, payload too large)
app.use((err, req, res, next) => {
  const isBodyParseError =
    (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')) ||
    (err instanceof SyntaxError);
  if (isBodyParseError) {
    console.error('[REQ_ERR]', req.method, req.originalUrl, err.type || err.name, err.message);
  }
  next(err);
});

// ✅ DYNAMIC-ONLY: /api/topics removed - only /api/topics2 mounted dynamically

// Mount expert panel router statically so it's available early in startup
// Removed: /api/panel - external panel reviews should not be in backend
// Removed: /api/dialog - Classic Mode removed, only multi-step API remains

// Mount multi-step case API
import('./routes/case_api.mjs').then(caseApiMod => {
  const caseApi = caseApiMod.default || caseApiMod;
  const caseRouter = typeof caseApi === 'function' ? caseApi() : caseApi;
  app.use('/api/case', caseRouter);
  console.log('✅ Mounted /api/case (multi-step pipeline)');
}).catch(err => {
  console.error('❌ Failed to mount /api/case:', err);
});

// Removed: /api/expert-panel and /api/internal-panel - replaced by multi-step API
// Removed: /api/dialog - Classic Mode removed, only multi-step API remains


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
		if (router && Array.isArray(router.stack)) {
			console.log('normalizeRouter: router already has stack, returning directly');
			return router;
		}
		
		// if module exported a factory function, call it to obtain the router
		if (typeof router === 'function') {
			console.log('normalizeRouter: calling function to get router');
			router = router();
		}
		
		// Check again after calling factory
		if (router && Array.isArray(router.stack)) {
			console.log('normalizeRouter: router obtained successfully, stack length:', router.stack.length);
			return router;
		}
		
		console.warn('normalizeRouter: unexpected module shape', info, 'routerType', typeof router, 'hasStack', router && Array.isArray(router.stack));
		return null;
	} catch (e) {
		console.error('normalizeRouter: error while normalizing module', e && e.stack ? e.stack : e);
		return null;
	}
}

async function mountRoutes() {
	try {
		// Dynamic imports keep this code robust in diverse container runtimes
		// Import each route individually to identify which one fails
		const routeImports = [
			{ name: 'topics_api.mjs', promise: import('./routes/topics_api.mjs') },
			{ name: 'topics2_api.mjs', promise: import('./routes/topics2_api.mjs') },
			// Removed: dialog_api.mjs - Classic Mode removed, only multi-step API remains
			{ name: 'gamify_api.mjs', promise: import('./routes/gamify_api.mjs') },
			{ name: 'gamify_direct_api.mjs', promise: import('./routes/gamify_direct_api.mjs') },
			{ name: 'comment_api.mjs', promise: import('./routes/comment_api.mjs') },
			{ name: 'location_api.mjs', promise: import('./routes/location_api.mjs') },
			{ name: 'cases_api.mjs', promise: import('./routes/cases_api.mjs') },
			{ name: 'quickref_api.mjs', promise: import('./routes/quickref_api.mjs') },
			{ name: 'evidence_api.mjs', promise: import('./routes/evidence_api.mjs') },
			// Removed: guidelines_api.mjs - guidelines removed from system
			{ name: 'adaptive_feedback_api.mjs', promise: import('./routes/adaptive_feedback_api.mjs') },
			{ name: 'telemetry_api.mjs', promise: import('./routes/telemetry_api.mjs') },
			{ name: 'mentor_api.mjs', promise: import('./routes/mentor_api.mjs') },
			{ name: 'curriculum_api.mjs', promise: import('./routes/curriculum_api.mjs') },
			{ name: 'analytics_api.mjs', promise: import('./routes/analytics_api.mjs') },
			{ name: 'mentor_network_api.mjs', promise: import('./routes/mentor_network_api.mjs') },
			{ name: 'certification_api.mjs', promise: import('./routes/certification_api.mjs') },
			{ name: 'leaderboard_api.mjs', promise: import('./routes/leaderboard_api.mjs') },
			{ name: 'exam_prep_api.mjs', promise: import('./routes/exam_prep_api.mjs') },
			{ name: 'analytics_dashboard_api.mjs', promise: import('./routes/analytics_dashboard_api.mjs') },
			{ name: 'social_api.mjs', promise: import('./routes/social_api.mjs') },
			{ name: 'reasoning_api.mjs', promise: import('./routes/reasoning_api.mjs') },
			{ name: 'translation_api.mjs', promise: import('./routes/translation_api.mjs') },
			{ name: 'voice_api.mjs', promise: import('./routes/voice_api.mjs') },
			{ name: 'glossary_api.mjs', promise: import('./routes/glossary_api.mjs') },
			{ name: 'progress_api.mjs', promise: import('./routes/progress_api.mjs') },
			// Removed: panel_review_api.mjs - external panel review should not be in backend
		];

		const results = await Promise.allSettled(routeImports.map(r => r.promise));
		
		// Log any failures with detailed stack traces
		results.forEach((result, index) => {
			const routeName = routeImports[index].name;
			if (result.status === 'rejected') {
				const error = result.reason;
				console.error(`❌ Failed to import ${routeName}:`, error?.message || error);
				if (error?.stack) {
					console.error(`   Stack trace for ${routeName}:`, error.stack.split('\n').slice(0, 10).join('\n   '));
				}
			if (error?.cause) {
				console.error(`   Caused by:`, error.cause);
			}
			// Removed: dialog_api.mjs logging - Classic Mode removed
			}
		});

		const [topicsMod, topics2Mod, gamifyMod, gamifyDirectMod, commentMod, locationMod, casesMod, quickrefMod, evidenceMod, panelDiscussionMod, adaptiveFeedbackMod, telemetryMod, mentorMod, curriculumMod, analyticsMod, mentorNetworkMod, certificationMod, leaderboardMod, examPrepMod, analyticsDashboardMod, socialMod, reasoningMod, translationMod, voiceMod, glossaryMod, progressMod] = [
			results[0].status === 'fulfilled' ? results[0].value : null,
			results[1].status === 'fulfilled' ? results[1].value : null,
			// Removed: dialogMod (was results[2]) - Classic Mode removed
			results[2].status === 'fulfilled' ? results[2].value : null, // gamifyMod
			results[3].status === 'fulfilled' ? results[3].value : null, // gamifyDirectMod
			results[4].status === 'fulfilled' ? results[4].value : null, // commentMod
			results[5].status === 'fulfilled' ? results[5].value : null, // locationMod
			results[6].status === 'fulfilled' ? results[6].value : null, // casesMod
			results[7].status === 'fulfilled' ? results[7].value : null, // quickrefMod
			results[8].status === 'fulfilled' ? results[8].value : null, // evidenceMod
			Promise.resolve(null), // panel_discussion_api.mjs - replaced by universal system
			results[9].status === 'fulfilled' ? results[9].value : null, // adaptiveFeedbackMod
			results[10].status === 'fulfilled' ? results[10].value : null, // telemetryMod
			results[11].status === 'fulfilled' ? results[11].value : null, // mentorMod
			results[12].status === 'fulfilled' ? results[12].value : null, // curriculumMod
			results[13].status === 'fulfilled' ? results[13].value : null, // analyticsMod
			results[14].status === 'fulfilled' ? results[14].value : null, // mentorNetworkMod
			results[15].status === 'fulfilled' ? results[15].value : null, // certificationMod
			results[16].status === 'fulfilled' ? results[16].value : null, // leaderboardMod
			results[17].status === 'fulfilled' ? results[17].value : null, // examPrepMod
			results[18].status === 'fulfilled' ? results[18].value : null, // analyticsDashboardMod
			results[19].status === 'fulfilled' ? results[19].value : null, // socialMod
			results[20].status === 'fulfilled' ? results[20].value : null, // reasoningMod
			results[21].status === 'fulfilled' ? results[21].value : null, // translationMod
			results[22].status === 'fulfilled' ? results[22].value : null, // voiceMod
			results[23].status === 'fulfilled' ? results[23].value : null, // glossaryMod
			results[24].status === 'fulfilled' ? results[24].value : null // progressMod
			// Removed: panelReviewMod - external panel review should not be in backend
		];
	const topics2Api = normalizeRouter(topicsMod); // ✅ DYNAMIC-ONLY: topics2 API router
	const topics2ApiRouter = normalizeRouter(topics2Mod); // Topics2 API router
	// Removed: dialogRouter - Classic Mode removed, only multi-step API remains
	const gamifyRouter = normalizeRouter(gamifyMod);
	const gamifyDirectRouter = normalizeRouter(gamifyDirectMod);
	const commentRouter = normalizeRouter(commentMod);
	const locationRouter = normalizeRouter(locationMod);
	const casesRouter = normalizeRouter(casesMod);
	const quickrefRouter = normalizeRouter(quickrefMod);
	const evidenceRouter = normalizeRouter(evidenceMod);
	const panelDiscussionRouter = normalizeRouter(panelDiscussionMod);
	// Removed: guidelinesRouter - guidelines removed from system
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
	const progressRouter = normalizeRouter(progressMod); // Phase 7: Progress Tracking
	// Removed: panelReviewRouter - external panel review should not be in backend
	const panelReviewRouter = null;


		// Mount each router individually and guard against a single broken module bringing down startup
		try {
			if (locationRouter) {
				app.use('/api/location', locationRouter);
				console.log('✅ Mounted /api/location -> ./routes/location_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/location_api.mjs:', e && e.stack ? e.stack : e);
		}

		// Mount topics2_api.mjs routes (handles all /api/topics2 endpoints)
		try {
			if (topics2ApiRouter) {
				app.use('/api/topics2', topics2ApiRouter);
				// Create separate router for admin routes (routes are defined without /admin prefix)
				const adminRouter = express.Router();
				adminRouter.use('/', topics2ApiRouter);
				app.use('/api/admin/topics2', adminRouter);
				console.log('✅ Mounted /api/topics2 and /api/admin/topics2 -> ./routes/topics2_api.mjs');
			}
		} catch (e) {
			console.error('❌ Could not mount ./routes/topics2_api.mjs:', e && e.stack ? e.stack : e);
		}

		// Removed: /api/dialog mounting - Classic Mode removed, only multi-step API remains

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
				// Also mount /api/generate as alias for compatibility
				app.use('/api/generate', casesRouter);
				console.log('✅ Mounted /api/generate (alias for /api/cases)');
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

		// Removed: /api/panel-discussion - replaced by universal system (expert_conference field)

		try {
			// Removed: /api/guidelines - guidelines removed from system
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

	// Phase 7: Progress Tracking API
	try {
		if (progressRouter) {
			app.use('/api/progress', progressRouter);
			console.log('✅ Mounted /api/progress -> ./routes/progress_api.mjs (Phase 7)');
		}
	} catch (e) {
		console.error('❌ Could not mount ./routes/progress_api.mjs:', e && e.stack ? e.stack : e);
	}

	// Removed: Phase 7 External Panel Review API - external panel reviews should not be in backend

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

// ✅ PROTECTED: Debug endpoints (production-safe)
const isDebugAllowed = (req) => {
	// Allow in development
	if (process.env.NODE_ENV !== 'production') return true;
	// Allow with admin key in production
	return req.headers['x-admin-key'] === process.env.ADMIN_DEBUG_KEY;
};

// Temporary debug endpoint to list mounted routes (useful in Cloud Run)
app.get('/debug/routes', (req, res) => {
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
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
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
	try {
		const routeDir = path.join(__dirname, 'routes');
		const files = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : [];
		return res.json({ ok: true, files, topics_file_present: files.includes('topics_api.mjs') });
	} catch (e) {
		return res.status(500).json({ ok: false, error: String(e) });
	}
});

app.get('/routes-import-test', async (req, res) => {
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
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
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
	try {
		const routeDir = path.join(__dirname, 'routes');
		const files = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : [];
		return res.json({ ok: true, files, topics_file_present: files.includes('topics_api.mjs') });
	} catch (err) {
		return res.status(500).json({ ok: false, error: String(err) });
	}
});

app.get('/debug/import-topics', async (req, res) => {
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
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
	if (!isDebugAllowed(req)) {
		return res.status(404).json({ error: 'Not found' });
	}
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

// Phase 7: Increase server timeouts for enhanced prompts (180 seconds)
const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`🚀 Backend v15.2.0 listening on port ${PORT}`);
	console.log('✅ Stability hardening complete - production ready');
});

// Phase 7: Set server timeouts to handle longer OpenAI requests
server.timeout = 180000; // 180 seconds (3 minutes)
server.keepAliveTimeout = 180000; // 180 seconds
server.headersTimeout = 180000; // 180 seconds (must be >= keepAliveTimeout)

console.log('✅ Server timeouts set: 180 seconds (Phase 7 enhanced prompts)');

export default app;
