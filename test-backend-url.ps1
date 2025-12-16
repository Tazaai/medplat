# MedPlat Backend URL Health Check with Auto-Fix
# Tests the backend URL and automatically retries with correct URL if needed

$ErrorActionPreference = "Continue"

# THE ONLY CORRECT BACKEND URL
$CORRECT_BACKEND_URL = "https://medplat-backend-139218747785.europe-west1.run.app"

# Test URL function with auto-retry
function Test-BackendUrl {
    param(
        [string]$Uri,
        [int]$MaxRetries = 3
    )
    
    Write-Host "Testing backend URL: $Uri" -ForegroundColor Cyan
    Write-Host ""
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Host "Attempt $i/$MaxRetries: Testing $Uri/api/topics..." -ForegroundColor Yellow
            $response = Invoke-WebRequest -Uri "$Uri/api/topics" -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            
            Write-Host "✅ SUCCESS: HTTP $($response.StatusCode)" -ForegroundColor Green
            if ($response.Content.Length -lt 500) {
                Write-Host "Response preview:" -ForegroundColor Cyan
                Write-Host $response.Content -ForegroundColor White
            } else {
                Write-Host "Response length: $($response.Content.Length) bytes" -ForegroundColor Cyan
            }
            return $true
        }
        catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "❌ Failed: HTTP $statusCode - $($_.Exception.Message)" -ForegroundColor Red
            
            if ($statusCode -eq 404) {
                Write-Host ""
                Write-Host "🔄 AUTO-FIX: URL returned 404" -ForegroundColor Yellow
                Write-Host "   Replacing with correct backend URL: $CORRECT_BACKEND_URL" -ForegroundColor Yellow
                Write-Host ""
                return Test-BackendUrl -Uri $CORRECT_BACKEND_URL -MaxRetries $MaxRetries
            }
            
            if ($i -lt $MaxRetries) {
                $sleepTime = $i * 2
                Write-Host "   Retrying in $sleepTime seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds $sleepTime
            }
        }
    }
    
    Write-Host ""
    Write-Host "❌ All attempts failed. Trying correct backend URL..." -ForegroundColor Red
    if ($Uri -ne $CORRECT_BACKEND_URL) {
        return Test-BackendUrl -Uri $CORRECT_BACKEND_URL -MaxRetries $MaxRetries
    }
    
    return $false
}

# Main execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 MedPlat Backend URL Health Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# If URI is provided as argument, use it; otherwise use correct URL
$testUri = $args[0]
if ([string]::IsNullOrEmpty($testUri)) {
    $testUri = $CORRECT_BACKEND_URL
}

Write-Host "Correct Backend URL: $CORRECT_BACKEND_URL" -ForegroundColor White
Write-Host "Testing URL: $testUri" -ForegroundColor White
Write-Host ""

$result = Test-BackendUrl -Uri $testUri

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($result) {
    Write-Host "✅ Health Check PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Health Check FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "  1. Backend is deployed: $CORRECT_BACKEND_URL" -ForegroundColor White
    Write-Host "  2. Service is running and accessible" -ForegroundColor White
    Write-Host "  3. Network connectivity is available" -ForegroundColor White
    exit 1
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

