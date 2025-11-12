// backend/index.js — Express server entry (Cloud Run friendly)
// Listens on process.env.PORT || 8080 and binds to 0.0.0.0

import express from 'express';
import cors from 'cors';
import path from 'path';
import url from 'url';
import fs from 'fs';
import topicsRouter from './routes/topics_api.mjs';
import panelRouter from './routes/panel_api.mjs';
import expertPanelApi from './routes/expert_panel_api.mjs';
import internalPanelApi from './routes/internal_panel_api.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

// Enable permissive CORS early so it applies to all routes (frontend needs this)
app.use(cors({ origin: '*' }));

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
console.log('✅ Mounted /api/topics (static import)');

// Mount expert panel router statically so it's available early in startup
app.use('/api/panel', panelRouter);
console.log('✅ Mounted /api/panel (static import)');

// Mount expert panel review API
app.use('/api/expert-panel', expertPanelApi);
console.log('✅ Mounted /api/expert-panel (static import)');

// Mount internal panel API (invisible auto-review before user sees case)
app.use('/api/internal-panel', internalPanelApi);
console.log('✅ Mounted /api/internal-panel (static import)');

// CORS middleware: allow requests from the frontend origin(s).
// By default allow all origins for simplicity in Cloud Run; set
// CORS_ALLOWED_ORIGINS comma-separated env to restrict (e.g. https://example.com)
app.use((req, res, next) => {
	try {
		const allowed = process.env.CORS_ALLOWED_ORIGINS
			? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
			: null;
		const origin = req.get('origin');
		if (!allowed) {
			// permissive for now (Cloud Run frontends often run on different subdomains)
			res.setHeader('Access-Control-Allow-Origin', '*');
		} else if (origin && allowed.includes(origin)) {
			res.setHeader('Access-Control-Allow-Origin', origin);
		}
		res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		// short-circuit preflight
		if (req.method === 'OPTIONS') return res.sendStatus(204);
	} catch (e) {
		// don't block requests due to CORS middleware errors
		console.warn('CORS middleware error', e && e.message ? e.message : e);
	}
	return next();
});

// Basic health endpoint
app.get('/', (req, res) => res.json({ status: 'MedPlat OK', pid: process.pid }));

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
		const [topicsMod, dialogMod, gamifyMod, gamifyDirectMod, commentMod, locationMod, casesMod, quickrefMod, evidenceMod, panelDiscussionMod, guidelinesMod, adaptiveFeedbackMod, telemetryMod, mentorMod, curriculumMod] = await Promise.all([
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
		]);

		// Log module shapes to help diagnose mount-time issues
	try { console.log('MODULE: dialogMod keys=', Object.keys(dialogMod || {}), 'defaultType=', typeof (dialogMod && dialogMod.default)); } catch (e) {}
	try { console.log('MODULE: gamifyMod keys=', Object.keys(gamifyMod || {}), 'defaultType=', typeof (gamifyMod && gamifyMod.default)); } catch (e) {}
	try { console.log('MODULE: gamifyDirectMod keys=', Object.keys(gamifyDirectMod || {}), 'defaultType=', typeof (gamifyDirectMod && gamifyDirectMod.default)); } catch (e) {}
	try { console.log('MODULE: commentMod keys=', Object.keys(commentMod || {}), 'defaultType=', typeof (commentMod && commentMod.default)); } catch (e) {}
	try { console.log('MODULE: locationMod keys=', Object.keys(locationMod || {}), 'defaultType=', typeof (locationMod && locationMod.default)); } catch (e) {}
	try { console.log('MODULE: casesMod keys=', Object.keys(casesMod || {}), 'defaultType=', typeof (casesMod && casesMod.default)); } catch (e) {}
	try { console.log('MODULE: quickrefMod keys=', Object.keys(quickrefMod || {}), 'defaultType=', typeof (quickrefMod && quickrefMod.default)); } catch (e) {}
	try { console.log('MODULE: evidenceMod keys=', Object.keys(evidenceMod || {}), 'defaultType=', typeof (evidenceMod && evidenceMod.default)); } catch (e) {}
	try { console.log('MODULE: panelDiscussionMod keys=', Object.keys(panelDiscussionMod || {}), 'defaultType=', typeof (panelDiscussionMod && panelDiscussionMod.default)); } catch (e) {}
	try { console.log('MODULE: guidelinesMod keys=', Object.keys(guidelinesMod || {}), 'defaultType=', typeof (guidelinesMod && guidelinesMod.default)); } catch (e) {}
	try { console.log('MODULE: adaptiveFeedbackMod keys=', Object.keys(adaptiveFeedbackMod || {}), 'defaultType=', typeof (adaptiveFeedbackMod && adaptiveFeedbackMod.default)); } catch (e) {}
	try { console.log('MODULE: telemetryMod keys=', Object.keys(telemetryMod || {}), 'defaultType=', typeof (telemetryMod && telemetryMod.default)); } catch (e) {}
	try { console.log('MODULE: mentorMod keys=', Object.keys(mentorMod || {}), 'defaultType=', typeof (mentorMod && mentorMod.default)); } catch (e) {}
	try { console.log('MODULE: curriculumMod keys=', Object.keys(curriculumMod || {}), 'defaultType=', typeof (curriculumMod && curriculumMod.default)); } catch (e) {}
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

	// Debug logging for Phase 3 + Phase 4 routers
	console.log('DEBUG: guidelinesRouter=', guidelinesRouter, 'type=', typeof guidelinesRouter);
	console.log('DEBUG: adaptiveFeedbackRouter=', adaptiveFeedbackRouter, 'type=', typeof adaptiveFeedbackRouter);
	console.log('DEBUG: telemetryRouter=', telemetryRouter, 'type=', typeof telemetryRouter);
	console.log('DEBUG: mentorRouter=', mentorRouter, 'type=', typeof mentorRouter);
	console.log('DEBUG: curriculumRouter=', curriculumRouter, 'type=', typeof curriculumRouter);

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
	} catch (err) {
		console.error('Route import failed:', err && err.stack ? err.stack : err);
		// continue — server can still run for diagnostics
	}
}

// Start server with Cloud Run friendly host/port after mounting routes
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Top-level await is supported in Node 18 ESM; run mount then start listening.
await mountRoutes();

// Extend request timeout for long-running AI operations (e.g. expert panel reviews)
app.use((req, res, next) => {
	req.setTimeout(300000); // 5 minutes for AI generation
	res.setTimeout(300000);
	next();
});

app.listen(PORT, HOST, () => {
	console.log(`🚀 MedPlat backend listening on ${HOST}:${PORT}`);
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

export default app;
// (paste code above)
