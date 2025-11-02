## Copilot / AI Agent Instructions — MedPlat (concise)

Purpose: Short, actionable guidance for automated agents and reviewers working on MedPlat.

### Topics Protection — Copilot Prompt

The backend route `backend/routes/topics_api.mjs` must remain strictly read-only. Add this prompt block to guide Copilot and automated agents when editing backend code.

```
Context: The backend route `backend/routes/topics_api.mjs` must remain strictly read-only. It reads topics from Firestore collection `topics2` and must never perform writes (add/set/update/delete).

Objectives:
- Only GET endpoints for topics (e.g., `/api/topics`, `/api/topics/search`).
- Read data from Firestore `topics2` only. No writes.
- Return JSON with shape: `{ ok: true, topics }`.

Behavior rules for Copilot/agents:
1. Never generate Firestore writes inside `topics_api.mjs`.
2. Implement new routes under `routes/` as `express.Router()` modules.
3. Use GET for read endpoints; avoid POST for search/filtering.
4. Add a read-only guard: `router.all('/', (req,res,next)=>{ if(req.method!=='GET') return res.status(405)... })`.
5. Keep CI checks that fail on `add|set|update|delete` verbs in `backend/routes/topics_api.mjs`.

Copilot prompt (copy/paste when coding):
"In MedPlat, ensure `topics_api.mjs` remains read-only. Only GET endpoints allowed. Do not write to Firestore `topics2`. Add a 405 guard for non-GET methods and keep CI checks to block write verbs. Return `{ ok:true, topics }` and follow project routing style."
```

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

**MedPlat** is an AI-driven medical case simulator and gamified learning platform for clinicians and students. It generates realistic cases, adaptive MCQs, and expert-panel reasoning using GPT-4o/mini.

## 🎯 Architecture Quick Reference

**Backend** (Node 18 + Express)
- Entry: `backend/index.js` — dynamic ESM route mounting, Cloud Run friendly (`PORT=8080`, `HOST=0.0.0.0`)
- Routes: `backend/routes/{topics_api,dialog_api,gamify_api,comment_api}.mjs`
- Integration: Firebase Admin SDK (`topics2` collection), OpenAI API (case generation + MCQs)
- Deployment: Cloud Run container (`europe-west1`)

**Frontend** (React + Vite + Tailwind)
- Entry: `frontend/src/main.jsx` → `App.jsx`
- Key components: `CaseView.jsx` (topic/model selector), `Level2CaseLogic.jsx` (MCQ logic + scoring), `DialogChat.jsx` (AI chat)
- Build-time env: `VITE_API_BASE` (backend URL injected by workflow)

**CI/CD** (GitHub Actions)
- Workflow: `.github/workflows/deploy.yml`
- Secret validation → Artifact Registry build → Secret Manager provisioning → Cloud Run deploy
- Required secrets: `OPENAI_API_KEY`, `GCP_PROJECT`, `GCP_SA_KEY`, `FIREBASE_SERVICE_KEY`

## 🧰 Essential Files to Read First

| File | Purpose |
|------|---------|
| `PROJECT_GUIDE.md` | Master architecture doc — read before CI/CD changes |
| `backend/index.js` | Server startup, route mounting pattern, port/host binding |
| `backend/routes/*.mjs` | API endpoints: topics, dialog, gamify, comment |
| `frontend/src/components/Level2CaseLogic.jsx` | Gamification MCQ flow (12 questions, delayed explanations) |
| `review_report.sh` | Local readiness validator (outputs `agent.md`) |
| `test_backend_local.sh` | Backend integration tests (health, topics, dialog, gamify) |

## 🔐 Secret Management Pattern

- **Never** embed secrets in files or `--set-env-vars`
- GitHub Secrets → Secret Manager → Cloud Run `--set-secrets`
- Workflow creates/updates `medplat-openai-key` and `medplat-firebase-key` in Secret Manager
- Local dev: use `.env.local` (gitignored)

## 🧪 Local-First Workflow (Mandatory)

**Before any PR or deploy:**
```bash
bash review_report.sh         # Generates agent.md with diagnostics
bash test_backend_local.sh    # Runs backend integration tests
```

**Backend local dev:**
```bash
cd backend && npm install
PORT=8080 node index.js
```

**Frontend local dev:**
```bash
cd frontend && npm install
VITE_API_BASE=http://localhost:8080 npm run dev
```

## 📐 Project-Specific Conventions

1. **Port binding**: `process.env.PORT || 8080` + `0.0.0.0` (Cloud Run requirement)
2. **Route mounting**: Dynamic ESM imports in `backend/index.js` with graceful failure
3. **Gamification**: 12 MCQs per case, expert explanations delayed until review mode
4. **Localization**: AI-driven multilingual output (no translation files)
5. **Small PRs**: Prefer route stubs with TODO comments over full implementations initially

## 🚨 Safety Guidelines

- Run `review_report.sh` after every change — paste `agent.md` in PR description
- Preserve Secret Manager pattern when editing `.github/workflows/deploy.yml`
- Keep diffs focused — avoid unrelated formatting changes
- For missing routes: create minimal stub with clear TODO, not full AI logic
- Test locally before pushing — `test_backend_local.sh` must pass

## 📡 Integration Points

- **OpenAI**: GPT-4o/mini for case generation and MCQ creation
- **Firebase**: Firestore `topics2` collection for medical topics
- **Google Cloud**: Artifact Registry (`europe-west1-docker.pkg.dev/$GCP_PROJECT/medplat`) + Cloud Run (`europe-west1`)

## 🧩 Common Tasks

| Task | Command |
|------|---------|
| Validate readiness | `bash review_report.sh` |
| Test backend locally | `bash test_backend_local.sh` |
| Build frontend | `npm install --prefix frontend && npm run --prefix frontend build` |
| Check syntax | `node --check backend/index.js` |

---
*Last updated: October 29, 2025 — Generated from PROJECT_GUIDE.md*
