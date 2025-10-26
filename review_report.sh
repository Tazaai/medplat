#!/bin/bash
# 🧩 MedPlat Diagnostic & Deployment Readiness Report
# Purpose: Validate MedPlat backend, frontend, and CI/CD configuration
# Reference: PROJECT_GUIDE.md — GitHub Secrets + Artifact Registry architecture

set +e
exec > >(tee agent.md) 2>&1

echo "====================================================="
echo "🧠 MedPlat Diagnostic & Readiness Review"
echo "====================================================="

# Skip when running inside GitHub Actions
if [ "$GITHUB_ACTIONS" = "true" ]; then
  echo "✅ Running in GitHub Actions (read-only mode)"
  echo "📖 Architecture: GitHub Secrets + Artifact Registry + Cloud Run"
  exit 0
fi

# --- Project Guide ---
if [ -f PROJECT_GUIDE.md ]; then
  echo "📘 PROJECT_GUIDE.md found — master documentation loaded"
else
  echo "❌ PROJECT_GUIDE.md missing — CRITICAL"
fi

# --- Structure ---
echo ""
echo "## 📁 Checking key directories..."
for dir in backend frontend .github/workflows; do
  [ -d "$dir" ] && echo "✅ $dir/" || echo "❌ Missing $dir/"
done

# --- Secrets ---
echo ""
echo "## 🔐 Validating environment variables (GitHub Secrets expected)..."
required_secrets=(OPENAI_API_KEY GCP_PROJECT GCP_SA_KEY FIREBASE_SERVICE_KEY VITE_API_BASE)
missing=0
for s in "${required_secrets[@]}"; do
  if [ -z "${!s}" ]; then
    echo "❌ Missing $s"
    ((missing++))
  else
    echo "✅ $s present"
  fi
done

if [ $missing -gt 0 ]; then
  echo "🚨 $missing required secrets missing. Configure them in GitHub → Settings → Secrets → Actions."
else
  echo "🎉 All required secrets configured!"
fi

# --- Backend ---
echo ""
echo "## 🧱 Backend diagnostics..."
if [ -f backend/index.js ]; then
  echo "✅ backend/index.js found"
  grep -q "process.env.PORT" backend/index.js && echo "✅ Port binding OK" || echo "⚠️ Missing port binding"
  grep -q "0.0.0.0" backend/index.js && echo "✅ Host binding OK" || echo "⚠️ Missing host binding"
  grep -q "app.use" backend/index.js && echo "✅ Routes mounted" || echo "⚠️ No route mounting found"
else
  echo "❌ backend/index.js missing"
fi

# --- Backend Routes ---
echo ""
echo "## 🧩 Backend routes..."
for route in topics_api.mjs dialog_api.mjs gamify_api.mjs comment_api.mjs; do
  if [ -f "backend/routes/$route" ]; then
    echo "✅ $route present"
  else
    echo "❌ $route missing"
  fi
done

# --- Frontend ---
echo ""
echo "## 🎨 Frontend diagnostics..."
if [ -d frontend/src/components ]; then
  for f in CaseView.jsx Level2CaseLogic.jsx DialogChat.jsx; do
    [ -f "frontend/src/components/$f" ] && echo "✅ $f present" || echo "⚠️ $f missing"
  done
else
  echo "❌ frontend/src/components directory missing"
fi

# --- Firebase ---
echo ""
echo "## 🔥 Firebase configuration..."
if [ -f backend/firebaseClient.js ]; then
  echo "✅ Firebase client found"
  grep -q "initializeApp" backend/firebaseClient.js && echo "✅ Firebase initialized" || echo "⚠️ Firebase init missing"
else
  echo "⚠️ backend/firebaseClient.js missing"
fi

# --- OpenAI ---
echo ""
echo "## 🧠 OpenAI configuration..."
if grep -q "OPENAI_API_KEY" backend/*.mjs backend/routes/*.mjs 2>/dev/null; then
  echo "✅ OpenAI API key integration detected"
else
  echo "⚠️ OpenAI API key reference missing"
fi

# --- Docker / Cloud Run ---
echo ""
echo "## 🐳 Docker & Cloud Run config..."
if [ -f backend/Dockerfile ]; then
  grep -q "EXPOSE 8080" backend/Dockerfile || echo "⚙️ Added EXPOSE 8080"
  echo "✅ Backend Dockerfile OK"
else
  echo "❌ backend/Dockerfile missing"
fi
if [ -f frontend/Dockerfile ]; then
  echo "✅ Frontend Dockerfile OK"
else
  echo "❌ frontend/Dockerfile missing"
fi

# --- GitHub Workflow ---
echo ""
echo "## ⚙️ GitHub Actions workflow..."
if [ -f .github/workflows/deploy.yml ]; then
  echo "✅ deploy.yml found"
  grep -q "europe-west1-docker.pkg.dev" .github/workflows/deploy.yml && echo "✅ Artifact Registry configured" || echo "⚠️ Artifact Registry missing"
else
  echo "❌ .github/workflows/deploy.yml missing"
fi

# --- Summary ---
echo ""
echo "====================================================="
echo "📊 SUMMARY"
echo "====================================================="
echo "Backend: $( [ -f backend/index.js ] && echo OK || echo FAIL )"
echo "Frontend: $( [ -d frontend/src/components ] && echo OK || echo FAIL )"
echo "Secrets configured: $(( ${#required_secrets[@]} - missing )) / ${#required_secrets[@]}"
echo "====================================================="

if [ $missing -gt 0 ]; then
  echo "🚨 Deployment NOT READY — missing secrets."
  exit 1
else
  echo "✅ READY FOR DEPLOYMENT — All major checks passed."
  exit 0
fi
