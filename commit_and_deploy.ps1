$ErrorActionPreference = "Continue"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Commit and Deploy to GitHub Actions" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check current branch
Write-Host "Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor White

if ($currentBranch -ne "main") {
    Write-Host "⚠️  Not on main branch. Switching to main..." -ForegroundColor Yellow
    git checkout main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to switch to main branch" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 1: Checking for changes..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "Step 2: Adding all changes..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
$commitMessage = "Deploy backend and frontend - trigger GitHub Actions workflow"
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "⚠️  No changes to commit (or commit failed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Pushing to main branch..." -ForegroundColor Yellow
Write-Host "This will trigger the GitHub Actions deployment workflow" -ForegroundColor Gray
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ PUSHED TO MAIN - DEPLOYMENT TRIGGERED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitor deployment progress:" -ForegroundColor Yellow
    Write-Host "  https://github.com/YOUR_REPO/actions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cloud Build:" -ForegroundColor Yellow
    Write-Host "  https://console.cloud.google.com/cloud-build/builds?project=medplat-458911" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ Failed to push to main" -ForegroundColor Red
    exit 1
}
