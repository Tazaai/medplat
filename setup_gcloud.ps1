# Setup Google Cloud SDK for Cursor Environment
# This script will detect, install, or configure gcloud CLI

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 Google Cloud SDK Setup for Cursor" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Common installation paths
$possiblePaths = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\google-cloud-sdk\bin\gcloud.cmd"
)

Write-Host "Step 1: Checking if gcloud is installed..." -ForegroundColor Yellow
$gcloudPath = $null

# Check if gcloud is in PATH
try {
    $gcloudCheck = Get-Command gcloud -ErrorAction Stop
    $gcloudPath = $gcloudCheck.Source
    Write-Host "✅ Found gcloud in PATH: $gcloudPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️  gcloud not found in PATH, checking common locations..." -ForegroundColor Yellow
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $gcloudPath = $path
            Write-Host "✅ Found gcloud at: $gcloudPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $gcloudPath) {
    Write-Host ""
    Write-Host "❌ gcloud not found. You need to install Google Cloud SDK." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation options:" -ForegroundColor Yellow
    Write-Host "  1. Download installer: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "  2. Or use PowerShell (run as Administrator):" -ForegroundColor Cyan
    Write-Host ""
    Write-Host '     (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:TEMP\GoogleCloudSDKInstaller.exe")' -ForegroundColor Gray
    Write-Host '     Start-Process -FilePath "$env:TEMP\GoogleCloudSDKInstaller.exe" -Wait' -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installation, restart Cursor and run this script again." -ForegroundColor Yellow
    exit 1
}

# Add to PATH for current session if not already there
$gcloudDir = Split-Path $gcloudPath -Parent
if ($env:PATH -notlike "*$($gcloudDir)*") {
    Write-Host ""
    Write-Host "Step 2: Adding gcloud to PATH for this session..." -ForegroundColor Yellow
    $env:PATH = "$gcloudDir;$env:PATH"
    Write-Host "✅ Added to PATH: $gcloudDir" -ForegroundColor Green
}

# Verify gcloud works
Write-Host ""
Write-Host "Step 3: Verifying gcloud works..." -ForegroundColor Yellow
try {
    $version = & gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "✅ gcloud is working: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ gcloud command failed: $_" -ForegroundColor Red
    exit 1
}

# Check authentication
Write-Host ""
Write-Host "Step 4: Checking authentication..." -ForegroundColor Yellow
try {
    $authList = & gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
    if ($authList) {
        Write-Host "✅ Authenticated as: $authList" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not authenticated. You need to login." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Run this command to authenticate:" -ForegroundColor Cyan
        Write-Host "  gcloud auth login" -ForegroundColor White
        Write-Host ""
        $login = Read-Host "Do you want to login now? (y/N)"
        if ($login -eq 'y' -or $login -eq 'Y') {
            Write-Host "Opening browser for authentication..." -ForegroundColor Yellow
            & gcloud auth login
        }
    }
} catch {
    Write-Host "⚠️  Could not check authentication: $_" -ForegroundColor Yellow
}

# Set default project
Write-Host ""
Write-Host "Step 5: Setting default project..." -ForegroundColor Yellow
$currentProject = & gcloud config get-value project 2>&1
if ($currentProject -eq "medplat-458911") {
    Write-Host "✅ Default project already set: medplat-458911" -ForegroundColor Green
} else {
    Write-Host "Setting default project to medplat-458911..." -ForegroundColor Yellow
    & gcloud config set project medplat-458911 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Default project set: medplat-458911" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not set default project. You may need to authenticate first." -ForegroundColor Yellow
    }
}

# Create a script to add gcloud to PATH permanently
Write-Host ""
Write-Host "Step 6: Creating permanent PATH configuration..." -ForegroundColor Yellow
$profileScript = @"
# Add Google Cloud SDK to PATH
`$gcloudPath = "$gcloudDir"
if (`$env:PATH -notlike "*`$gcloudPath*") {
    `$env:PATH = "`$gcloudPath;`$env:PATH"
}
"@

$profilePath = $PROFILE.CurrentUserAllHosts
$profileDir = Split-Path $profilePath -Parent

if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

if (-not (Test-Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

$existingContent = Get-Content $profilePath -ErrorAction SilentlyContinue -Raw
if ($existingContent -notlike '*gcloud*') {
    Add-Content -Path $profilePath -Value "`n# Google Cloud SDK`n$profileScript"
    Write-Host "✅ Added gcloud to PowerShell profile: $profilePath" -ForegroundColor Green
    Write-Host "   (This will persist across sessions)" -ForegroundColor Gray
} else {
    Write-Host "✅ gcloud already in PowerShell profile" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now use gcloud commands in Cursor!" -ForegroundColor Green
Write-Host ""
Write-Host "Test it:" -ForegroundColor Yellow
Write-Host "  gcloud --version" -ForegroundColor White
Write-Host "  gcloud config get-value project" -ForegroundColor White
Write-Host ""
Write-Host "Note: You may need to restart Cursor for PATH changes to take full effect." -ForegroundColor Gray
Write-Host ""
