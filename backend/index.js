// backend/index.js — Express server entry (Cloud Run friendly)
// Listens on process.env.PORT || 8080 and binds to 0.0.0.0

import express from 'express';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic health endpoint
app.get('/', (req, res) => res.json({ status: 'MedPlat OK', pid: process.pid }));

// Mount known routes if present. Fail gracefully if route files missing.
(async () => {
	const routes = [
		{ path: '/api/location', file: './routes/location_api.mjs' },
		{ path: '/api/topics', file: './routes/topics_api.mjs' },
		{ path: '/api/dialog', file: './routes/dialog_api.mjs' },
		{ path: '/api/gamify', file: './routes/gamify_api.mjs' },
		{ path: '/api/comment', file: './routes/comment_api.mjs' },
		{ path: '/api/cases', file: './routes/cases_api.mjs' },
	];

	for (const r of routes) {
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
			console.warn(`⚠️ Could not mount ${r.file}: ${err.message}`);
		}
	}
})();

// Start server with Cloud Run friendly host/port
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
	console.log(`🚀 MedPlat backend listening on ${HOST}:${PORT}`);
});

export default app;
// (paste code above)
