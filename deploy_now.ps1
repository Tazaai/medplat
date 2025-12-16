$ErrorActionPreference = "Continue"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 MedPlat Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend Deployment
Write-Host "Step 1: Deploying Backend..." -ForegroundColor Yellow
cd backend
$backendResult = gcloud run deploy medplat-backend `
    --source . `
    --region europe-west1 `
    --allow-unauthenticated `
    --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" `
    --update-env-vars "GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production" `
    --project medplat-458911 2>&1

Write-Host $backendResult
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host ""

# Frontend Deployment
Write-Host "Step 2: Building Frontend..." -ForegroundColor Yellow
cd frontend
$env:VITE_BACKEND_URL = "https://medplat-backend-139218747785.europe-west1.run.app"
$env:VITE_API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "Step 3: Deploying Frontend..." -ForegroundColor Yellow
$frontendResult = gcloud run deploy medplat-frontend `
    --source . `
    --region europe-west1 `
    --allow-unauthenticated `
    --project medplat-458911 2>&1

Write-Host $frontendResult
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
    cd ..
    exit 1
}
cd ..
Write-Host ""

# Get URLs
Write-Host "Step 4: Getting Service URLs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$backendUrl = gcloud run services describe medplat-backend --region=europe-west1 --format="value(status.url)" --project=medplat-458911
$frontendUrl = gcloud run services describe medplat-frontend --region=europe-west1 --format="value(status.url)" --project=medplat-458911

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL:" -ForegroundColor Yellow
Write-Host "  $backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Frontend URL:" -ForegroundColor Yellow
Write-Host "  $frontendUrl" -ForegroundColor White
Write-Host ""

