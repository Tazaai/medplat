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

up to date in 376ms
🚀 Starting backend on port 8080 (background)...
STARTUP ROUTES: {
  pid: 26812,
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
ℹ️ Loaded Firebase key from /tmp/firebase_key.json
✅ Firebase initialized using FIREBASE_SERVICE_KEY
✅ Mounted /api/topics -> ./routes/topics_api.mjs
✅ Mounted /api/dialog -> ./routes/dialog_api.mjs
✅ Mounted /api/gamify -> ./routes/gamify_api.mjs
✅ Mounted /api/comment -> ./routes/comment_api.mjs
ℹ️ Loaded Firebase key from /tmp/firebase_key.json
✅ Mounted /api/cases -> ./routes/cases_api.mjs
All route import attempts finished
node:events:496
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use 0.0.0.0:8080
    at Server.setupListenHandle [as _listen2] (node:net:1940:16)
    at listenInCluster (node:net:1997:12)
    at node:net:2206:7
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1976:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
  address: '0.0.0.0',
  port: 8080
}

Node.js v22.17.0
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
