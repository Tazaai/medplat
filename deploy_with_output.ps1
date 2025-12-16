$ErrorActionPreference = "Continue"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 MedPlat Deployment - Container Method" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend: Build Container Image
Write-Host "Step 1: Building Backend Container Image..." -ForegroundColor Yellow
Write-Host "Command: gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest ." -ForegroundColor Gray
cd backend

$buildStart = Get-Date
Write-Host "Build started at: $buildStart" -ForegroundColor Gray

# Run build and capture output
$buildProcess = Start-Process -FilePath "gcloud" -ArgumentList "builds","submit","--tag","gcr.io/medplat-458911/medplat-backend:latest",".","--project","medplat-458911" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "backend_build_output.txt" -RedirectStandardError "backend_build_error.txt"

if ($buildProcess.ExitCode -eq 0) {
    Write-Host "✅ Backend container image built successfully" -ForegroundColor Green
    if (Test-Path "backend_build_output.txt") {
        Write-Host "Build output:" -ForegroundColor Cyan
        Get-Content "backend_build_output.txt" | Select-Object -Last 20
    }
} else {
    Write-Host "❌ Backend build failed (exit code: $($buildProcess.ExitCode))" -ForegroundColor Red
    if (Test-Path "backend_build_error.txt") {
        Write-Host "Build errors:" -ForegroundColor Red
        Get-Content "backend_build_error.txt"
    }
    cd ..
    exit 1
}

# Backend: Deploy from Container Image
Write-Host ""
Write-Host "Step 2: Deploying Backend from Container Image..." -ForegroundColor Yellow
Write-Host "Command: gcloud run deploy medplat-backend --image gcr.io/medplat-458911/medplat-backend:latest ..." -ForegroundColor Gray

$deployProcess = Start-Process -FilePath "gcloud" -ArgumentList "run","deploy","medplat-backend","--image","gcr.io/medplat-458911/medplat-backend:latest","--region","europe-west1","--allow-unauthenticated","--set-secrets","FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest","--update-env-vars","GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production","--project","medplat-458911" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "backend_deploy_output.txt" -RedirectStandardError "backend_deploy_error.txt"

if ($deployProcess.ExitCode -eq 0) {
    Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
    if (Test-Path "backend_deploy_output.txt") {
        Write-Host "Deployment output:" -ForegroundColor Cyan
        Get-Content "backend_deploy_output.txt" | Select-Object -Last 20
    }
} else {
    Write-Host "❌ Backend deployment failed (exit code: $($deployProcess.ExitCode))" -ForegroundColor Red
    if (Test-Path "backend_deploy_error.txt") {
        Write-Host "Deployment errors:" -ForegroundColor Red
        Get-Content "backend_deploy_error.txt"
    }
    cd ..
    exit 1
}

cd ..
Write-Host ""

# Frontend: Build
Write-Host "Step 3: Building Frontend..." -ForegroundColor Yellow
cd frontend
$env:VITE_BACKEND_URL = "https://medplat-backend-139218747785.europe-west1.run.app"
$env:VITE_API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app"

Write-Host "Running: npm run build" -ForegroundColor Gray
npm run build 2>&1 | Tee-Object -FilePath "frontend_build_output.txt"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    cd ..
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Frontend: Build Container Image
Write-Host ""
Write-Host "Step 4: Building Frontend Container Image..." -ForegroundColor Yellow
Write-Host "Command: gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest ." -ForegroundColor Gray

$frontendBuildProcess = Start-Process -FilePath "gcloud" -ArgumentList "builds","submit","--tag","gcr.io/medplat-458911/medplat-frontend:latest",".","--project","medplat-458911" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "frontend_build_output.txt" -RedirectStandardError "frontend_build_error.txt"

if ($frontendBuildProcess.ExitCode -eq 0) {
    Write-Host "✅ Frontend container image built successfully" -ForegroundColor Green
    if (Test-Path "frontend_build_output.txt") {
        Write-Host "Build output:" -ForegroundColor Cyan
        Get-Content "frontend_build_output.txt" | Select-Object -Last 20
    }
} else {
    Write-Host "❌ Frontend build failed (exit code: $($frontendBuildProcess.ExitCode))" -ForegroundColor Red
    if (Test-Path "frontend_build_error.txt") {
        Write-Host "Build errors:" -ForegroundColor Red
        Get-Content "frontend_build_error.txt"
    }
    cd ..
    exit 1
}

# Frontend: Deploy from Container Image
Write-Host ""
Write-Host "Step 5: Deploying Frontend from Container Image..." -ForegroundColor Yellow
Write-Host "Command: gcloud run deploy medplat-frontend --image gcr.io/medplat-458911/medplat-frontend:latest ..." -ForegroundColor Gray

$frontendDeployProcess = Start-Process -FilePath "gcloud" -ArgumentList "run","deploy","medplat-frontend","--image","gcr.io/medplat-458911/medplat-frontend:latest","--region","europe-west1","--allow-unauthenticated","--project","medplat-458911" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "frontend_deploy_output.txt" -RedirectStandardError "frontend_deploy_error.txt"

if ($frontendDeployProcess.ExitCode -eq 0) {
    Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green
    if (Test-Path "frontend_deploy_output.txt") {
        Write-Host "Deployment output:" -ForegroundColor Cyan
        Get-Content "frontend_deploy_output.txt" | Select-Object -Last 20
    }
} else {
    Write-Host "❌ Frontend deployment failed (exit code: $($frontendDeployProcess.ExitCode))" -ForegroundColor Red
    if (Test-Path "frontend_deploy_error.txt") {
        Write-Host "Deployment errors:" -ForegroundColor Red
        Get-Content "frontend_deploy_error.txt"
    }
    cd ..
    exit 1
}

cd ..
Write-Host ""

# Get URLs
Write-Host "Step 6: Getting Service URLs..." -ForegroundColor Yellow
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
Write-Host "Method Used: Container-based deployment (gcloud builds submit + gcloud run deploy --image)" -ForegroundColor Gray
Write-Host ""

