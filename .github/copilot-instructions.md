## Copilot / AI Agent Instructions — MedPlat (concise)

Purpose: Short, actionable guidance for automated agents and reviewers working on MedPlat.

1) Big picture (one-liner)
- Backend: Node 18 + Express (entry: `backend/index.js`) — dynamic ESM route imports, Cloud Run friendly.
- Frontend: React + Vite in `frontend/` (components under `frontend/src/components/`).
- CI/CD: `.github/workflows/deploy.yml` builds containers, pushes to Artifact Registry and deploys to Cloud Run.

2) First files to inspect
- `PROJECT_GUIDE.md` — authoritative architecture and secret lists (do not edit automatically).
- `backend/index.js` — dynamic import pattern for `backend/routes/*.mjs` and host/port contract (PORT, 0.0.0.0).
- `backend/routes/*` — route modules (e.g. `topics_api.mjs`, `dialog_api.mjs`, `gamify_api.mjs`).
- `review_report.sh` and `test_backend_local.sh` — required local checks; produce `agent.md` and basic diagnostics.

3) Secrets & env (explicit)
- Required secrets (GH Actions): `OPENAI_API_KEY`, `GCP_PROJECT`, `GCP_SA_KEY`, `FIREBASE_SERVICE_KEY`, `VITE_API_BASE`.
- CI uses Secret Manager instead of embedding JSON credentials in files; do NOT commit service account JSONs.

4) Agent contract (how to change safely)
- Make small, focused PRs. Prefer stubs + tests over partial feature implementations.
- Always run `bash review_report.sh` first; it writes `agent.md`. Include `agent.md` output in your PR description.
- Run `bash test_backend_local.sh` to sanity-check the backend locally (health and key endpoints).

5) Repo-specific patterns & examples
- Dynamic ESM route loading: `backend/index.js` dynamically imports `backend/routes/*.mjs`; route modules should export an Express Router or factory function.
- Frontend expects `VITE_API_BASE` at build time (used by `frontend/src/config.js` / components).
- Local-first workflow: failing local checks block deployability.

6) Quick commands (copyable)
```bash
# diagnostic (creates agent.md)
bash review_report.sh
# local backend smoke tests
bash test_backend_local.sh
# build frontend
npm install --prefix frontend && npm run --prefix frontend build
```

7) Safety notes
- Never write production secrets to repo files. Use GH Secrets + Secret Manager as in CI.
- If a script (review/test) references a missing file, create a minimal stub with a TODO and tests rather than a full implementation.

8) Where to add tests
- Add lightweight route/unit tests under `backend/test/` near the implementation. Keep runs fast and deterministic.

If anything here is unclear or you want more examples (route stub template, test runner setup), tell me which area and I will expand it.

Last updated: October 29, 2025

## MANDATORY PROCESS — do NOT skip
These steps are required for every change that touches backend, CI/CD, or deployment-related code. Automated agents, reviewers, and developers must follow them exactly.

1. Run diagnostics and smoke tests locally
   - Execute `./scripts/run_local_checks.sh` (or `node ./scripts/run_with_env.js .env.local` if you have multiline JSON secrets). This runs `review_report.sh` (writes `agent.md`) and `test_backend_local.sh` (backend smoke tests).
2. Do not commit secrets
   - Never add API keys, service account JSONs, or `.env.local` to the repo. Confirm `.env.local` is in `.gitignore`.
3. Use Secret Manager in CI/CD
   - CI must use GitHub Actions secrets + Secret Manager. Do not change the workflow to inline JSON credentials or plain env values.
4. Add safe fallbacks and small stubs
   - If a referenced integration (Firebase, OpenAI) is missing in local dev, add a minimal non-breaking stub or graceful fallback (log a warning, return safe defaults). See `backend/firebaseClient.js` for the lightweight shim pattern — prefer non-throwing behavior.
5. Tests and PR contents
   - Include `agent.md` output in PR description (copy from `review_report.sh`).
   - Add or update unit/integration tests under `backend/test/` when adding or changing route behavior. Keep tests fast and deterministic.
6. Permanent solutions and automation
   - Prefer permanent fixes over quick hacks. Examples of permanent actions we require:
     - Add robust Firebase initialization with clear error handling and a no-op fallback for local dev.
     - Ensure CI workflow continues to use Secret Manager and validates presence of required secrets before deploy.
     - Use `scripts/run_with_env.js` (already added) for safe local execution with multiline secrets.

Any PR that does not follow this mandatory process will be returned for remediation. If you need an exception, open an issue describing the exception and get an explicit approver.
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
