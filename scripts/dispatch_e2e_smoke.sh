#!/usr/bin/env bash
set -euo pipefail
# Dispatch the e2e-smoke GitHub Actions workflow using gh CLI
# Usage: GH_PAT=... ./scripts/dispatch_e2e_smoke.sh [branch]

BRANCH=${1:-main}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/ and retry." >&2
  exit 2
fi

echo "Dispatching e2e-smoke workflow on branch '$BRANCH'..."
gh workflow run e2e-smoke.yml --ref "$BRANCH"
echo "Workflow dispatched. Use 'gh run list' and 'gh run watch <run-id>' to follow progress." 
