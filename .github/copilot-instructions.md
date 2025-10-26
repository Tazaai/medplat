# Copilot / AI Agent Instructions — MedPlat

Purpose: Give an AI coding agent the focused, actionable context needed to be productive in the MedPlat repository.

Keep this short and specific — the agent should be able to open relevant files and start making safe, small changes.

1. Big picture (what this repo is):
   - Backend: Node 18 (Express) handling AI-driven case generation and gamification. Entry: `backend/index.js`.
   - Frontend: React (Vite) UI in `frontend/` with key components under `frontend/src/components/` (e.g. `CaseView.jsx`, `Level2CaseLogic.jsx`).
   - CI/CD: GitHub Actions deploy workflow at `.github/workflows/deploy.yml` builds images, uses Artifact Registry and deploys to Cloud Run.
   - Secrets: GitHub Actions secrets are used for runtime keys; workflow provisions Secret Manager secrets (`medplat-openai-key`, `medplat-firebase-key`). See `PROJECT_GUIDE.md`.

2. Where to look first (quick file map):
   - `PROJECT_GUIDE.md` — single-source architecture & workflow doc. Read this before changing CI.
   - `backend/index.js` — server startup, middleware, route mounting, port binding.
   - `backend/routes/` — route modules (topic/gamify/dialog/comment). Use these for API behavior and tests.
   - `frontend/src/components/` — UI logic including gamification flow (`Level2CaseLogic.jsx`) and topic selection (`CaseView.jsx`).
   - `review_report.sh`, `test_backend_local.sh` — developer readiness checks and local tests; run these locally when making changes.
   - `.github/workflows/deploy.yml` — CI validation, build, Secret Manager usage and Cloud Run deployment steps.

3. Agent contract (how to make changes safely):
   - Small, isolated PRs only. For backend changes prefer adding route stubs or tests first.
   - Always run the local checks before suggesting a deploy change: `bash review_report.sh` and `bash test_backend_local.sh` (they generate `agent.md` and test logs).
   - Never write secrets into files. Use GitHub Secrets or the workflow pattern that stores secrets in Secret Manager and uses `--set-secrets` when deploying.

4. Project-specific conventions & patterns
   - Local-first workflow: edits must pass local checks (`review_report.sh`) before a PR is considered deployable. The README/PROJECT_GUIDE emphasize this.
   - Secrets pattern: do not embed JSON service account keys in `--set-env-vars`. The workflow creates/updates Secret Manager entries and uses `--set-secrets`.
   - Port binding: Cloud Run expects the server to use `process.env.PORT || 8080` and listen on `0.0.0.0` — check `backend/index.js` for this pattern.
   - Frontend expects `VITE_API_BASE` at build time (injected by workflow or set in local env). Use this env var for API URLs.

5. Typical tasks + concrete commands (examples)
   - Run local readiness report: `bash review_report.sh` (writes `agent.md`).
   - Run backend tests: `bash test_backend_local.sh` (starts server locally and calls endpoints). Inspect `/tmp/test_backend_local.log` on failures.
   - Generate backend env from environment (if present): `bash scripts/generate_backend_env.sh` (if present in repo).
   - Build & test frontend locally: `npm install --prefix frontend && npm run --prefix frontend build`.

6. Integration points & external dependencies
   - OpenAI API: referenced by `backend/*` code. Use `OPENAI_API_KEY` secret.
   - Firebase: topics stored in Firestore (`topics2`) — backend uses `FIREBASE_SERVICE_KEY` service account JSON (kept in Secret Manager in CI).
   - Google Cloud: Artifact Registry `europe-west1-docker.pkg.dev/$GCP_PROJECT/medplat` and Cloud Run in `europe-west1`.

7. Safety & change guidance for agents
   - If a missing file or route is referenced by `review_report.sh`, create a minimal stub with clear TODO comments rather than full implementation.
   - When modifying `.github/workflows/deploy.yml`, preserve the Secret Manager approach and secret validation step; prefer using `env:` mapping for secret validation (see workflow for example).
   - Avoid formatting changes unrelated to the task. Keep diffs focused.

8. Where to add tests and examples
   - Add route unit tests next to route implementations (suggest `backend/test/` with small mocha/jest scripts). Keep tests lightweight and fast.

9. If you need clarification (ask the human):
   - Which Cloud project (`GCP_PROJECT`) to use when creating secrets.
   - If you should implement full AI logic or only stubs for a route during initial PR.

Keep this document tight. After applying a change, run `bash review_report.sh` and paste `agent.md` into the PR description so reviewers can quickly verify readiness.

---
Last updated: October 26, 2025
