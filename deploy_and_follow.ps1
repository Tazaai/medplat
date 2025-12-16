$ErrorActionPreference = "Continue"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 MedPlat Deployment - Following Process" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend: Build Container Image
Write-Host "Step 1: Building Backend Container Image..." -ForegroundColor Yellow
Write-Host "This will show build progress..." -ForegroundColor Gray
cd backend

# Submit build and get build ID
Write-Host "Submitting build to Cloud Build..." -ForegroundColor Cyan
$buildOutput = gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest . --project medplat-458911 2>&1 | Out-String

# Extract build ID from output
$buildId = $null
if ($buildOutput -match 'ID:\s*([a-f0-9-]+)') {
    $buildId = $matches[1]
    Write-Host "Build ID: $buildId" -ForegroundColor Green
} elseif ($buildOutput -match 'BUILD ID:\s*([a-f0-9-]+)') {
    $buildId = $matches[1]
    Write-Host "Build ID: $buildId" -ForegroundColor Green
}

Write-Host ""
Write-Host "Build output:" -ForegroundColor Cyan
Write-Host $buildOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend container image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host ""
Write-Host "Step 2: Deploying Backend from Container Image..." -ForegroundColor Yellow
Write-Host "Service: medplat-backend (existing service - will be updated)" -ForegroundColor Gray
Write-Host ""

# Deploy
$deployOutput = gcloud run deploy medplat-backend `
    --image gcr.io/medplat-458911/medplat-backend:latest `
    --region europe-west1 `
    --allow-unauthenticated `
    --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" `
    --update-env-vars "GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production" `
    --project medplat-458911 2>&1 | Out-String

Write-Host "Deployment output:" -ForegroundColor Cyan
Write-Host $deployOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
    
    # Extract revision and URL from output
    if ($deployOutput -match 'revision \[([^\]]+)\]') {
        $revision = $matches[1]
        Write-Host "New revision: $revision" -ForegroundColor Green
    }
    if ($deployOutput -match 'Service URL:\s*([^\s]+)') {
        $url = $matches[1]
        Write-Host "Service URL: $url" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    cd ..
    exit 1
}

cd ..
Write-Host ""

# Get final service status
Write-Host "Step 3: Verifying Deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$backendUrl = gcloud run services describe medplat-backend --region=europe-west1 --format="value(status.url)" --project=medplat-458911 2>&1
$backendRevision = gcloud run services describe medplat-backend --region=europe-west1 --format="value(status.latestReadyRevisionName)" --project=medplat-458911 2>&1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ BACKEND DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL:" -ForegroundColor Yellow
Write-Host "  $backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Latest Revision:" -ForegroundColor Yellow
Write-Host "  $backendRevision" -ForegroundColor White
Write-Host ""
Write-Host "You can view logs in Cloud Console:" -ForegroundColor Gray
Write-Host "  https://console.cloud.google.com/run/detail/europe-west1/medplat-backend/logs?project=medplat-458911" -ForegroundColor Cyan
Write-Host ""
