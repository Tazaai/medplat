# Project Guide — Frontend notes

## Auto-detecting Backend URL (Codespaces & Local)

The frontend automatically tries to detect the best backend URL when running in development environments.

- If `VITE_API_BASE` is provided (via CI or build-time injection), that value is used.
- When running inside a GitHub Codespace browser preview (hostnames ending with `.app.github.dev`), the frontend will replace the dev server port `:5173` with the backend port `:8080` on the same origin, so that `/api` calls are proxied correctly through the Codespaces public URL.
- Locally (development mode) the frontend falls back to `http://localhost:8080`.

Manual override example:

```bash
VITE_API_BASE=$(gp url 8080) npm --prefix frontend run dev
```

This behaviour is implemented in `frontend/src/config.js` and helps avoid cross-host issues when using the Codespaces web preview. If you want to support other preview environments (e.g., Gitpod), add a similar hostname rule to the config.
