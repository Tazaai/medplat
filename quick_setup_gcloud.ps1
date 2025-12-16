# Quick gcloud Setup - Add to PATH if found
$ErrorActionPreference = "Continue"

# Common gcloud locations
$locations = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin",
    "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin"
)

foreach ($loc in $locations) {
    $gcloudExe = Join-Path $loc "gcloud.cmd"
    if (Test-Path $gcloudExe) {
        Write-Host "Found gcloud at: $gcloudExe" -ForegroundColor Green
        
        # Add to PATH for this session
        if ($env:PATH -notlike "*$loc*") {
            $env:PATH = "$loc;$env:PATH"
            Write-Host "Added to PATH: $loc" -ForegroundColor Green
        }
        
        # Test it
        $version = & $gcloudExe --version 2>&1 | Select-Object -First 1
        Write-Host "Version: $version" -ForegroundColor Cyan
        
        # Set project
        & $gcloudExe config set project medplat-458911 2>&1 | Out-Null
        
        Write-Host "✅ gcloud is ready!" -ForegroundColor Green
        exit 0
    }
}

Write-Host "❌ gcloud not found. Please install Google Cloud SDK:" -ForegroundColor Red
Write-Host "https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
