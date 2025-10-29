# push-and-pr.ps1 — Automated push and PR creation for MedPlat
# Usage: .\push-and-pr.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 MedPlat Automated Push & PR Creation" -ForegroundColor Cyan
Write-Host ""

# Check if we're on the right branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "ci/review-report") {
    Write-Host "❌ Expected branch 'ci/review-report', currently on '$currentBranch'" -ForegroundColor Red
    exit 1
}

# Check if there are commits to push
$unpushed = git log origin/main..HEAD --oneline 2>$null
if (-not $unpushed) {
    Write-Host "⚠️ No new commits to push" -ForegroundColor Yellow
}

# Try GitHub CLI first (preferred method)
Write-Host "🔍 Checking for GitHub CLI..." -ForegroundColor Yellow
$ghExists = Get-Command gh -ErrorAction SilentlyContinue
if ($ghExists) {
    Write-Host "✅ GitHub CLI found" -ForegroundColor Green
    
    # Check auth status
    Write-Host "🔐 Checking GitHub CLI authentication..." -ForegroundColor Yellow
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Not authenticated with GitHub CLI" -ForegroundColor Yellow
        Write-Host "🔑 Starting GitHub CLI login..." -ForegroundColor Cyan
        gh auth login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ GitHub CLI authentication failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Already authenticated with GitHub CLI" -ForegroundColor Green
    }
    
    # Push branch
    Write-Host ""
    Write-Host "📤 Pushing branch to origin..." -ForegroundColor Cyan
    git push -u origin ci/review-report
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Push failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Branch pushed successfully" -ForegroundColor Green
    
    # Create PR
    Write-Host ""
    Write-Host "📝 Creating pull request..." -ForegroundColor Cyan
    $prBody = @"
## Changes

- ✅ Adds `.github/workflows/review.yml` to automate review report on PRs
- ✅ Updates `.github/copilot-instructions.md` based on PROJECT_GUIDE.md architecture
- ✅ Posts agent.md as PR comment for fast feedback
- ✅ Uploads agent.md as workflow artifact

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
    
    gh pr create `
        --title "ci: add automated review report workflow" `
        --body $prBody `
        --base main `
        --head ci/review-report
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ PR creation failed" -ForegroundColor Red
        Write-Host "💡 You can create it manually at: https://github.com/Tazaai/medplat/compare/main...ci/review-report" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "🎉 Success! PR created and workflow will trigger automatically" -ForegroundColor Green
    
} else {
    Write-Host "❌ GitHub CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Install GitHub CLI: winget install --id GitHub.cli" -ForegroundColor White
    Write-Host "   OR download from: https://cli.github.com/" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Authenticate and retry:" -ForegroundColor White
    Write-Host "   gh auth login" -ForegroundColor Cyan
    Write-Host "   .\push-and-pr.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Or push manually via VS Code Source Control" -ForegroundColor White
    Write-Host "   Then create PR at: https://github.com/Tazaai/medplat/compare/main...ci/review-report" -ForegroundColor Cyan
    exit 1
}
