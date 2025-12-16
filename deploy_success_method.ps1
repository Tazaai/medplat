# MedPlat Deployment - Using Success Method (Same as 10 hours ago)
# This follows the exact pattern from deploy_expert_panel.sh and DEPLOYMENT_STANDARD.md

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 MedPlat Deployment (Success Method)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$GCP_PROJECT = "medplat-458911"
$REGION = "europe-west1"
$BACKEND_URL = "https://medplat-backend-139218747785.europe-west1.run.app"

# --- STEP 1: BUILD BACKEND CONTAINER IMAGE ---
Write-Host "🔨 Step 1/4: Building backend Docker image..." -ForegroundColor Yellow
Write-Host "This will show build progress..." -ForegroundColor Gray
cd backend

gcloud builds submit --tag gcr.io/$GCP_PROJECT/medplat-backend:latest . --project $GCP_PROJECT

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✅ Backend image built and pushed to GCR" -ForegroundColor Green

# --- STEP 2: DEPLOY BACKEND ---
Write-Host ""
Write-Host "🚀 Step 2/4: Deploying backend to Cloud Run..." -ForegroundColor Yellow
Write-Host "Service: medplat-backend (existing service - will be updated)" -ForegroundColor Gray

gcloud run deploy medplat-backend `
    --image gcr.io/$GCP_PROJECT/medplat-backend:latest `
    --region $REGION `
    --allow-unauthenticated `
    --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" `
    --update-env-vars "GCP_PROJECT=$GCP_PROJECT,TOPICS_COLLECTION=topics2,NODE_ENV=production" `
    --project $GCP_PROJECT

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✅ Backend deployed successfully" -ForegroundColor Green

# --- STEP 3: BUILD FRONTEND ---
Write-Host ""
Write-Host "🔨 Step 3/4: Building frontend..." -ForegroundColor Yellow
cd ..\frontend

$env:VITE_API_BASE = $BACKEND_URL
$env:VITE_BACKEND_URL = $BACKEND_URL

npm ci
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✅ Frontend built" -ForegroundColor Green

# --- STEP 4: BUILD FRONTEND CONTAINER IMAGE AND DEPLOY ---
Write-Host ""
Write-Host "🔨 Step 4/4: Building frontend Docker image..." -ForegroundColor Yellow

gcloud builds submit --tag gcr.io/$GCP_PROJECT/medplat-frontend:latest . --project $GCP_PROJECT

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend image build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✅ Frontend image built and pushed to GCR" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Deploying frontend to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy medplat-frontend `
    --image gcr.io/$GCP_PROJECT/medplat-frontend:latest `
    --region $REGION `
    --allow-unauthenticated `
    --set-env-vars "VITE_API_BASE=$BACKEND_URL" `
    --project $GCP_PROJECT

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green

# --- VERIFICATION ---
cd ..
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Yellow
Write-Host "  ✅ Backend: $BACKEND_URL" -ForegroundColor White
Write-Host "  ✅ Frontend: https://medplat-frontend-139218747785.europe-west1.run.app" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Verify deployment:" -ForegroundColor Yellow
Write-Host "  Backend health: curl $BACKEND_URL/health" -ForegroundColor Gray
Write-Host "  Frontend: https://medplat-frontend-139218747785.europe-west1.run.app" -ForegroundColor Gray
Write-Host ""
