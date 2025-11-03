# Deploy instructions + readiness report

This PR updates CI to authenticate using the `GCP_SA_KEY` secret and makes Secret Manager operations tolerant when the service account lacks create permissions. It also contains guidance for admins to grant the required IAM roles and to trigger the deploy workflow.

---

## Agent readiness report

=====================================================
🧠 MedPlat Diagnostic & Readiness Review
=====================================================
📘 PROJECT_GUIDE.md found — master documentation loaded
📛 Note: PROJECT_GUIDE.md is protected. Do not edit it automatically; follow the policy in PROJECT_GUIDE.md for changes.

## 📚 README check
✅ README.md found
🔍 README mentions backend
🔍 README mentions frontend
🔍 README references PROJECT_GUIDE

## 📁 Checking key directories...
✅ backend/
✅ frontend/
✅ .github/workflows/

## 🔐 Validating environment variables (GitHub Secrets expected)...
❌ Missing OPENAI_API_KEY
❌ Missing GCP_PROJECT
❌ Missing GCP_SA_KEY
❌ Missing FIREBASE_SERVICE_KEY
❌ Missing VITE_API_BASE
🚨 5 required secrets missing. Configure them in GitHub → Settings → Secrets → Actions.
✅ .env.local is gitignored

## 🧱 Backend diagnostics...
✅ backend/index.js found
✅ Port binding OK
✅ Host binding OK
✅ Routes mounted

## 🧩 Backend routes...
✅ topics_api.mjs present
✅ dialog_api.mjs present
✅ gamify_api.mjs present
✅ comment_api.mjs present

## 🎨 Frontend diagnostics...
✅ CaseView.jsx present
✅ Level2CaseLogic.jsx present
✅ DialogChat.jsx present

## 🔥 Firebase configuration...
✅ Firebase client found
✅ Firebase initialized

## 🧠 OpenAI configuration...
⚠️ OpenAI API key reference missing

## 🐳 Docker & Cloud Run config...
✅ Backend Dockerfile OK
✅ Frontend Dockerfile OK

## ⚙️ GitHub Actions workflow...
✅ deploy.yml found
✅ Artifact Registry configured

=====================================================
📊 SUMMARY
=====================================================
Backend: OK
Frontend: OK
Secrets configured: 0 / 5
=====================================================

## 🧪 Local backend smoke tests (optional)
▶ Running ./test_backend_local.sh (captures health + endpoints)...
=====================================================
🧪 MedPlat Local Backend Testing
=====================================================
🔍 Checking syntax...
🔧 Installing deps (if missing)...

up to date in 432ms
🚀 Starting backend on port 8080 (background)...
STARTUP ROUTES: {
  pid: 3872,
  dir: '/workspaces/medplat/backend/routes',
  files: [
    'cases_api.mjs',
    'comment_api.mjs',
    'dialog_api.mjs',
    'gamify_api.mjs',
    'location_api.mjs',
    'topics_api.mjs'
  ]
}
DEBUG ROUTES: files in routes/: [
  'cases_api.mjs',
  'comment_api.mjs',
  'dialog_api.mjs',
  'gamify_api.mjs',
  'location_api.mjs',
  'topics_api.mjs'
]
✅ Mounted /api/location -> ./routes/location_api.mjs
⚠️ FIREBASE_SERVICE_KEY not set — Firebase not initialized (expected for local dev)
✅ Mounted /api/topics -> ./routes/topics_api.mjs
✅ Mounted /api/dialog -> ./routes/dialog_api.mjs
✅ Mounted /api/gamify -> ./routes/gamify_api.mjs
✅ Mounted /api/comment -> ./routes/comment_api.mjs
⚠️ FIREBASE_SERVICE_KEY not set — Firebase not initialized (expected for local dev)
✅ Mounted /api/cases -> ./routes/cases_api.mjs
All route import attempts finished
🚀 MedPlat backend listening on 0.0.0.0:8080
🌐 Testing health endpoint...
✅ Health OK
📡 Testing /api/topics...
✅ Topics OK
🧠 Testing /api/dialog...
✅ Dialog OK
🔥 Testing /api/gamify...
✅ Gamify OK
�� Cleaning up...
✅ Local backend tests complete
✅ Local backend smoke tests passed
🚨 Deployment NOT READY — missing secrets.
Note: Backend smoke tests passed locally despite missing secrets (local fallbacks in use).
\nNext steps:
- Configure required secrets in GitHub → Settings → Secrets → Actions before merging.
- Include agent.md in your PR description for reviewer traceability.
- Run './scripts/run_local_checks.sh' locally (it runs this script + extended checks).
