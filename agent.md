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
✅ OPENAI_API_KEY present
✅ GCP_PROJECT present
✅ GCP_SA_KEY present
✅ FIREBASE_SERVICE_KEY present
✅ VITE_API_BASE present
🎉 All required secrets configured!
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
✅ OpenAI API key integration detected

## 🐳 Docker & Cloud Run config...
✅ Backend Dockerfile OK
✅ Frontend Dockerfile OK

## ⚙️ GitHub Actions workflow...
✅ deploy.yml found
⚠️ Artifact Registry missing

=====================================================
📊 SUMMARY
=====================================================
Backend: OK
Frontend: OK
Secrets configured: 5 / 5
=====================================================

## 🧪 Local backend smoke tests (optional)
▶ Running ./test_backend_local.sh (captures health + endpoints)...
=====================================================
🧪 MedPlat Local Backend Testing
=====================================================
🔍 Checking syntax...
🔧 Installing deps (if missing)...

up to date in 405ms
🚀 Starting backend on port 8080 (background)...
STARTUP ROUTES: {
  pid: 95077,
  dir: '/workspaces/medplat/backend/routes',
  files: [
    'cases_api.mjs',
    'comment_api.mjs',
    'dialog_api.mjs',
    'evidence_api.mjs',
    'expert_panel_api.mjs',
    'external_panel_api.mjs',
    'external_panel_api_OLD_per_case.mjs',
    'external_panel_api_enhanced.mjs',
    'external_panel_api_v1_simple.mjs',
    'gamify_api.mjs',
    'guidelines_api.mjs',
    'internal_panel_api.mjs',
    'location_api.mjs',
    'panel_api.mjs',
    'panel_discussion_api.mjs',
    'quickref_api.mjs',
    'topics_api.mjs'
  ]
}
✅ Mounted /api/topics (static import)
✅ Mounted /api/panel (static import)
✅ Mounted /api/expert-panel (static import)
✅ Mounted /api/internal-panel (static import)
✅ Mounted /api/external-panel (static import)
MODULE: dialogMod keys= [ 'default' ] defaultType= function
MODULE: gamifyMod keys= [ 'default' ] defaultType= function
MODULE: commentMod keys= [ 'default' ] defaultType= function
MODULE: locationMod keys= [ 'default' ] defaultType= function
MODULE: casesMod keys= [ 'default' ] defaultType= function
MODULE: quickrefMod keys= [ 'default' ] defaultType= function
MODULE: evidenceMod keys= [ 'default' ] defaultType= function
MODULE: panelDiscussionMod keys= [ 'default' ] defaultType= function
MODULE: guidelinesMod keys= [ 'default' ] defaultType= function
🔥 Firebase initialization failed: Failed to parse private key: Error: Invalid PEM formatted message.
✅ Mounted /api/location -> ./routes/location_api.mjs
✅ Mounted /api/dialog -> ./routes/dialog_api.mjs
✅ Mounted /api/gamify -> ./routes/gamify_api.mjs
✅ Mounted /api/comment -> ./routes/comment_api.mjs
✅ Mounted /api/cases -> ./routes/cases_api.mjs
✅ Mounted /api/quickref -> ./routes/quickref_api.mjs
✅ Mounted /api/evidence -> ./routes/evidence_api.mjs
✅ Mounted /api/panel-discussion -> ./routes/panel_discussion_api.mjs
✅ Mounted /api/guidelines -> ./routes/guidelines_api.mjs
🚀 MedPlat backend listening on 0.0.0.0:8080
🔥 Firebase initialization failed: Failed to parse private key: Error: Invalid PEM formatted message.
🌐 Testing health endpoint...
✅ Health OK
📡 Testing /api/topics...
🔥 Firebase initialization failed: Failed to parse private key: Error: Invalid PEM formatted message.
✅ Topics OK
🧠 Testing /api/dialog...
✅ Dialog OK
🔥 Testing /api/gamify...
⚠️ Gamify endpoint issue
�� Cleaning up...
✅ Local backend tests complete
✅ Local backend smoke tests passed
✅ READY FOR DEPLOYMENT — All major checks passed and local backend smoke tests passed.
\nNext steps:
- Include agent.md in your PR description for reviewer traceability.
- Run './scripts/run_local_checks.sh' locally before merging (it runs this script + extended checks).
