# Frontend - build & run notes

This small README documents how to run and build the frontend in development and production-like modes.

Local development

1. Install dependencies:

```bash
npm install --prefix frontend
```

2. Start dev server:

```bash
npm run dev --prefix frontend
```

Production-like build (local)

Set `VITE_API_BASE` to the backend URL you want the frontend to call (e.g. your local backend at http://localhost:8080) and run the build:

```bash
VITE_API_BASE=http://localhost:8080 npm run build --prefix frontend
```

This will produce `frontend/dist/`. The build process writes `frontend/dist/VITE_API_BASE.txt` containing the value used during the build — this file is used by CI to verify the configured API base.

CI / Deploy notes

- Pull requests run a verify build in CI which enforces `VITE_API_BASE` is set for the build and checks `frontend/dist/VITE_API_BASE.txt` matches the configured value.
- The deploy workflow calculates the backend URL from Cloud Run and sets `VITE_API_BASE` before building and deploying the frontend.
