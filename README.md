```markdown
# MedPlat — quick developer guide

Badges

- Backend tests: ![backend-tests](https://github.com/Tazaai/medplat/actions/workflows/backend-tests.yml/badge.svg)
- PR checks: ![pr-checks](https://github.com/Tazaai/medplat/actions/workflows/pr-checks.yml/badge.svg)

Overview
--------

MedPlat is a clinical case simulator and gamified MCQ platform. Development follows a local-first workflow: run the repository checks locally, fix any issues, then open a PR with `agent.md` (the output from `review_report.sh`) attached.

Quick start
-----------

1. Install deps:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

2. Run local checks (must pass before PR):

```bash
./scripts/run_local_checks.sh
```

3. Do not commit secrets or service account JSON files. Keep local secrets in `.env.local` (gitignored).

Local dev notes
---------------

- Backend: Node 18 + Express (entry: `backend/index.js`). Uses `process.env.PORT || 8080` and binds to `0.0.0.0` for Cloud Run compatibility.
- Frontend: React + Vite. Build writes `frontend/dist/VITE_API_BASE.txt` (used by CI to validate `VITE_API_BASE`).
- Firebase: `backend/firebaseClient.js` initializes firebase-admin when `FIREBASE_SERVICE_KEY` is present; otherwise it returns a noop client for local testing.
- OpenAI: `backend/openaiClient.js` uses `OPENAI_API_KEY` when present; local stub otherwise.

CI & Deployment
---------------

- CI uses GitHub Actions with the deploy workflow at `.github/workflows/deploy.yml`.
- Secrets required in GitHub: `OPENAI_API_KEY`, `GCP_PROJECT`, `GCP_SA_KEY`, `FIREBASE_SERVICE_KEY`, `VITE_API_BASE`.

Project guide & editing policy
-----------------------------

`PROJECT_GUIDE.md` is a protected system file containing architecture and deployment guidance. Do not modify automatically. To change it:

- Add the PR label `project-guide-edit` (after explicit approval), or
- Have the project lead comment `PG-approve` on the PR.

Tools & useful scripts
----------------------

- `./review_report.sh` — generates `agent.md` (diagnostic report). Include `agent.md` in PR descriptions.
- `./scripts/run_local_checks.sh` — wrapper that runs `review_report.sh` and quick backend smoke tests.
- `./scripts/ensure_workflow_dispatch.mjs` — adds `workflow_dispatch:` to workflows that use block-style `on:` mapping.
- `./scripts/dispatch_and_monitor_workflows.mjs` — helper to dispatch and monitor seed/test/delete workflows (requires `gh` authenticated with a PAT).

For full architecture and protected guidance, see `PROJECT_GUIDE.md` and `.github/copilot-instructions.md`.

```

