// backend/index.js — Express server entry (Cloud Run friendly)
// Listens on process.env.PORT || 8080 and binds to 0.0.0.0

import express from 'express';
import path from 'path';
import url from 'url';
import fs from 'fs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

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
// For reliability explicitly import and mount known route modules.
// This avoids subtle timing/dynamic import issues in some container runtimes.
function normalizeRouter(mod) {
	let router = mod && (mod.default || mod);
	if (typeof router === 'function') router = router();
	return router && router.stack ? router : null;
}

try {
	// Import route modules explicitly
	// If you add new route files, import and mount them here.
	import topicsMod from './routes/topics_api.mjs';
	import dialogMod from './routes/dialog_api.mjs';
	import gamifyMod from './routes/gamify_api.mjs';
	import commentMod from './routes/comment_api.mjs';
	import locationMod from './routes/location_api.mjs';
	import casesMod from './routes/cases_api.mjs';

	const topicsRouter = normalizeRouter(topicsMod);
	const dialogRouter = normalizeRouter(dialogMod);
	const gamifyRouter = normalizeRouter(gamifyMod);
	const commentRouter = normalizeRouter(commentMod);
	const locationRouter = normalizeRouter(locationMod);
	const casesRouter = normalizeRouter(casesMod);

	if (locationRouter) {
		app.use('/api/location', locationRouter);
		console.log('✅ Mounted /api/location');
	}
	if (topicsRouter) {
		app.use('/api/topics', topicsRouter);
		console.log('✅ Mounted /api/topics');
	} else {
		console.warn('⚠️ /api/topics route not mounted (topics_api.mjs missing or invalid export)');
	}
	if (dialogRouter) {
		app.use('/api/dialog', dialogRouter);
		console.log('✅ Mounted /api/dialog');
	}
	if (gamifyRouter) {
		app.use('/api/gamify', gamifyRouter);
		console.log('✅ Mounted /api/gamify');
	}
	if (commentRouter) {
		app.use('/api/comment', commentRouter);
		console.log('✅ Mounted /api/comment');
	}
	if (casesRouter) {
		app.use('/api/cases', casesRouter);
		console.log('✅ Mounted /api/cases');
	}
} catch (err) {
	console.error('Route import failed:', err && err.stack ? err.stack : err);
	// continue — server can still run for diagnostics
}

// Start server with Cloud Run friendly host/port
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Start listening immediately — routes have been mounted above (explicit imports)
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
