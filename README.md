```markdown
# MedPlat — quick developer guide

Badges

- Backend tests: ![backend-tests](https://github.com/Tazaai/medplat/actions/workflows/backend-tests.yml/badge.svg)
- PR checks: ![pr-checks](https://github.com/Tazaai/medplat/actions/workflows/pr-checks.yml/badge.svg)

Overview
--------

MedPlat is a clinical case simulator and gamified MCQ platform. Development follows a local-first workflow: run the repository checks locally, fix any issues, then open a PR with `agent.md` (the output from `review_report.sh`) attached.

## ✨ Key Features

### 1. Clinical Case Generation
- **1115 Medical Topics** across 30 specialties (Cardiology, Neurology, Emergency Medicine, etc.)
- **AI-Powered Cases** using GPT-4o/4o-mini
- **Universal Dynamic Generation**: Cases include reasoning chains, red flag hierarchies, pathophysiology layers, exam pearls, next-best-step algorithms, and more
- **Guideline Cascade System**: Priority order: Local → National → Continental → USA → Global (WHO)
- **LMIC Fallback**: Low- and Middle-Income Country alternatives provided when standard resources unavailable
- **Region-Adaptive**: Guidelines for Denmark, US, UK, Germany, WHO (global)
- **Multilingual**: English, Danish, Farsi, Arabic, Urdu, Spanish, German, + custom
- **Global Development Framework**: All cases reviewed by universal improvement system

### 2. Gamified Learning (12-MCQ System)
- Adaptive difficulty based on performance
- 3-point scoring (Expert/Specialist/Doctor/Medical Student levels)
- Delayed explanations to prevent answer-peeking
- Firebase score persistence for progress tracking
- Performance analytics and encouragement messages

### 3. Expert Panel Review (NEW)
- **12 Simulated Expert Roles**:
  - Medical Student, Doctor, 3 Specialists
  - 2 Generalists, 2 EM Specialists
  - Field Researcher, Professor, USMLE Expert
  - AI/Coding Expert, Web Developer, Competitor Voice
- **Global Feedback**: Reviews apply to all specialties (not hardcoded)
- **Scalability Focus**: Highlights dynamic improvements to case generator
- **GPT-4o Powered**: High-quality multi-perspective analysis

### 4. Interactive Diagnosis Workflow
- Topic/Area selection with category filtering
- Real-time AI chat for case discussion
- PDF export and clipboard copy
- Analytics dashboard for quiz performance

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

## 🏗️ Universal Case Generation Architecture

MedPlat uses a **universal dynamic case generation system** that produces comprehensive clinical cases with the following features:

### Universal Schema Fields

All generated cases include these dynamic fields (when available):
- **reasoning_chain**: Stepwise diagnostic reasoning
- **red_flag_hierarchy**: Critical/Important/Rare-dangerous flag categorization
- **pathophysiology**: Organ-level, cellular, and variant pathophysiology
- **pathophysiology_detail**: Cellular/molecular mechanisms, organ microanatomy, mechanistic links
- **mapped_guideline_tiers**: Local, national, continental, USA, and global guidelines
- **exam_pearls**: Clinical examination insights
- **exam_pitfalls**: Common examination mistakes
- **next_best_step_algorithms**: Decision trees for diagnostic steps
- **LMIC fallback**: Low-resource alternatives for resource-limited settings
- **dynamic_diagnostic_evidence**: Sensitivity, specificity, PPV, NPV, likelihood ratios

### Guideline Priority Cascade

MedPlat follows a strict guideline priority hierarchy:

1. **Local Guidelines** (Highest Priority) - Institutional or regional guidelines
2. **National Guidelines** - Country-specific guidelines
3. **Continental Guidelines** - Regional/continental guidelines
4. **USA Guidelines** - US-specific guidelines
5. **Global Guidelines (WHO)** (Fallback) - International/WHO guidelines

The frontend displays guidelines in this priority order, clearly indicating which tier each guideline belongs to.

### LMIC Fallback System

When standard resources are unavailable, MedPlat provides **Low- and Middle-Income Country (LMIC) alternatives**. These are clearly marked with an "LMIC FALLBACK" badge in the UI and include:
- Resource-appropriate diagnostic alternatives
- Cost-effective treatment options
- Simplified management protocols suitable for limited-resource settings

### Global Development Framework

All cases are reviewed by the **Global Development Framework**, which ensures:
- Universal field completeness
- Specialist-level reasoning standards
- Region-appropriate guideline application
- LMIC fallback availability when needed

This framework operates independently of backend internal panel systems and focuses on universal improvements applicable across all specialties.

### Frontend Display

The frontend (`UniversalCaseDisplay.jsx`) gracefully handles missing fields:
- Missing fields show "Not provided" placeholders instead of crashing
- All universal fields are conditionally rendered only when present
- Guideline cascade is visually displayed with priority indicators
- LMIC fallback sections are clearly marked with badges
- Global Development Framework review badge appears on all cases

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

Local dev via PM2 (optional)
---------------------------

If you prefer process supervision with auto-restart during active development, you can use PM2 at the repo root:

1. Install pm2 (project-local):

```bash
npm install --prefix . pm2 --save-dev
```

2. Start the PM2-managed dev processes (backend + frontend):

```bash
npm run dev:background   # starts PM2-managed backend and frontend
# or for foreground (no-daemon): npm run dev:start
```

3. Stop PM2-managed processes:

```bash
npm run dev:stop
```

PM2 is lightweight and useful for auto-restart and log aggregation; the repository includes `ecosystem.config.js` and top-level npm scripts to simplify this.

Hot-reload (nodemon) for backend
--------------------------------

The PM2 ecosystem is configured to run the backend via `nodemon` so changes to server code auto-restart during development.

To use hot-reload:

```bash
# ensure dev deps are installed
npm ci --prefix .

# start PM2-managed apps in background
npm run dev:background

# or start foreground for debugging
npm run dev:start
```

The backend will be run with `nodemon backend/index.js` (configured in `package.json`) so file edits restart the server automatically.

-For full architecture and protected guidance, see `PROJECT_GUIDE.md` and `.github/copilot-instructions.md`.

Dev helper: `scripts/dev_up.sh`
--------------------------------

Run both backend and frontend locally and verify connectivity with the smoke-check.

Example (non-interactive):

```bash
bash scripts/dev_up.sh --yes
```

This will start the backend on `$PORT` (default 8080), start the frontend with `VITE_API_BASE=http://localhost:$PORT`, run the connectivity check, and write a timestamped log under `logs/` (e.g. `logs/dev_up_YYYYMMDD_HHMMSS.log`).

Quick note: topics and local Firebase key
---------------------------------------

If you see the frontend reporting "Topics count: 0":

- Verify the backend is able to initialize Firebase. The backend uses `FIREBASE_SERVICE_KEY` (env) or `/tmp/firebase_key.json` in CI. For local dev the code now also attempts to load `keys/serviceAccountKey.json` from the repo (local convenience only).
- The topics API reads from the `topics2` collection by default; you can override with `TOPICS_COLLECTION` if needed.
- A lightweight integration test was added at `backend/test/test_topics_get.cjs` to assert GET `/api/topics` returns `{ ok: true, topics: [] }` and this will run in local checks.

If production deploys fail, make sure GitHub Secrets include `FIREBASE_SERVICE_KEY` and that the CI principal has the necessary GCP IAM roles (Cloud Build, Artifact Registry, Cloud Run, Secret Manager).

```

