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
async function mountRoutes() {
	const routes = [
		{ path: '/api/location', file: './routes/location_api.mjs' },
		{ path: '/api/topics', file: './routes/topics_api.mjs' },
		{ path: '/api/dialog', file: './routes/dialog_api.mjs' },
		{ path: '/api/gamify', file: './routes/gamify_api.mjs' },
		{ path: '/api/comment', file: './routes/comment_api.mjs' },
		{ path: '/api/cases', file: './routes/cases_api.mjs' },
	];

	// Debug: list route files present in the routes directory
	try {
		const routeDir = path.join(__dirname, 'routes');
		const files = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : [];
		console.log('DEBUG ROUTES: files in routes/:', files);
	} catch (e) {
		console.warn('DEBUG ROUTES: could not list routes folder:', e && e.message ? e.message : e);
	}

	for (const r of routes) {
		// For better debugging in Cloud Run, check the file exists before importing
		const fullPath = path.join(__dirname, r.file);
		if (!fs.existsSync(fullPath)) {
			console.warn(`⚠️ Route file not found: ${fullPath}`);
			continue;
		}
		try {
			// dynamic import of ESM route modules
			// route modules should export a default function or an express.Router
			// For compatibility accept both: factory function or router object
			// eslint-disable-next-line no-await-in-loop
			const mod = await import(r.file);
			let router = mod.default;
			if (typeof router === 'function') router = router();
			if (router && router.stack) {
				app.use(r.path, router);
				console.log(`✅ Mounted ${r.path} -> ${r.file}`);
			} else {
				console.warn(`⚠️ Route ${r.file} did not export an express router`);
			}
		} catch (err) {
			console.error(`❌ Could not mount ${r.file}:`, err && err.stack ? err.stack : err);
		}
	}
}

// Start server with Cloud Run friendly host/port
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure routes are mounted before the server starts listening
mountRoutes()
	.then(() => {
		console.log('All route import attempts finished');
		app.listen(PORT, HOST, () => {
			console.log(`🚀 MedPlat backend listening on ${HOST}:${PORT}`);
		});
	})
	.catch((e) => {
		console.error('Route mounting failed:', e && e.stack ? e.stack : e);
		// Start the server even if mounting fails so the service remains available for diagnostics
		app.listen(PORT, HOST, () => {
			console.log(`🚀 MedPlat backend listening (with mount errors) on ${HOST}:${PORT}`);
		});
	});

// Temporary debug endpoint to list mounted routes (useful in Cloud Run)
app.get('/debug/routes', (req, res) => {
	try {
		const stack = app._router && app._router.stack ? app._router.stack : [];
		const routes = stack
			.filter((r) => r && r.route)
			.map((r) => Object.keys(r.route.methods).map((m) => `${m.toUpperCase()} ${r.route.path}`))
			.flat();

		// Also include mounted middleware/router entries for deeper debugging
		const middleware = stack
			.filter((r) => r && r.name === 'router')
			.map((r) => {
				return {
					name: r.name,
					regexp: r.regexp && r.regexp.source ? r.regexp.source : null,
					// show first layer path if possible
					paths: r.handle && r.handle.stack ? r.handle.stack.filter(l => l && l.route).map(l => l.route && l.route.path) : undefined,
				};
			});

		return res.json({ routes, middleware });
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

export default app;
// (paste code above)
