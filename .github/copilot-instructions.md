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
