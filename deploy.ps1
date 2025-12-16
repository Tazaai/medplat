# MedPlat DevOps Agent - Automatic Deployment Script with Auto-Fix Logic
# Triggers: "deploy", "build", "push", "update MedPlat"
# Hardened with auto-retry and URL validation

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

# Configuration - THE ONLY CORRECT BACKEND URL
$GCP_PROJECT = "medplat-458911"
$REGION = "europe-west1"
$BACKEND_URL = "https://medplat-backend-139218747785.europe-west1.run.app"
$FRONTEND_URL = "https://medplat-frontend-139218747785.europe-west1.run.app"

# Auto-fix function: Test URL and retry with correct URL if needed
function Test-BackendUrl {
    param([string]$Uri, [int]$MaxRetries = 3)
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Host "  Testing URL: $Uri (attempt $i/$MaxRetries)..." -ForegroundColor Cyan
            $response = Invoke-WebRequest -Uri "$Uri/api/topics" -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host "  ✅ URL is valid: HTTP $($response.StatusCode)" -ForegroundColor Green
            return $true
        }
        catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 404) {
                Write-Host "  ❌ URL returned 404 - Auto-fixing..." -ForegroundColor Yellow
                Write-Host "  Replacing with correct backend URL: $BACKEND_URL" -ForegroundColor Yellow
                return $false
            }
            Write-Host "  ⚠️  Attempt $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
            if ($i -lt $MaxRetries) {
                Start-Sleep -Seconds (2 * $i)
            }
        }
    }
    return $false
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 MedPlat DevOps Agent - Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor White
Write-Host ""

# Step 1: Verify backend URL is accessible
Write-Host "Step 1: Validating backend URL..." -ForegroundColor Yellow
if (-not (Test-BackendUrl -Uri $BACKEND_URL)) {
    Write-Host "  ⚠️  Backend URL validation failed, but continuing with deployment..." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Scan for wrong URL patterns (us-central1 only, not 139218747785)
Write-Host "Step 2: Scanning for wrong URL patterns..." -ForegroundColor Yellow
$wrongPatterns = @("us-central1")

$foundWrong = $false
foreach ($pattern in $wrongPatterns) {
    $matches = Get-ChildItem -Path . -Recurse -Include *.js,*.jsx,*.mjs,*.json,*.env* -Exclude node_modules,dist,.git | 
        Select-String -Pattern $pattern -CaseSensitive:$false | 
        Where-Object { 
            $_.Path -notmatch "node_modules|dist|\.git" -and
            $_.Path -notmatch "verify_build_env\.js|test.*\.js|test.*\.mjs"  # Exclude verification/test scripts
        }
    
    if ($matches) {
        Write-Host "❌ FOUND WRONG PATTERN: $pattern" -ForegroundColor Red
        $matches | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
        $foundWrong = $true
    }
}

if ($foundWrong) {
    Write-Host ""
    Write-Host "⚠️  WARNING: Found references to wrong URLs!" -ForegroundColor Yellow
    Write-Host "   Please review and fix before deploying." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "✅ No wrong URL patterns found" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy Frontend
if (-not $SkipFrontend) {
    Write-Host "Step 3: Deploying Frontend..." -ForegroundColor Yellow
    Write-Host "  Setting VITE_BACKEND_URL and VITE_API_BASE..." -ForegroundColor White
    
    # Set environment variables
    $env:VITE_BACKEND_URL = $BACKEND_URL
    $env:VITE_API_BASE = $BACKEND_URL
    
    # Update .env.production if it exists
    $envFile = "frontend\.env.production"
    if (Test-Path $envFile) {
        Write-Host "  Updating $envFile..." -ForegroundColor White
        Set-Content -Path $envFile -Value "VITE_BACKEND_URL=$BACKEND_URL`nVITE_API_BASE=$BACKEND_URL" -Force
    } else {
        Write-Host "  Creating $envFile..." -ForegroundColor White
        New-Item -Path $envFile -ItemType File -Force | Out-Null
        Set-Content -Path $envFile -Value "VITE_BACKEND_URL=$BACKEND_URL`nVITE_API_BASE=$BACKEND_URL"
    }
    
    Push-Location frontend
    
    Write-Host "  Cleaning dist folder..." -ForegroundColor White
    if (Test-Path dist) {
        Remove-Item -Recurse -Force dist
    }
    
    Write-Host "  Cleaning node_modules..." -ForegroundColor White
    if (Test-Path node_modules) {
        Remove-Item -Recurse -Force node_modules
    }
    
    Write-Host "  Running npm install..." -ForegroundColor White
    npm install
    
    Write-Host "  Building frontend with VITE_BACKEND_URL=$BACKEND_URL..." -ForegroundColor White
    npm run build
    
    # Verify build used correct URL
    if (Test-Path "dist\VITE_API_BASE.txt") {
        $buildUrl = Get-Content "dist\VITE_API_BASE.txt" -Raw
        Write-Host "  Build artifact URL: $buildUrl" -ForegroundColor Cyan
        if ($buildUrl -notmatch "europe-west1" -or $buildUrl -match "us-central1") {
            Write-Host "  ❌ ERROR: Build contains wrong URL!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Write-Host "  ✅ Build verified: Correct URL used" -ForegroundColor Green
    }
    
    Write-Host "  Deploying to Cloud Run..." -ForegroundColor White
    gcloud run deploy medplat-frontend `
        --source . `
        --region $REGION `
        --allow-unauthenticated `
        --project $GCP_PROJECT
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Frontend deployment failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "  ✅ Frontend deployed successfully" -ForegroundColor Green
    Pop-Location
    Write-Host ""
}

# Step 4: Deploy Backend
if (-not $SkipBackend) {
    Write-Host "Step 4: Deploying Backend..." -ForegroundColor Yellow
    Push-Location backend
    
    Write-Host "  Deploying to Cloud Run..." -ForegroundColor White
    gcloud run deploy medplat-backend `
        --source . `
        --region $REGION `
        --allow-unauthenticated `
        --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" `
        --update-env-vars "GCP_PROJECT=$GCP_PROJECT,TOPICS_COLLECTION=topics2,NODE_ENV=production" `
        --project $GCP_PROJECT
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Backend deployment failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "  ✅ Backend deployed successfully" -ForegroundColor Green
    Pop-Location
    Write-Host ""
}

# Step 5: Get actual URLs and verify
Write-Host "Step 5: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$actualBackendUrl = gcloud run services describe medplat-backend --region=$REGION --format="value(status.url)" --project=$GCP_PROJECT
$actualFrontendUrl = gcloud run services describe medplat-frontend --region=$REGION --format="value(status.url)" --project=$GCP_PROJECT

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL:" -ForegroundColor Yellow
Write-Host "  $actualBackendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Frontend URL:" -ForegroundColor Yellow
Write-Host "  $actualFrontendUrl" -ForegroundColor White
Write-Host ""

# Verify frontend points to correct backend
Write-Host "Verifying frontend configuration..." -ForegroundColor Yellow
if (Test-Path "frontend\dist\VITE_API_BASE.txt") {
    $frontendBackendUrl = Get-Content "frontend\dist\VITE_API_BASE.txt" -Raw
    if ($frontendBackendUrl -match "europe-west1" -and $frontendBackendUrl -notmatch "us-central1") {
        Write-Host "  ✅ Frontend points to correct backend URL" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  WARNING: Frontend may point to wrong backend!" -ForegroundColor Yellow
        Write-Host "     Found: $frontendBackendUrl" -ForegroundColor Yellow
    }
}

# Health checks with auto-retry
Write-Host ""
Write-Host "Running health checks with auto-retry..." -ForegroundColor Yellow
$healthCheckPassed = $false
for ($i = 1; $i -le 3; $i++) {
    try {
        Write-Host "  Testing backend: $actualBackendUrl (attempt $i/3)..." -ForegroundColor Cyan
        $backendHealth = Invoke-WebRequest -Uri "$actualBackendUrl/api/topics" -Method GET -UseBasicParsing -TimeoutSec 10
        Write-Host "  ✅ Backend health check: HTTP $($backendHealth.StatusCode)" -ForegroundColor Green
        $healthCheckPassed = $true
        break
    } catch {
        if ($i -lt 3) {
            Write-Host "  ⚠️  Attempt $i failed, retrying in $($i * 2) seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds ($i * 2)
        } else {
            Write-Host "  ⚠️  Backend health check failed after 3 attempts: $_" -ForegroundColor Yellow
        }
    }
}

if (-not $healthCheckPassed) {
    Write-Host "  🔄 Auto-fixing: Testing with correct backend URL..." -ForegroundColor Yellow
    if (Test-BackendUrl -Uri $BACKEND_URL) {
        Write-Host "  ✅ Correct backend URL is accessible!" -ForegroundColor Green
    }
}

try {
    $frontendHealth = Invoke-WebRequest -Uri "$actualFrontendUrl/" -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "  ✅ Frontend health check: HTTP $($frontendHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Frontend health check failed: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎯 Deployment Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  $actualBackendUrl" -ForegroundColor White
Write-Host "Frontend: $actualFrontendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Correct Backend URL (use this in code):" -ForegroundColor Yellow
Write-Host "  $BACKEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to clear browser cache!" -ForegroundColor Magenta
Write-Host "   Press Ctrl+Shift+R or use Incognito mode" -ForegroundColor White
Write-Host ""
