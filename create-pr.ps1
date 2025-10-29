# create-pr.ps1 — Create GitHub PR via REST API
# Usage: .\create-pr.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Creating GitHub PR via API..." -ForegroundColor Cyan
Write-Host ""

# PR details
$owner = "Tazaai"
$repo = "medplat"
$head = "ci/review-report"
$base = "main"
$title = "ci: add automated review report workflow"
$body = @"
## Changes

- ✅ Adds ``.github/workflows/review.yml`` to automate review report on PRs
- ✅ Updates ``.github/copilot-instructions.md`` based on PROJECT_GUIDE.md architecture
- ✅ Posts agent.md as PR comment for fast feedback
- ✅ Uploads agent.md as workflow artifact
- ✅ Adds ``push-and-pr.ps1`` automation script for future PRs

## Testing

The workflow will run automatically on this PR. Check:
1. Actions tab for workflow execution
2. PR comments for agent.md output
3. Artifacts for downloadable agent.md

## Review Checklist

- [ ] Workflow runs successfully
- [ ] agent.md is posted as comment
- [ ] Artifact is uploaded
- [ ] Content matches local review_report.sh output
"@

# Check for GitHub token
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "⚠️ GITHUB_TOKEN not found in environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create a GitHub Personal Access Token:" -ForegroundColor White
    Write-Host "1. Go to: https://github.com/settings/tokens/new" -ForegroundColor Cyan
    Write-Host "2. Set description: 'MedPlat PR Creation'" -ForegroundColor White
    Write-Host "3. Select scopes: 'repo' (full control)" -ForegroundColor White
    Write-Host "4. Click 'Generate token' and copy it" -ForegroundColor White
    Write-Host ""
    $token = Read-Host "Paste your GitHub token here"
    if (-not $token) {
        Write-Host "❌ No token provided" -ForegroundColor Red
        exit 1
    }
}

# Create PR payload
$prData = @{
    title = $title
    body = $body
    head = $head
    base = $base
} | ConvertTo-Json

# GitHub API request
$uri = "https://api.github.com/repos/$owner/$repo/pulls"
$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

try {
    Write-Host "📡 Sending request to GitHub API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $prData -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Pull Request created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 PR Details:" -ForegroundColor Cyan
    Write-Host "   Title: $($response.title)" -ForegroundColor White
    Write-Host "   Number: #$($response.number)" -ForegroundColor White
    Write-Host "   URL: $($response.html_url)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Check Actions tab for workflow execution" -ForegroundColor White
    Write-Host "   2. Wait for agent.md comment on the PR" -ForegroundColor White
    Write-Host "   3. Review and merge when ready" -ForegroundColor White
    Write-Host ""
    
    # Open PR in browser
    Start-Process $response.html_url
    
} catch {
    Write-Host ""
    Write-Host "❌ Failed to create PR" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "💡 Fallback: Create PR manually at:" -ForegroundColor Yellow
    Write-Host "   https://github.com/$owner/$repo/compare/$base...$head" -ForegroundColor Cyan
    exit 1
}
