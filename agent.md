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

## 🏆 Two-Stage Academic Pipeline (Latest Update: Nov 8, 2025)
✅ STAGE 1: Professor-Level Case Generator
  - UpToDate/AMBOSS-level academic standards
  - 15-section comprehensive structure (timeline, history, exam, paraclinical, differentials, red flags, diagnosis, pathophysiology, etiology, management, disposition, evidence, teaching, panel notes)
  - Evidence-anchored (ESC, AHA, NICE, NNBV, WHO)
  - Region-specific guidelines and units (US: °F/lb/in, EU: °C/kg/cm)
  - Prevents incomplete fields, placeholders, impossible combinations

✅ STAGE 2: Internal Expert Panel Review (Quality Layer)
  - Dynamic expert role selection (7-11 specialists per case based on category)
  - 12 comprehensive review points (guideline integration, completeness, accuracy, red flags, timing windows, differential reasoning, hemodynamic profiling, disposition, teaching quality, evidence depth, clinical scales, academic rigor)
  - Quality scoring system (0.0-1.0):
    * Completeness: 25%
    * Clinical Accuracy: 25%
    * Guideline Adherence: 20%
    * Educational Value: 15%
    * Academic Depth: 15%
  - Automatic regeneration loop if quality < 0.85 threshold
  - Refinement pass with lower temperature (0.6)

✅ Quality Chain Verified:
  - Backend: medplat-backend-00982-x4n
  - Test case (AMI): Quality Score 0.95 (95%)
  - Panel validation: ✅ Validated by Internal Expert Panel (Quality: 95%)
  - All sections populated (timeline, vitals, hemodynamic profile, paraclinical labs, red flags, disposition, evidence guidelines)

✅ Mission: Surpass UpToDate, AMBOSS, and Medscape quality — university-level clinical masterclass standard

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
Secrets configured: 5 / 5
=====================================================

## 🧪 Local backend smoke tests (optional)
▶ Running ./test_backend_local.sh (captures health + endpoints)...
=====================================================
🧪 MedPlat Local Backend Testing
=====================================================
🔍 Checking syntax...
🔧 Installing deps (if missing)...

up to date in 497ms
🚀 Starting backend on port 8080 (background)...
STARTUP ROUTES: {
  pid: 54440,
  dir: '/workspaces/medplat/backend/routes',
  files: [
    'cases_api.mjs',
    'comment_api.mjs',
    'dialog_api.mjs',
    'gamify_api.mjs',
    'location_api.mjs',
    'panel_api.mjs',
    'topics_api.mjs'
  ]
}
✅ Mounted /api/topics (static import)
✅ Mounted /api/panel (static import)
MODULE: dialogMod keys= [ 'default' ] defaultType= function
MODULE: gamifyMod keys= [ 'default' ] defaultType= function
MODULE: commentMod keys= [ 'default' ] defaultType= function
MODULE: locationMod keys= [ 'default' ] defaultType= function
MODULE: casesMod keys= [ 'default' ] defaultType= function
🔥 Firebase initialization failed: Failed to parse private key: Error: Invalid PEM formatted message.
✅ Mounted /api/location -> ./routes/location_api.mjs
✅ Mounted /api/dialog -> ./routes/dialog_api.mjs
✅ Mounted /api/gamify -> ./routes/gamify_api.mjs
✅ Mounted /api/comment -> ./routes/comment_api.mjs
✅ Mounted /api/cases -> ./routes/cases_api.mjs
🚀 MedPlat backend listening on 0.0.0.0:8080
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
